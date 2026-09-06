const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ZodError,
} = require('zod');

const {
  buildGoogleTimezoneUrl,
  lookupTimezoneFromCoordinates,
  parseGoogleTimezoneResponse,
  parseTimezoneLookupRequest,
  readTimezoneApiKey,
} = require('../timezone-lookup');

test(
  'parseTimezoneLookupRequest accepts coordinates and optional timestamp',
  () => {
    assert.deepEqual(
      parseTimezoneLookupRequest({
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: 1_700_000_000,
      }),
      {
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: 1_700_000_000,
      },
    );
  },
);

test(
  'parseTimezoneLookupRequest rejects invalid coordinates',
  () => {
    assert.throws(
      () =>
        parseTimezoneLookupRequest({
          latitude: 91,
          longitude: 139,
        }),
      ZodError,
    );
  },
);

test(
  'parseGoogleTimezoneResponse accepts only OK + valid IANA',
  () => {
    assert.deepEqual(
      parseGoogleTimezoneResponse({
        status: 'OK',
        timeZoneId: 'Asia/Tokyo',
      }),
      { timeZoneId: 'Asia/Tokyo' },
    );

    assert.equal(
      parseGoogleTimezoneResponse({
        status: 'ZERO_RESULTS',
        timeZoneId: 'Asia/Tokyo',
      }),
      null,
    );

    assert.equal(
      parseGoogleTimezoneResponse({
        status: 'OK',
        timeZoneId: 'Not A Zone',
      }),
      null,
    );

    assert.equal(
      parseGoogleTimezoneResponse(null),
      null,
    );
  },
);

test(
  'readTimezoneApiKey fails closed when missing',
  () => {
    assert.equal(
      readTimezoneApiKey({}),
      null,
    );
    assert.equal(
      readTimezoneApiKey({
        GOOGLE_TIMEZONE_API_KEY: '  ',
      }),
      null,
    );
    assert.equal(
      readTimezoneApiKey({
        GOOGLE_TIMEZONE_API_KEY: 'test-key',
      }),
      'test-key',
    );
  },
);

test(
  'buildGoogleTimezoneUrl embeds location and timestamp without leaking structure',
  () => {
    const url = buildGoogleTimezoneUrl({
      latitude: 35.67,
      longitude: 139.65,
      timestamp: 100,
      apiKey: 'secret',
    });

    assert.match(
      url,
      /location=35\.67%2C139\.65/,
    );
    assert.match(url, /timestamp=100/);
    assert.match(url, /key=secret/);
  },
);

test(
  'lookupTimezoneFromCoordinates returns provider timezone on OK',
  async () => {
    const result =
      await lookupTimezoneFromCoordinates({
        latitude: 35.6762,
        longitude: 139.6503,
        apiKey: 'test-key',
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({
            status: 'OK',
            timeZoneId: 'Asia/Tokyo',
          }),
        }),
      });

    assert.deepEqual(result, {
      timezone: 'Asia/Tokyo',
      source: 'provider',
    });
  },
);

test(
  'lookupTimezoneFromCoordinates fails closed without a key',
  async () => {
    await assert.rejects(
      () =>
        lookupTimezoneFromCoordinates({
          latitude: 35,
          longitude: 139,
          env: {},
        }),
      (error) =>
        error.code ===
        'timezone_api_key_missing',
    );
  },
);

test(
  'lookupTimezoneFromCoordinates fails closed on non-OK Google status',
  async () => {
    await assert.rejects(
      () =>
        lookupTimezoneFromCoordinates({
          latitude: 35,
          longitude: 139,
          apiKey: 'test-key',
          fetchImpl: async () => ({
            ok: true,
            json: async () => ({
              status: 'REQUEST_DENIED',
            }),
          }),
        }),
      (error) =>
        error.code === 'timezone_lookup_failed',
    );
  },
);

test(
  'lookupTimezoneFromCoordinates fails closed when fetch throws',
  async () => {
    await assert.rejects(
      () =>
        lookupTimezoneFromCoordinates({
          latitude: 35,
          longitude: 139,
          apiKey: 'test-key',
          fetchImpl: async () => {
            throw new Error('network');
          },
        }),
      (error) =>
        error.code ===
        'timezone_provider_unavailable',
    );
  },
);
