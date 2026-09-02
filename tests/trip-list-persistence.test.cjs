const assert =
  require('node:assert/strict');
const test = require('node:test');

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  loadTripById,
  loadTripList,
} = require(
  '../.test-build/src/data/repositories/trip-list-persistence.js',
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
  '2026-09-02T12:00:00.000Z';

function makeTrip(overrides = {}) {
  return {
    id: 'trip-lisbon',
    title: 'Lisbon',
    status: 'planned',
    intent: 'explore',
    pace: 'slow',
    destinations: [
      {
        id: 'destination-lisbon',
        name: 'Lisbon',
        countryCode: 'PT',
        latitude: 38.7223,
        longitude: -9.1393,
      },
      {
        id: 'destination-porto',
        name: 'Porto',
        countryCode: 'PT',
        latitude: 41.1579,
        longitude: -8.6291,
      },
    ],
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    travelerIds: ['traveler-1'],
    accountingCurrency: 'EUR',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

async function insertTraveler(database, id, firstName) {
  await database.execute(
    `
      INSERT INTO travelers (
        id, first_name, type,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?);
    `,
    [
      id,
      firstName,
      'adult',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

function wrapQueryCounter(database) {
  let queryCount = 0;
  const originalQuery = database.query.bind(database);

  database.query = async (...args) => {
    queryCount += 1;
    return originalQuery(...args);
  };

  return {
    get queryCount() {
      return queryCount;
    },
  };
}

test(
  'an empty trip list is one query and returns no invented trips',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      const counter = wrapQueryCounter(database);

      assert.deepEqual(
        await loadTripList(database),
        [],
      );
      assert.equal(counter.queryCount, 1);
    } finally {
      database.close();
    }
  },
);

test(
  'trip list hydration uses a constant number of queries and keeps destination order',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await insertTraveler(
        database,
        'traveler-1',
        'Ari',
      );
      await insertTraveler(
        database,
        'traveler-2',
        'Sam',
      );

      await saveCanonicalTrip(
        database,
        makeTrip(),
      );
      await saveCanonicalTrip(
        database,
        makeTrip({
          id: 'trip-tokyo',
          title: 'Tokyo',
          destinations: [
            {
              id: 'destination-tokyo',
              name: 'Tokyo',
              countryCode: 'JP',
              latitude: 35.6762,
              longitude: 139.6503,
            },
          ],
          startDate: '2026-10-01',
          endDate: '2026-10-08',
          travelerIds: [
            'traveler-1',
            'traveler-2',
          ],
        }),
      );

      const counter = wrapQueryCounter(database);
      const trips = await loadTripList(database);

      assert.equal(counter.queryCount, 3);
      assert.deepEqual(
        trips.map((trip) => trip.id),
        ['trip-lisbon', 'trip-tokyo'],
      );
      assert.deepEqual(
        trips[0].destinations.map(
          (destination) => destination.id,
        ),
        ['destination-lisbon', 'destination-porto'],
      );
      assert.deepEqual(
        trips[0].travelerIds,
        ['traveler-1'],
      );
      assert.equal(trips[0].intent, 'explore');
      assert.equal(trips[1].title, 'Tokyo');
      assert.deepEqual(
        trips[1].travelerIds,
        ['traveler-1', 'traveler-2'],
      );
      assert.deepEqual(
        trips[1].destinations.map(
          (destination) => destination.name,
        ),
        ['Tokyo'],
      );
    } finally {
      database.close();
    }
  },
);

test(
  'loading one trip still returns destinations and traveler memberships',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await insertTraveler(
        database,
        'traveler-1',
        'Ari',
      );
      await saveCanonicalTrip(
        database,
        makeTrip(),
      );

      const loaded = await loadTripById(
        database,
        'trip-lisbon',
      );

      assert.equal(loaded?.title, 'Lisbon');
      assert.equal(
        loaded?.destinations[1]?.name,
        'Porto',
      );
      assert.deepEqual(loaded?.travelerIds, [
        'traveler-1',
      ]);

      assert.equal(
        await loadTripById(
          database,
          'missing-trip',
        ),
        null,
      );
    } finally {
      database.close();
    }
  },
);
