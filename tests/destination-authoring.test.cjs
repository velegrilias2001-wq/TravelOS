const assert = require('node:assert/strict');
const test = require('node:test');

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  loadTripDestinations,
} = require(
  '../.test-build/src/data/repositories/trip-destination-persistence.js',
);
const {
  saveCanonicalTrip,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);
const {
  applyDestinationSelection,
  destinationAuthoringKind,
  mapDestinationProviderResult,
  mappedDestinations,
  singleMappedDestinationCoordinate,
} = require(
  '../.test-build/src/services/destination-authoring.js',
);
const {
  resolveTripTimeZone,
} = require(
  '../.test-build/src/services/time-truth.js',
);
const {
  NodeSQLiteDatabase,
} = require(
  './support/node-sqlite-database.cjs',
);

const TIMESTAMP = '2026-08-23T12:00:00.000Z';

test(
  'native provider results become mapped destinations without invented enrichment',
  () => {
    const selection = mapDestinationProviderResult({
      latitude: 35.6762,
      longitude: 139.6503,
      name: 'Tokyo',
      locality: 'Tokyo',
      administrativeArea: 'Tokyo',
      formattedAddress: 'Tokyo, Japan',
      country: 'Japan',
      countryCode: 'jp',
    });

    assert.deepEqual(selection, {
      name: 'Tokyo, Japan',
      countryCode: 'JP',
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: undefined,
      currencyCode: undefined,
    });

    const destination = applyDestinationSelection(
      'destination-tokyo',
      selection,
    );
    assert.equal(
      destinationAuthoringKind(destination),
      'selected',
    );
    assert.equal(destination.timezone, undefined);
    assert.equal(destination.currencyCode, undefined);
  },
);

test(
  'destination selection rejects unusable provider facts and accepts reliable optional facts',
  () => {
    assert.throws(
      () =>
        mapDestinationProviderResult({
          latitude: 91,
          longitude: 139,
          name: 'Invalid',
        }),
      /valid coordinates/i,
    );
    assert.throws(
      () =>
        mapDestinationProviderResult({
          latitude: 35,
          longitude: 139,
          name: 'Tokyo',
          countryCode: 'JPN',
        }),
      /two letters/i,
    );
    assert.throws(
      () =>
        mapDestinationProviderResult({
          latitude: 35,
          longitude: 139,
          name: 'Tokyo',
          timezone: 'Tokyo time',
        }),
      /valid IANA/i,
    );

    const enriched = mapDestinationProviderResult({
      latitude: 35.6762,
      longitude: 139.6503,
      name: 'Tokyo',
      timezone: 'Asia/Tokyo',
      currencyCode: 'jpy',
    });
    assert.equal(enriched.timezone, 'Asia/Tokyo');
    assert.equal(enriched.currencyCode, 'JPY');
    assert.deepEqual(
      resolveTripTimeZone(
        [applyDestinationSelection('tokyo', enriched)],
        'Europe/Athens',
      ),
      {
        source: 'destination',
        certainty: 'canonical',
        timeZone: 'Asia/Tokyo',
        reason: 'single-destination',
      },
    );
  },
);

test(
  'legacy name-only destinations remain valid and mapped consumers use every real coordinate',
  () => {
    const destinations = [
      { id: 'legacy', name: 'Old label' },
      {
        id: 'athens',
        name: 'Athens, Greece',
        latitude: 37.9838,
        longitude: 23.7275,
      },
      {
        id: 'tokyo',
        name: 'Tokyo, Japan',
        latitude: 35.6762,
        longitude: 139.6503,
      },
    ];

    assert.equal(
      destinationAuthoringKind(destinations[0]),
      'manual',
    );
    assert.equal(
      destinationAuthoringKind({
        id: 'incomplete-coordinate',
        name: 'Needs review',
        latitude: 37.9,
      }),
      'partially-enriched',
      'incomplete historical metadata must not be treated as editable free text',
    );
    assert.deepEqual(
      mappedDestinations(destinations).map(
        ({ destination }) => destination.id,
      ),
      ['athens', 'tokyo'],
    );
    assert.equal(
      singleMappedDestinationCoordinate(destinations),
      undefined,
      'multiple destinations must not silently select the first map context',
    );
  },
);

test(
  'selected destination facts persist and hydrate losslessly from SQLite',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await saveCanonicalTrip(database, {
        id: 'destination-persistence-trip',
        title: 'Destination persistence',
        status: 'planned',
        destinations: [
          {
            id: 'destination-1',
            name: 'Tokyo, Japan',
            countryCode: 'JP',
            latitude: 35.6762,
            longitude: 139.6503,
            timezone: 'Asia/Tokyo',
            currencyCode: 'JPY',
          },
          {
            id: 'destination-2',
            name: 'Legacy label',
          },
        ],
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        travelerIds: [],
        accountingCurrency: 'EUR',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      });

      const hydrated = await loadTripDestinations(
        database,
        'destination-persistence-trip',
      );

      assert.deepEqual(hydrated, [
        {
          id: 'destination-1',
          name: 'Tokyo, Japan',
          countryCode: 'JP',
          latitude: 35.6762,
          longitude: 139.6503,
          timezone: 'Asia/Tokyo',
          currencyCode: 'JPY',
        },
        {
          id: 'destination-2',
          name: 'Legacy label',
          countryCode: undefined,
          latitude: undefined,
          longitude: undefined,
          timezone: undefined,
          currencyCode: undefined,
        },
      ]);
    } finally {
      database.close();
    }
  },
);
