const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  normalizeDiscoverBrief,
} = require(
  '../.test-build/src/services/discover-brief.js',
);

const {
  resolveDiscoverPersonalization,
} = require(
  '../.test-build/src/services/discover-personalization.js',
);

const {
  buildDiscoverTripPrefill,
  parseDiscoverTripRouteParams,
  serializeDiscoverTripPrefill,
} = require(
  '../.test-build/src/services/discover-trip-handoff.js',
);

function makeDestination() {
  return {
    name: 'Lisbon, Portugal',
    countryCode: 'PT',
    latitude: 38.7223,
    longitude: -9.1393,
    timezone: 'Europe/Lisbon',
    currencyCode: 'EUR',
  };
}

function makeBrief(overrides = {}) {
  return {
    mode: 'find_destination',
    interests: [],
    ...overrides,
  };
}

function makeTravelDNA(overrides = {}) {
  return {
    id: 'travel-dna',
    pace: 'balanced',
    interests: [
      'food',
      'culture',
    ],
    travelStyle: 'local',
    budgetStyle: 'comfortable',
    dailyRhythm: 'morning',
    typicalParty: 'couple',
    ...overrides,
  };
}

test(
  'discover brief normalizes explicit budget and removes duplicate interests',
  () => {
    const brief =
      normalizeDiscoverBrief(
        makeBrief({
          budget: {
            maximumAmount: 1500,
            currency: ' eur ',
          },
          interests: [
            'food',
            'culture',
            'food',
          ],
        }),
      );

    assert.deepEqual(
      brief.budget,
      {
        maximumAmount: 1500,
        currency: 'EUR',
      },
    );

    assert.deepEqual(
      brief.interests,
      [
        'food',
        'culture',
      ],
    );
  },
);

test(
  'discover brief validates exact calendar dates using canonical time truth',
  () => {
    assert.throws(
      () =>
        normalizeDiscoverBrief(
          makeBrief({
            timing: {
              kind: 'exact',
              startDate: '2026-10-10',
              endDate: '2026-10-09',
            },
          }),
        ),
      /start date cannot be after/i,
    );

    assert.throws(
      () =>
        normalizeDiscoverBrief(
          makeBrief({
            timing: {
              kind: 'exact',
              startDate: '2026-02-30',
              endDate: '2026-03-03',
            },
          }),
        ),
      /valid calendar dates/i,
    );
  },
);

test(
  'discover flexible timing stays flexible and rejects invalid constraints',
  () => {
    const brief =
      normalizeDiscoverBrief(
        makeBrief({
          timing: {
            kind: 'flexible',
            earliestStartDate:
              '2026-09-01',
            latestEndDate:
              '2026-10-31',
            tripLengthDays: 5,
          },
        }),
      );

    assert.deepEqual(
      brief.timing,
      {
        kind: 'flexible',
        earliestStartDate:
          '2026-09-01',
        latestEndDate:
          '2026-10-31',
        tripLengthDays: 5,
      },
    );

    assert.throws(
      () =>
        normalizeDiscoverBrief(
          makeBrief({
            timing: {
              kind: 'flexible',
              tripLengthDays: 0,
            },
          }),
        ),
      /positive whole number/i,
    );
  },
);

test(
  'best time discovery requires a grounded destination',
  () => {
    assert.throws(
      () =>
        normalizeDiscoverBrief(
          makeBrief({
            mode: 'best_time',
          }),
        ),
      /requires a destination/i,
    );

    const brief =
      normalizeDiscoverBrief(
        makeBrief({
          mode: 'best_time',
          destination:
            makeDestination(),
        }),
      );

    assert.equal(
      brief.destination.name,
      'Lisbon, Portugal',
    );
  },
);

test(
  'trip-specific Discover preferences override Travel DNA',
  () => {
    const personalization =
      resolveDiscoverPersonalization(
        makeBrief({
          pace: 'slow',
          interests: [
            'nature',
            'wellness',
          ],
          party: 'friends',
        }),
        makeTravelDNA(),
      );

    assert.deepEqual(
      personalization.pace,
      {
        value: 'slow',
        source: 'discover_brief',
      },
    );

    assert.deepEqual(
      personalization.interests,
      {
        values: [
          'nature',
          'wellness',
        ],
        source: 'discover_brief',
      },
    );

    assert.deepEqual(
      personalization.party,
      {
        value: 'friends',
        source: 'discover_brief',
      },
    );
  },
);

test(
  'Discover falls back only to explicit Travel DNA when trip-specific values are absent',
  () => {
    const personalization =
      resolveDiscoverPersonalization(
        makeBrief(),
        makeTravelDNA(),
      );

    assert.deepEqual(
      personalization.pace,
      {
        value: 'balanced',
        source: 'travel_dna',
      },
    );

    assert.deepEqual(
      personalization.interests,
      {
        values: [
          'food',
          'culture',
        ],
        source: 'travel_dna',
      },
    );

    assert.deepEqual(
      personalization.party,
      {
        value: 'couple',
        source: 'travel_dna',
      },
    );

    assert.deepEqual(
      personalization.travelStyle,
      {
        value: 'local',
        source: 'travel_dna',
      },
    );

    assert.deepEqual(
      personalization.budgetStyle,
      {
        value: 'comfortable',
        source: 'travel_dna',
      },
    );

    assert.deepEqual(
      personalization.dailyRhythm,
      {
        value: 'morning',
        source: 'travel_dna',
      },
    );
  },
);

test(
  'Discover does not invent personalization when neither brief nor Travel DNA supplies it',
  () => {
    const personalization =
      resolveDiscoverPersonalization(
        makeBrief(),
        null,
      );

    assert.deepEqual(
      personalization.pace,
      {
        source: 'unspecified',
      },
    );

    assert.deepEqual(
      personalization.interests,
      {
        values: [],
        source: 'unspecified',
      },
    );

    assert.deepEqual(
      personalization.party,
      {
        source: 'unspecified',
      },
    );
  },
);

test(
  'Discover handoff carries grounded destination, exact dates, intent and pace',
  () => {
    const prefill =
      buildDiscoverTripPrefill(
        makeBrief({
          timing: {
            kind: 'exact',
            startDate: '2026-10-12',
            endDate: '2026-10-16',
          },
          intent: 'food',
          pace: 'balanced',
        }),
        makeDestination(),
      );

    assert.deepEqual(
      prefill,
      {
        destination: {
          ...makeDestination(),
          timezoneSource: 'catalogue',
          placeId: undefined,
        },
        startDate: '2026-10-12',
        endDate: '2026-10-16',
        intent: 'food',
        pace: 'balanced',
      },
    );
  },
);

test(
  'flexible Discover timing is never converted into canonical trip dates during handoff',
  () => {
    const prefill =
      buildDiscoverTripPrefill(
        makeBrief({
          timing: {
            kind: 'flexible',
            earliestStartDate:
              '2026-10-01',
            latestEndDate:
              '2026-11-30',
            tripLengthDays: 4,
          },
        }),
        makeDestination(),
      );

    assert.equal(
      prefill.startDate,
      undefined,
    );

    assert.equal(
      prefill.endDate,
      undefined,
    );
  },
);

test(
  'Discover trip handoff survives route serialization and parsing',
  () => {
    const original =
      buildDiscoverTripPrefill(
        makeBrief({
          timing: {
            kind: 'exact',
            startDate: '2026-10-12',
            endDate: '2026-10-16',
          },
          intent: 'explore',
          pace: 'full',
        }),
        makeDestination(),
      );

    const params =
      serializeDiscoverTripPrefill(
        original,
      );

    const parsed =
      parseDiscoverTripRouteParams(
        params,
      );

    assert.deepEqual(
      parsed,
      original,
    );
  },
);

test(
  'Discover route parsing follows the existing first-value route parameter pattern',
  () => {
    const parsed =
      parseDiscoverTripRouteParams({
        source: [
          'discover',
          'ignored',
        ],
        destinationName: [
          'Lisbon, Portugal',
          'Ignored',
        ],
        destinationLatitude: [
          '38.7223',
          '0',
        ],
        destinationLongitude: [
          '-9.1393',
          '0',
        ],
      });

    assert.equal(
      parsed.destination.name,
      'Lisbon, Portugal',
    );

    assert.equal(
      parsed.destination.latitude,
      38.7223,
    );

    assert.equal(
      parsed.destination.longitude,
      -9.1393,
    );
  },
);

test(
  'Discover route parser rejects incomplete dates and invalid preference values',
  () => {
    assert.throws(
      () =>
        parseDiscoverTripRouteParams({
          source: 'discover',
          destinationName:
            'Lisbon, Portugal',
          destinationLatitude:
            '38.7223',
          destinationLongitude:
            '-9.1393',
          startDate:
            '2026-10-12',
        }),
      /both trip dates or neither/i,
    );

    assert.throws(
      () =>
        parseDiscoverTripRouteParams({
          source: 'discover',
          destinationName:
            'Lisbon, Portugal',
          destinationLatitude:
            '38.7223',
          destinationLongitude:
            '-9.1393',
          intent: 'impossible',
        }),
      /trip intent is not supported/i,
    );
  },
);

test(
  'non-Discover route parameters do not create a Discover handoff',
  () => {
    assert.equal(
      parseDiscoverTripRouteParams({
        source: 'something_else',
      }),
      null,
    );
  },
);