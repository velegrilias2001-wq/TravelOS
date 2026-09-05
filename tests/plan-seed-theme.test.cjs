const assert = require('node:assert/strict');
const test = require('node:test');

const {
  extractImportSeedClaims,
  IMPORT_SEED_EMPTY_ERROR,
} = require('../.test-build/src/services/import-seed-extract.js');

const {
  getTripThemePack,
  suggestTripThemePackId,
} = require('../.test-build/src/services/trip-theme.js');

const {
  buildNewTrip,
} = require('../.test-build/src/services/trip-creation.js');

test('extractImportSeedClaims finds trip seed and day lines', () => {
  const result = extractImportSeedClaims(`
Autumn Budapest for Two
2026-10-16
2026-10-19

Day 1: Arrive and walk the Danube
- Coffee and chimney cake
- Evening lights
`);

  assert.ok(result.claims.some((c) => c.kind === 'trip_seed'));
  assert.ok(
    result.claims.some((c) => c.kind === 'itinerary_line'),
  );

  const seed = result.claims.find((c) => c.kind === 'trip_seed');
  assert.equal(seed.startAt, '2026-10-16');
  assert.equal(seed.endAt, '2026-10-19');
  assert.doesNotMatch(seed.title, /latitude|longitude/i);
});

test('extractImportSeedClaims fails closed on empty prose', () => {
  assert.throws(
    () => extractImportSeedClaims(''),
    (error) =>
      error instanceof Error &&
      error.message === IMPORT_SEED_EMPTY_ERROR,
  );
});

test('suggestTripThemePackId uses country codes only', () => {
  assert.equal(
    suggestTripThemePackId(['IT']),
    'mediterranean-coast',
  );
  assert.equal(suggestTripThemePackId([]), 'ink-default');
  assert.equal(
    getTripThemePack('mediterranean-coast').moodEyebrow,
    'Coastal light',
  );
});

test('buildNewTrip assigns a theme pack from destination country', () => {
  const trip = buildNewTrip(
    {
      title: 'Rome weekend',
      destinations: [
        {
          name: 'Rome',
          countryCode: 'IT',
          latitude: 41.9,
          longitude: 12.5,
        },
      ],
      startDate: '2026-10-16',
      endDate: '2026-10-19',
      accountingCurrency: 'EUR',
    },
    {
      tripId: () => 'trip-1',
      destinationId: () => 'dest-1',
    },
    '2026-09-05T12:00:00.000Z',
  );

  assert.equal(trip.themePackId, 'mediterranean-coast');
});
