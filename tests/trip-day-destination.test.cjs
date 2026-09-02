const assert =
  require('node:assert/strict');
const test = require('node:test');

const {
  DATABASE_VERSION,
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  ensureCanonicalTripDays,
  saveCanonicalTrip,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);
const {
  applyTripDayDestination,
  companionActivePlaceLabel,
  tripDayDestination,
} = require(
  '../.test-build/src/services/trip-day-destination.js',
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
    id: 'trip-1',
    title: 'Lisbon and Porto',
    status: 'planned',
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
    travelerIds: [],
    accountingCurrency: 'EUR',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeDay(overrides = {}) {
  return {
    id: 'day-1',
    tripId: 'trip-1',
    date: '2026-09-10',
    dayNumber: 1,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

test(
  'day destination assignment requires an exact trip destination ID',
  () => {
    const trip = makeTrip();
    const day = makeDay();

    assert.equal(
      tripDayDestination(day, trip.destinations),
      null,
    );

    const assigned = applyTripDayDestination(
      day,
      trip,
      'destination-porto',
      '2026-09-02T13:00:00.000Z',
    );

    assert.equal(
      assigned.destinationId,
      'destination-porto',
    );
    assert.deepEqual(
      tripDayDestination(
        assigned,
        trip.destinations,
      ),
      trip.destinations[1],
    );

    const cleared = applyTripDayDestination(
      assigned,
      trip,
      null,
      '2026-09-02T13:01:00.000Z',
    );

    assert.equal(cleared.destinationId, undefined);
    assert.equal(
      tripDayDestination(cleared, trip.destinations),
      null,
    );

    assert.throws(
      () =>
        applyTripDayDestination(
          day,
          trip,
          'unknown-destination',
          TIMESTAMP,
        ),
      /not on this trip/i,
    );

    assert.throws(
      () =>
        applyTripDayDestination(
          { ...day, tripId: 'other-trip' },
          trip,
          'destination-lisbon',
          TIMESTAMP,
        ),
      /another trip/i,
    );
  },
);

test(
  'companion active place copy never invents a city from destination order',
  () => {
    const trip = makeTrip();
    const day = makeDay();

    assert.equal(
      companionActivePlaceLabel(null, trip.destinations),
      'City not set for today',
    );
    assert.equal(
      companionActivePlaceLabel(day, trip.destinations),
      'City not set for today',
    );
    assert.equal(
      companionActivePlaceLabel(
        { ...day, destinationId: 'missing' },
        trip.destinations,
      ),
      'City not set for today',
    );
    assert.equal(
      companionActivePlaceLabel(
        { ...day, destinationId: 'destination-porto' },
        trip.destinations,
      ),
      'Porto',
    );
  },
);

async function insertAssignedDay(
  database,
  day,
) {
  await database.execute(
    `
      INSERT INTO trip_days (
        id,
        trip_id,
        date,
        day_number,
        title,
        notes,
        destination_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      day.id,
      day.tripId,
      day.date,
      day.dayNumber,
      day.title ?? null,
      day.notes ?? null,
      day.destinationId ?? null,
      day.createdAt,
      day.updatedAt,
    ],
  );
}

test(
  'trip destination upsert keeps day assignments and clears them when a city is removed',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);

      const trip = makeTrip();
      await saveCanonicalTrip(database, trip);

      await insertAssignedDay(
        database,
        makeDay({
          destinationId: 'destination-lisbon',
        }),
      );

      await saveCanonicalTrip(
        database,
        makeTrip({
          destinations: [
            {
              id: 'destination-lisbon',
              name: 'Lisboa',
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
          updatedAt: '2026-09-02T14:00:00.000Z',
        }),
      );

      const kept = await database.queryFirst(
        `
          SELECT destination_id, name
          FROM trip_days
          JOIN trip_destinations
            ON trip_destinations.id =
              trip_days.destination_id
          WHERE trip_days.id = ?;
        `,
        ['day-1'],
      );

      assert.equal(
        kept?.destination_id,
        'destination-lisbon',
      );
      assert.equal(kept?.name, 'Lisboa');

      await saveCanonicalTrip(
        database,
        makeTrip({
          destinations: [
            {
              id: 'destination-porto',
              name: 'Porto',
              countryCode: 'PT',
              latitude: 41.1579,
              longitude: -8.6291,
            },
          ],
          updatedAt: '2026-09-02T14:30:00.000Z',
        }),
      );

      const cleared = await database.queryFirst(
        `
          SELECT destination_id
          FROM trip_days
          WHERE id = ?;
        `,
        ['day-1'],
      );

      assert.equal(cleared.destination_id, null);

      const remaining = await database.query(
        `
          SELECT id
          FROM trip_destinations
          WHERE trip_id = ?
          ORDER BY position ASC;
        `,
        [trip.id],
      );

      assert.deepEqual(
        remaining.map((row) => row.id),
        ['destination-porto'],
      );
    } finally {
      database.close();
    }
  },
);

test(
  'repairing canonical days does not clear an assigned destination',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await saveCanonicalTrip(database, makeTrip());
      await insertAssignedDay(
        database,
        makeDay({
          destinationId: 'destination-porto',
        }),
      );

      await ensureCanonicalTripDays(database, [
        makeDay({
          id: 'generated-day-1',
          date: '2026-09-10',
          dayNumber: 1,
        }),
        makeDay({
          id: 'generated-day-2',
          date: '2026-09-11',
          dayNumber: 2,
        }),
        makeDay({
          id: 'generated-day-3',
          date: '2026-09-12',
          dayNumber: 3,
        }),
      ]);

      const rows = await database.query(
        `
          SELECT id, date, destination_id
          FROM trip_days
          WHERE trip_id = ?
          ORDER BY date ASC;
        `,
        ['trip-1'],
      );

      assert.equal(rows.length, 3);
      assert.equal(rows[0].id, 'day-1');
      assert.equal(
        rows[0].destination_id,
        'destination-porto',
      );
      assert.equal(rows[1].destination_id, null);
      assert.equal(rows[2].destination_id, null);
    } finally {
      database.close();
    }
  },
);

test(
  'same-trip destination triggers reject a city from another trip',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await saveCanonicalTrip(database, makeTrip());
      await saveCanonicalTrip(
        database,
        makeTrip({
          id: 'trip-2',
          title: 'Other trip',
          destinations: [
            {
              id: 'destination-other',
              name: 'Madrid',
            },
          ],
        }),
      );

      await assert.rejects(
        () =>
          insertAssignedDay(
            database,
            makeDay({
              destinationId: 'destination-other',
            }),
          ),
        /same trip/i,
      );
    } finally {
      database.close();
    }
  },
);

async function createVersionElevenDayDatabase() {
  const database = new NodeSQLiteDatabase();

  await database.execAsync(`
    CREATE TABLE trips (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      accounting_currency TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE trip_destinations (
      id TEXT PRIMARY KEY NOT NULL,
      trip_id TEXT NOT NULL,
      name TEXT NOT NULL,
      country_code TEXT,
      latitude REAL,
      longitude REAL,
      timezone TEXT,
      currency_code TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE
    );

    CREATE TABLE trip_days (
      id TEXT PRIMARY KEY NOT NULL,
      trip_id TEXT NOT NULL,
      date TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      title TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE
    );

    PRAGMA foreign_keys = ON;
    PRAGMA user_version = 11;
  `);

  await database.execute(
    `
      INSERT INTO trips (
        id, title, status,
        start_date, end_date,
        accounting_currency,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      'legacy-trip',
      'Legacy journey',
      'planned',
      '2026-09-10',
      '2026-09-11',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  await database.execute(
    `
      INSERT INTO trip_destinations (
        id, trip_id, name, position
      )
      VALUES (?, ?, ?, ?);
    `,
    [
      'legacy-destination',
      'legacy-trip',
      'Lisbon',
      0,
    ],
  );

  await database.execute(
    `
      INSERT INTO trip_days (
        id, trip_id, date, day_number,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?);
    `,
    [
      'legacy-day',
      'legacy-trip',
      '2026-09-10',
      1,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  return database;
}

test(
  'migration v12 adds optional day destination without inventing a city',
  async () => {
    const database =
      await createVersionElevenDayDatabase();

    try {
      await migrateDatabase(database);

      const version = await database.queryFirst(
        'PRAGMA user_version;',
      );

      assert.equal(
        version.user_version,
        DATABASE_VERSION,
      );
      assert.equal(DATABASE_VERSION, 13);

      const columns = await database.query(
        'PRAGMA table_info(trip_days);',
      );

      assert.ok(
        columns.some(
          (column) =>
            column.name === 'destination_id',
        ),
      );

      const legacy = await database.queryFirst(
        `
          SELECT destination_id
          FROM trip_days
          WHERE id = ?;
        `,
        ['legacy-day'],
      );

      assert.equal(legacy.destination_id, null);

      await database.execute(
        `
          UPDATE trip_days
          SET destination_id = ?
          WHERE id = ?;
        `,
        ['legacy-destination', 'legacy-day'],
      );

      const assigned = await database.queryFirst(
        `
          SELECT destination_id
          FROM trip_days
          WHERE id = ?;
        `,
        ['legacy-day'],
      );

      assert.equal(
        assigned.destination_id,
        'legacy-destination',
      );
    } finally {
      database.close();
    }
  },
);
