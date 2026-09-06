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

test(
  'a stop on a same-trip day is accepted',
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

      const stop = await database.queryFirst(
        `
          SELECT trip_id, day_id
          FROM trip_stops
          WHERE id = ?;
        `,
        ['stop-a'],
      );
      assert.equal(stop.trip_id, 'trip-a');
      assert.equal(stop.day_id, 'day-a');
      assert.equal(DATABASE_VERSION, 22);
    } finally {
      database.close();
    }
  },
);

test(
  'a stop cannot use a day from another trip',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await insertTrip(database, 'trip-a');
      await insertTrip(database, 'trip-b');
      await insertDay(
        database,
        'day-b',
        'trip-b',
        '2026-09-10',
      );

      await assert.rejects(
        () =>
          insertStop(
            database,
            'stop-cross',
            'trip-a',
            'day-b',
          ),
        /same trip/i,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'migration v14 archives a mismatched stop, deletes it, and unlinks its booking',
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

        CREATE TABLE bookings (
          id TEXT PRIMARY KEY NOT NULL,
          trip_id TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          status TEXT NOT NULL,
          confirmation_status TEXT NOT NULL,
          start_at TEXT NOT NULL,
          end_at TEXT NOT NULL,
          timezone TEXT,
          start_time_unknown INTEGER NOT NULL DEFAULT 0,
          end_time_unknown INTEGER NOT NULL DEFAULT 0,
          confirmation_code TEXT,
          provider TEXT,
          notes TEXT,
          stop_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (trip_id)
            REFERENCES trips(id)
            ON DELETE CASCADE,
          FOREIGN KEY (stop_id)
            REFERENCES trip_stops(id)
            ON DELETE SET NULL
        );

        PRAGMA foreign_keys = ON;
        PRAGMA user_version = 13;
      `);

      await insertTrip(database, 'trip-a');
      await insertTrip(database, 'trip-b');
      await insertDay(
        database,
        'day-b',
        'trip-b',
        '2026-09-10',
      );
      await insertStop(
        database,
        'stop-mismatch',
        'trip-a',
        'day-b',
      );
      await database.execute(
        `
          INSERT INTO bookings (
            id, trip_id, title, type, status,
            confirmation_status, start_at, end_at,
            stop_id, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'booking-a',
          'trip-a',
          'Ferry',
          'transport',
          'planned',
          'unconfirmed',
          TIMESTAMP,
          TIMESTAMP,
          'stop-mismatch',
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );
      assert.equal(version.user_version, DATABASE_VERSION);

      const archived = await database.queryFirst(
        `
          SELECT
            stop_trip_id,
            day_id,
            title
          FROM migration_v14_invalid_stop_day_links
          WHERE stop_id = ?;
        `,
        ['stop-mismatch'],
      );
      assert.equal(archived.stop_trip_id, 'trip-a');
      assert.equal(archived.day_id, 'day-b');
      assert.equal(archived.title, 'Walk');

      const remaining = await database.query(
        `
          SELECT id FROM trip_stops
          WHERE id = ?;
        `,
        ['stop-mismatch'],
      );
      assert.deepEqual(remaining, []);

      const booking = await database.queryFirst(
        `
          SELECT stop_id FROM bookings
          WHERE id = ?;
        `,
        ['booking-a'],
      );
      assert.equal(booking.stop_id, null);

      await assert.rejects(
        () =>
          insertStop(
            database,
            'stop-new',
            'trip-a',
            'day-b',
          ),
        /same trip/i,
      );
    } finally {
      database.close();
    }
  },
);
