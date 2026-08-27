const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  buildNewTrip,
} = require(
  '../.test-build/src/services/trip-creation.js',
);

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);

const {
  saveCanonicalTrip,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);

const {
  NodeSQLiteDatabase,
} = require(
  './support/node-sqlite-database.cjs',
);

const TIMESTAMP =
  '2026-08-27T12:00:00.000Z';

const IDENTITIES = {
  tripId: () => 'created-trip',
  destinationId: () => 'created-destination',
};

function makeInput(overrides = {}) {
  return {
    title: 'Athens escape',
    destination: {
      name: 'Athens, Greece',
      countryCode: 'GR',
      latitude: 37.9838,
      longitude: 23.7275,
    },
    startDate: '2026-09-10',
    endDate: '2026-09-14',
    accountingCurrency: 'EUR',
    ...overrides,
  };
}

test(
  'new trip creation keeps intent and pace optional without inventing defaults',
  () => {
    const trip = buildNewTrip(
      makeInput(),
      IDENTITIES,
      TIMESTAMP,
    );

    assert.equal(trip.intent, undefined);
    assert.equal(trip.pace, undefined);
  },
);

test(
  'new trip creation accepts explicit trip intent and pace',
  () => {
    const trip = buildNewTrip(
      makeInput({
        intent: 'relax',
        pace: 'slow',
      }),
      IDENTITIES,
      TIMESTAMP,
    );

    assert.equal(trip.intent, 'relax');
    assert.equal(trip.pace, 'slow');
  },
);

test(
  'new trip creation rejects unsupported trip intent and pace',
  () => {
    assert.throws(
      () =>
        buildNewTrip(
          makeInput({
            intent: 'impossible',
          }),
          IDENTITIES,
          TIMESTAMP,
        ),
      /trip intent is not supported/i,
    );

    assert.throws(
      () =>
        buildNewTrip(
          makeInput({
            pace: 'impossible',
          }),
          IDENTITIES,
          TIMESTAMP,
        ),
      /trip pace is not supported/i,
    );
  },
);

test(
  'new trip intent and pace persist through canonical SQLite storage',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);

      const trip = buildNewTrip(
        makeInput({
          intent: 'explore',
          pace: 'balanced',
        }),
        IDENTITIES,
        TIMESTAMP,
      );

      await saveCanonicalTrip(
        database,
        trip,
      );

      const row =
        await database.queryFirst(
          `
            SELECT
              intent,
              pace
            FROM trips
            WHERE id = ?;
          `,
          [trip.id],
        );

      assert.deepEqual(
        { ...row },
        {
          intent: 'explore',
          pace: 'balanced',
        },
      );
    } finally {
      database.close();
    }
  },
);
