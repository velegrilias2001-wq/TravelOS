const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DATABASE_VERSION,
  migrateDatabase,
} = require('../.test-build/src/data/database/migrations.js');
const {
  DATABASE_SCHEMA,
} = require('../.test-build/src/data/database/schema.js');
const {
  deleteTripStopLivedState,
  loadTripStopLivedStates,
  loadTripStopLivedStatesForTrips,
  upsertLivedRuntimePointer,
  upsertTripStopLivedState,
} = require(
  '../.test-build/src/data/repositories/stop-lived-persistence-operations.js',
);
const {
  createStopLivedState,
  planStopLivedBadge,
} = require('../.test-build/src/services/stop-lived-progress.js');
const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

const TIMESTAMP = '2026-09-03T08:00:00.000Z';

async function insertTrip(database, id) {
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
      id,
      id,
      'planned',
      '2026-09-03',
      '2026-09-05',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

async function insertDay(database, id, tripId) {
  await database.execute(
    `
      INSERT INTO trip_days (
        id, trip_id, date, day_number,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?);
    `,
    [id, tripId, '2026-09-03', 1, TIMESTAMP, TIMESTAMP],
  );
}

async function insertStop(
  database,
  id,
  tripId,
  dayId,
  startTime = '09:00',
  endTime = '10:00',
) {
  await database.execute(
    `
      INSERT INTO trip_stops (
        id, trip_id, day_id, title, type,
        position, start_time, end_time,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      tripId,
      dayId,
      'Breakfast',
      'food',
      0,
      startTime,
      endTime,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

test('lived stop progress must stay on the same trip and only done or skipped', () => {
  const stop = {
    id: 'stop-1',
    tripId: 'trip-1',
    dayId: 'day-1',
    title: 'Breakfast',
    type: 'food',
    order: 1,
    startTime: '09:00',
    endTime: '10:00',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };

  assert.deepEqual(
    createStopLivedState(stop, 'trip-1', 'done', TIMESTAMP),
    {
      stopId: 'stop-1',
      tripId: 'trip-1',
      phase: 'done',
      recordedAt: TIMESTAMP,
    },
  );

  assert.throws(
    () =>
      createStopLivedState(stop, 'trip-other', 'skipped', TIMESTAMP),
    /same trip/,
  );
  assert.throws(
    () =>
      createStopLivedState(stop, 'trip-1', 'delayed', TIMESTAMP),
    /done or skipped/,
  );
});

test('Plan lived badges use only explicit done or skipped marks', () => {
  const states = [
    {
      stopId: 'stop-1',
      tripId: 'trip-1',
      phase: 'done',
      recordedAt: TIMESTAMP,
    },
    {
      stopId: 'stop-2',
      tripId: 'trip-1',
      phase: 'skipped',
      recordedAt: TIMESTAMP,
    },
  ];

  assert.equal(planStopLivedBadge('stop-1', states), 'done');
  assert.equal(planStopLivedBadge('stop-2', states), 'skipped');
  assert.equal(planStopLivedBadge('stop-open', states), undefined);
  assert.equal(planStopLivedBadge('stop-1', undefined), undefined);
});

test('migration v17 installs lived-stop states without inventing progress', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);
    const version = await database.queryFirst(
      'PRAGMA user_version;',
    );
    assert.equal(version.user_version, DATABASE_VERSION);
    assert.equal(DATABASE_VERSION, 22);

    const table = await database.queryFirst(
      `
        SELECT name
        FROM sqlite_master
        WHERE
          type = 'table' AND
          name = 'trip_stop_lived_states';
      `,
    );
    assert.ok(table);

    const count = await database.queryFirst(
      'SELECT COUNT(*) AS count FROM trip_stop_lived_states;',
    );
    assert.equal(count.count, 0);
  } finally {
    database.close();
  }
});

test('migration v17 recreates lived-stop states from version 16 without touching trips', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await database.execAsync(DATABASE_SCHEMA);
    await database.execAsync(`
      DROP TABLE IF EXISTS trip_stop_lived_states;
      DROP INDEX IF EXISTS idx_trip_stop_lived_states_trip_id;
      PRAGMA user_version = 16;
    `);

    await insertTrip(database, 'keep-me');
    await migrateDatabase(database);

    const version = await database.queryFirst(
      'PRAGMA user_version;',
    );
    assert.equal(version.user_version, DATABASE_VERSION);

    const table = await database.queryFirst(
      `
        SELECT name
        FROM sqlite_master
        WHERE
          type = 'table' AND
          name = 'trip_stop_lived_states';
      `,
    );
    assert.ok(table);

    const trip = await database.queryFirst(
      'SELECT id FROM trips WHERE id = ?;',
      ['keep-me'],
    );
    assert.equal(trip.id, 'keep-me');
  } finally {
    database.close();
  }
});

test('lived-stop states reject cross-trip rows and cascade with the stop', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);
    await insertTrip(database, 'trip-a');
    await insertTrip(database, 'trip-b');
    await insertDay(database, 'day-a', 'trip-a');
    await insertDay(database, 'day-b', 'trip-b');
    await insertStop(database, 'stop-a', 'trip-a', 'day-a');
    await insertStop(database, 'stop-b', 'trip-b', 'day-b');

    await assert.rejects(
      () =>
        database.execute(
          `
            INSERT INTO trip_stop_lived_states (
              stop_id, trip_id, phase, recorded_at
            )
            VALUES (?, ?, ?, ?);
          `,
          ['stop-a', 'trip-b', 'done', TIMESTAMP],
        ),
      /lived stop must belong to lived trip/,
    );

    await upsertTripStopLivedState(database, {
      stopId: 'stop-a',
      tripId: 'trip-a',
      phase: 'skipped',
      recordedAt: TIMESTAMP,
    });

    await database.execute(
      'DELETE FROM trip_stops WHERE id = ?;',
      ['stop-a'],
    );

    const remaining = await loadTripStopLivedStates(
      database,
      'trip-a',
    );
    assert.deepEqual(remaining, []);
  } finally {
    database.close();
  }
});

test('explicit lived progress writes a runtime pointer and leaves plan times unchanged', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);
    await insertTrip(database, 'trip-1');
    await insertDay(database, 'day-1', 'trip-1');
    await insertStop(
      database,
      'stop-1',
      'trip-1',
      'day-1',
      '09:00',
      '10:00',
    );

    const state = {
      stopId: 'stop-1',
      tripId: 'trip-1',
      phase: 'done',
      recordedAt: TIMESTAMP,
    };

    await database.transaction(async (transaction) => {
      await upsertTripStopLivedState(transaction, state);
      await upsertLivedRuntimePointer(transaction, {
        tripId: 'trip-1',
        phase: 'active',
        currentDayId: 'day-1',
        currentStopId: 'stop-1',
        lastActivityAt: TIMESTAMP,
        isCompanionActive: true,
        updatedAt: TIMESTAMP,
      });
    });

    const lived = await loadTripStopLivedStates(
      database,
      'trip-1',
    );
    assert.equal(lived.length, 1);
    assert.equal(lived[0].stopId, 'stop-1');
    assert.equal(lived[0].phase, 'done');
    assert.equal(lived[0].tripId, 'trip-1');
    assert.equal(lived[0].recordedAt, TIMESTAMP);

    const stop = await database.queryFirst(
      `
        SELECT start_time, end_time
        FROM trip_stops
        WHERE id = ?;
      `,
      ['stop-1'],
    );
    assert.equal(stop.start_time, '09:00');
    assert.equal(stop.end_time, '10:00');

    const runtime = await database.queryFirst(
      `
        SELECT
          current_stop_id,
          current_day_id,
          phase,
          is_companion_active
        FROM trip_runtime_states
        WHERE trip_id = ?;
      `,
      ['trip-1'],
    );
    assert.equal(runtime.current_stop_id, 'stop-1');
    assert.equal(runtime.current_day_id, 'day-1');
    assert.equal(runtime.phase, 'active');
    assert.equal(runtime.is_companion_active, 1);

    await deleteTripStopLivedState(database, 'stop-1');
    const afterClear = await loadTripStopLivedStates(
      database,
      'trip-1',
    );
    assert.equal(afterClear.length, 0);
  } finally {
    database.close();
  }
});

test('lived states for many trips load in one query', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);
    await insertTrip(database, 'trip-1');
    await insertTrip(database, 'trip-2');
    await insertDay(database, 'day-1', 'trip-1');
    await insertDay(database, 'day-2', 'trip-2');
    await insertStop(database, 'stop-1', 'trip-1', 'day-1');
    await insertStop(database, 'stop-2', 'trip-2', 'day-2');
    await upsertTripStopLivedState(database, {
      stopId: 'stop-1',
      tripId: 'trip-1',
      phase: 'done',
      recordedAt: TIMESTAMP,
    });
    await upsertTripStopLivedState(database, {
      stopId: 'stop-2',
      tripId: 'trip-2',
      phase: 'skipped',
      recordedAt: TIMESTAMP,
    });

    let queryCount = 0;
    const originalQuery = database.query.bind(database);
    database.query = async (...args) => {
      queryCount += 1;
      return originalQuery(...args);
    };

    const rows = await loadTripStopLivedStatesForTrips(
      database,
      ['trip-1', 'trip-2'],
    );

    assert.equal(queryCount, 1);
    assert.deepEqual(
      rows.map((row) => [row.tripId, row.phase]),
      [
        ['trip-1', 'done'],
        ['trip-2', 'skipped'],
      ],
    );
    assert.deepEqual(
      await loadTripStopLivedStatesForTrips(database, []),
      [],
    );
  } finally {
    database.close();
  }
});

test('migration v17 skips lived-stop install when itinerary tables are missing', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await database.execAsync(`
      PRAGMA user_version = 16;
    `);
    await migrateDatabase(database);

    const table = await database.queryFirst(
      `
        SELECT name
        FROM sqlite_master
        WHERE
          type = 'table' AND
          name = 'trip_stop_lived_states';
      `,
    );
    assert.equal(table, null);
    const version = await database.queryFirst(
      'PRAGMA user_version;',
    );
    assert.equal(version.user_version, DATABASE_VERSION);
  } finally {
    database.close();
  }
});
