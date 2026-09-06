const assert = require('node:assert/strict');
const test = require('node:test');

const {
  enrichSelectionWithProviderTimezone,
  lookupTimezoneFromCoordinates,
  parseTimezoneLookupResponse,
} = require(
  '../.test-build/src/services/timezone-lookup.js',
);

test(
  'parseTimezoneLookupResponse accepts provider IANA only',
  () => {
    assert.deepEqual(
      parseTimezoneLookupResponse({
        ok: true,
        timezone: 'Asia/Tokyo',
        source: 'provider',
      }),
      {
        timezone: 'Asia/Tokyo',
        source: 'provider',
      },
    );

    assert.equal(
      parseTimezoneLookupResponse({
        ok: false,
        timezone: 'Asia/Tokyo',
        source: 'provider',
      }),
      null,
    );

    assert.equal(
      parseTimezoneLookupResponse({
        ok: true,
        timezone: 'Not A Zone',
        source: 'provider',
      }),
      null,
    );

    assert.equal(
      parseTimezoneLookupResponse({
        ok: true,
        timezone: 'Asia/Tokyo',
        source: 'traveler',
      }),
      null,
    );
  },
);

test(
  'lookupTimezoneFromCoordinates fails closed on network or bad payload',
  async () => {
    assert.equal(
      await lookupTimezoneFromCoordinates(
        35.6762,
        139.6503,
        {
          baseUrl: 'http://127.0.0.1:8789',
          fetchImpl: async () => {
            throw new Error('offline');
          },
        },
      ),
      null,
    );

    assert.equal(
      await lookupTimezoneFromCoordinates(
        35.6762,
        139.6503,
        {
          baseUrl: 'http://127.0.0.1:8789',
          fetchImpl: async () => ({
            ok: true,
            json: async () => ({
              ok: true,
              timezone: 'bogus',
              source: 'provider',
            }),
          }),
        },
      ),
      null,
    );

    assert.deepEqual(
      await lookupTimezoneFromCoordinates(
        35.6762,
        139.6503,
        {
          baseUrl: 'http://127.0.0.1:8789',
          fetchImpl: async () => ({
            ok: true,
            json: async () => ({
              ok: true,
              timezone: 'Asia/Tokyo',
              source: 'provider',
            }),
          }),
        },
      ),
      {
        timezone: 'Asia/Tokyo',
        source: 'provider',
      },
    );
  },
);

test(
  'enrichSelectionWithProviderTimezone keeps existing timezone and enriches when missing',
  async () => {
    const withZone = {
      name: 'Tokyo, Japan',
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
      timezoneSource: 'traveler',
    };

    assert.deepEqual(
      await enrichSelectionWithProviderTimezone(
        withZone,
        {
          fetchImpl: async () => {
            throw new Error('should not call');
          },
        },
      ),
      withZone,
    );

    const withoutZone = {
      name: 'Tokyo, Japan',
      latitude: 35.6762,
      longitude: 139.6503,
    };

    assert.deepEqual(
      await enrichSelectionWithProviderTimezone(
        withoutZone,
        {
          baseUrl: 'http://127.0.0.1:8789',
          fetchImpl: async () => ({
            ok: true,
            json: async () => ({
              ok: true,
              timezone: 'Asia/Tokyo',
              source: 'provider',
            }),
          }),
        },
      ),
      {
        ...withoutZone,
        timezone: 'Asia/Tokyo',
        timezoneSource: 'provider',
      },
    );

    assert.deepEqual(
      await enrichSelectionWithProviderTimezone(
        withoutZone,
        {
          baseUrl: 'http://127.0.0.1:8789',
          fetchImpl: async () => {
            throw new Error('offline');
          },
        },
      ),
      withoutZone,
    );
  },
);
