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
  NodeSQLiteDatabase,
} = require(
  './support/node-sqlite-database.cjs',
);

const TIMESTAMP =
  '2026-09-02T12:00:00.000Z';

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
      '2026-09-10',
      '2026-09-12',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

async function insertDay(
  database,
  id,
  tripId,
  date,
  dayNumber = 1,
) {
  await database.execute(
    `
      INSERT INTO trip_days (
        id, trip_id, date, day_number,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      tripId,
      date,
      dayNumber,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

async function insertStop(
  database,
  id,
  tripId,
  dayId,
) {
  await database.execute(
    `
      INSERT INTO trip_stops (
        id, trip_id, day_id, title, type,
        position, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      tripId,
      dayId,
      'Walk',
      'activity',
      0,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

async function insertRuntimeState(
  database,
  tripId,
  dayId,
  stopId,
) {
  await database.execute(
    `
      INSERT INTO trip_runtime_states (
        trip_id, phase, current_day_id,
        current_stop_id, last_activity_at,
        is_companion_active, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    [
      tripId,
      'active',
      dayId,
      stopId,
      TIMESTAMP,
      0,
      TIMESTAMP,
    ],
  );
}

test(
  'migration v13 does not invent runtime state on a fresh database',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );
      assert.equal(version.user_version, DATABASE_VERSION);
      assert.equal(DATABASE_VERSION, 23);

      const rows = await database.query(
        'SELECT trip_id FROM trip_runtime_states;',
      );
      assert.deepEqual(rows, []);

      const foreignKeys = await database.query(
        'PRAGMA foreign_key_list(trip_runtime_states);',
      );
      const referenced = new Set(
        foreignKeys.map((key) => key.from),
      );
      assert.ok(referenced.has('current_day_id'));
      assert.ok(referenced.has('current_stop_id'));
    } finally {
      database.close();
    }
  },
);

test(
  'same-trip runtime day and stop are accepted and survive matching deletes as unlinks',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await insertTrip(database, 'trip-a');
      await insertDay(
        database,
        'day-a',
        'trip-a',
        '2026-09-10',
      );
      await insertStop(
        database,
        'stop-a',
        'trip-a',
        'day-a',
      );
      await insertRuntimeState(
        database,
        'trip-a',
        'day-a',
        'stop-a',
      );

      await database.execute(
        'DELETE FROM trip_stops WHERE id = ?;',
        ['stop-a'],
      );

      let state = await database.queryFirst(
        `
          SELECT current_day_id, current_stop_id
          FROM trip_runtime_states
          WHERE trip_id = ?;
        `,
        ['trip-a'],
      );
      assert.equal(state.current_day_id, 'day-a');
      assert.equal(state.current_stop_id, null);

      await database.execute(
        'DELETE FROM trip_days WHERE id = ?;',
        ['day-a'],
      );

      state = await database.queryFirst(
        `
          SELECT current_day_id, current_stop_id
          FROM trip_runtime_states
          WHERE trip_id = ?;
        `,
        ['trip-a'],
      );
      assert.equal(state.current_day_id, null);
      assert.equal(state.current_stop_id, null);
    } finally {
      database.close();
    }
  },
);

test(
  'runtime state same-trip triggers reject a day or stop from another trip',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await insertTrip(database, 'trip-a');
      await insertTrip(database, 'trip-b');
      await insertDay(
        database,
        'day-a',
        'trip-a',
        '2026-09-10',
      );
      await insertDay(
        database,
        'day-b',
        'trip-b',
        '2026-09-10',
      );
      await insertStop(
        database,
        'stop-b',
        'trip-b',
        'day-b',
      );

      await assert.rejects(
        () =>
          insertRuntimeState(
            database,
            'trip-a',
            'day-b',
            null,
          ),
        /runtime trip/i,
      );

      await assert.rejects(
        () =>
          insertRuntimeState(
            database,
            'trip-a',
            null,
            'stop-b',
          ),
        /runtime trip/i,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'runtime state rejects a stop that does not belong to the assigned day',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await insertTrip(database, 'trip-a');
      await insertDay(
        database,
        'day-1',
        'trip-a',
        '2026-09-10',
      );
      await insertDay(
        database,
        'day-2',
        'trip-a',
        '2026-09-11',
        2,
      );
      await insertStop(
        database,
        'stop-2',
        'trip-a',
        'day-2',
      );

      await assert.rejects(
        () =>
          insertRuntimeState(
            database,
            'trip-a',
            'day-1',
            'stop-2',
          ),
        /same trip day/i,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'migration v13 archives invalid runtime links, preserves the row and installs invariants',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
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

        CREATE TABLE trip_stops (
          id TEXT PRIMARY KEY NOT NULL,
          trip_id TEXT NOT NULL,
          day_id TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          position INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (trip_id)
            REFERENCES trips(id)
            ON DELETE CASCADE
        );

        CREATE TABLE trip_runtime_states (
          trip_id TEXT PRIMARY KEY NOT NULL,
          phase TEXT NOT NULL,
          current_day_id TEXT,
          current_stop_id TEXT,
          last_activity_at TEXT,
          is_companion_active INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (trip_id)
            REFERENCES trips(id)
            ON DELETE CASCADE
        );

        PRAGMA foreign_keys = ON;
        PRAGMA user_version = 12;
      `);

      await insertTrip(database, 'trip-a');
      await insertTrip(database, 'trip-b');
      await insertDay(
        database,
        'day-a',
        'trip-a',
        '2026-09-10',
      );
      await insertDay(
        database,
        'day-b',
        'trip-b',
        '2026-09-10',
      );
      await insertStop(
        database,
        'stop-b',
        'trip-b',
        'day-b',
      );
      await insertRuntimeState(
        database,
        'trip-a',
        'day-b',
        'stop-b',
      );

      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );
      assert.equal(version.user_version, DATABASE_VERSION);
      assert.equal(DATABASE_VERSION, 23);

      const archived = await database.queryFirst(
        `
          SELECT
            current_day_id,
            current_stop_id
          FROM migration_v13_invalid_runtime_state_links
          WHERE trip_id = ?;
        `,
        ['trip-a'],
      );
      assert.equal(archived.current_day_id, 'day-b');
      assert.equal(archived.current_stop_id, 'stop-b');

      const state = await database.queryFirst(
        `
          SELECT
            trip_id,
            phase,
            current_day_id,
            current_stop_id
          FROM trip_runtime_states
          WHERE trip_id = ?;
        `,
        ['trip-a'],
      );
      assert.equal(state.trip_id, 'trip-a');
      assert.equal(state.phase, 'active');
      assert.equal(state.current_day_id, null);
      assert.equal(state.current_stop_id, null);

      await assert.rejects(
        () =>
          insertRuntimeState(
            database,
            'trip-a',
            'day-b',
            null,
          ),
        /runtime trip/i,
      );
    } finally {
      database.close();
    }
  },
);
