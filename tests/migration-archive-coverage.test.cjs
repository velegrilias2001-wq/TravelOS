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
  DATABASE_SCHEMA,
} = require(
  '../.test-build/src/data/database/schema.js',
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
      '2026-09-01',
      '2026-09-03',
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
      id,
      'activity',
      1,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

test(
  'migration v3 retargets memory and runtime references from an archived duplicate day',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await database.execAsync(DATABASE_SCHEMA);
      await database.execAsync(
        'PRAGMA user_version = 2;',
      );

      await insertTrip(database, 'trip-1');
      await insertDay(
        database,
        'day-keep',
        'trip-1',
        '2026-09-01',
      );
      await insertDay(
        database,
        'day-copy',
        'trip-1',
        '2026-09-01',
        2,
      );
      await insertStop(
        database,
        'stop-keep-1',
        'trip-1',
        'day-keep',
      );
      await insertStop(
        database,
        'stop-keep-2',
        'trip-1',
        'day-keep',
      );
      await insertStop(
        database,
        'stop-keep-3',
        'trip-1',
        'day-keep',
      );

      await database.execute(
        `
          INSERT INTO memories (
            id, trip_id, day_id, type,
            title, captured_at,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'memory-copy',
          'trip-1',
          'day-copy',
          'note',
          'Keep this note',
          TIMESTAMP,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );
      await database.execute(
        `
          INSERT INTO trip_runtime_states (
            trip_id, phase, current_day_id,
            is_companion_active, updated_at
          )
          VALUES (?, ?, ?, ?, ?);
        `,
        [
          'trip-1',
          'active',
          'day-copy',
          0,
          TIMESTAMP,
        ],
      );

      await migrateDatabase(database);

      const archived = await database.queryFirst(
        `
          SELECT
            id,
            kept_day_id,
            date
          FROM migration_v3_trip_day_duplicates
          WHERE id = ?;
        `,
        ['day-copy'],
      );
      assert.equal(archived.id, 'day-copy');
      assert.equal(archived.kept_day_id, 'day-keep');
      assert.equal(archived.date, '2026-09-01');

      const days = await database.query(
        `
          SELECT id
          FROM trip_days
          WHERE trip_id = ? AND date = ?
          ORDER BY id;
        `,
        ['trip-1', '2026-09-01'],
      );
      assert.deepEqual(
        days.map((day) => day.id),
        ['day-keep'],
      );

      const memory = await database.queryFirst(
        `
          SELECT id, title, day_id
          FROM memories
          WHERE id = ?;
        `,
        ['memory-copy'],
      );
      assert.equal(memory.id, 'memory-copy');
      assert.equal(memory.title, 'Keep this note');
      assert.equal(memory.day_id, 'day-keep');

      const runtime = await database.queryFirst(
        `
          SELECT trip_id, current_day_id
          FROM trip_runtime_states
          WHERE trip_id = ?;
        `,
        ['trip-1'],
      );
      assert.equal(runtime.trip_id, 'trip-1');
      assert.equal(runtime.current_day_id, 'day-keep');
    } finally {
      database.close();
    }
  },
);

test(
  'migration v5 archives a booking whose stop is missing and stays repeat-safe',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await database.execAsync(DATABASE_SCHEMA);
      await database.execAsync(`
        PRAGMA foreign_keys = OFF;
        PRAGMA user_version = 4;
      `);

      await insertTrip(database, 'trip-a');
      await insertDay(
        database,
        'day-a',
        'trip-a',
        '2026-09-01',
      );
      await insertStop(
        database,
        'stop-a',
        'trip-a',
        'day-a',
      );
      await database.execute(
        `
          INSERT INTO bookings (
            id, trip_id, stop_id, type, status,
            title, confirmation_code, notes,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'booking-missing-stop',
          'trip-a',
          'stop-gone',
          'activity',
          'confirmed',
          'Preserved booking',
          'KEEP-ME',
          'Preserved notes',
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await migrateDatabase(database);

      const booking = await database.queryFirst(
        `
          SELECT
            stop_id,
            title,
            confirmation_code,
            notes
          FROM bookings
          WHERE id = ?;
        `,
        ['booking-missing-stop'],
      );
      assert.deepEqual(
        { ...booking },
        {
          stop_id: null,
          title: 'Preserved booking',
          confirmation_code: 'KEEP-ME',
          notes: 'Preserved notes',
        },
      );

      const archived = await database.queryFirst(
        `
          SELECT
            booking_trip_id,
            stop_id,
            stop_trip_id
          FROM migration_v5_invalid_booking_stop_links
          WHERE booking_id = ?;
        `,
        ['booking-missing-stop'],
      );
      assert.deepEqual(
        { ...archived },
        {
          booking_trip_id: 'trip-a',
          stop_id: 'stop-gone',
          stop_trip_id: null,
        },
      );

      await migrateDatabase(database);

      const archiveCount =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM migration_v5_invalid_booking_stop_links;
          `,
        );
      assert.equal(archiveCount.count, 1);
      assert.equal(DATABASE_VERSION, 22);
    } finally {
      database.close();
    }
  },
);

test(
  'migration v6 archives missing accommodation booking and stop IDs',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);
      await database.execAsync(`
        DROP TRIGGER validate_accommodation_booking_insert;
        DROP TRIGGER validate_accommodation_booking_update;
        DROP TRIGGER validate_accommodation_stop_insert;
        DROP TRIGGER validate_accommodation_stop_update;
        PRAGMA user_version = 5;
        PRAGMA foreign_keys = OFF;
      `);

      await insertTrip(database, 'trip-a');
      await insertDay(
        database,
        'day-a',
        'trip-a',
        '2026-09-01',
      );
      await insertStop(
        database,
        'stop-a',
        'trip-a',
        'day-a',
      );

      await database.execute(
        `
          INSERT INTO accommodations (
            id, trip_id, booking_id, stop_id,
            name, type, address,
            check_in_at, check_out_at, notes,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'stay-missing-links',
          'trip-a',
          'booking-gone',
          'stop-gone',
          'Preserved stay',
          'hotel',
          'Known address',
          '2026-09-01T15:00:00',
          '2026-09-02T11:00:00',
          'Keep this note',
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await migrateDatabase(database);

      const stay = await database.queryFirst(
        `
          SELECT
            booking_id,
            stop_id,
            name,
            notes
          FROM accommodations
          WHERE id = ?;
        `,
        ['stay-missing-links'],
      );
      assert.deepEqual(
        { ...stay },
        {
          booking_id: null,
          stop_id: null,
          name: 'Preserved stay',
          notes: 'Keep this note',
        },
      );

      const archived = await database.queryFirst(
        `
          SELECT
            accommodation_trip_id,
            booking_id,
            booking_trip_id,
            stop_id,
            stop_trip_id
          FROM migration_v6_invalid_accommodation_links
          WHERE accommodation_id = ?;
        `,
        ['stay-missing-links'],
      );
      assert.deepEqual(
        { ...archived },
        {
          accommodation_trip_id: 'trip-a',
          booking_id: 'booking-gone',
          booking_trip_id: null,
          stop_id: 'stop-gone',
          stop_trip_id: null,
        },
      );
    } finally {
      database.close();
    }
  },
);

test(
  'migration v7 archives a memory whose day and stop IDs are missing',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await database.execAsync(DATABASE_SCHEMA);
      await database.execAsync(`
        PRAGMA foreign_keys = OFF;
        PRAGMA user_version = 6;
      `);

      await insertTrip(database, 'trip-a');
      await database.execute(
        `
          INSERT INTO memories (
            id, trip_id, day_id, stop_id, type,
            title, caption, captured_at,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'memory-missing-links',
          'trip-a',
          'day-gone',
          'stop-gone',
          'note',
          'Keep this memory',
          'Preserve this caption',
          TIMESTAMP,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await migrateDatabase(database);

      const memory = await database.queryFirst(
        `
          SELECT
            title,
            caption,
            day_id,
            stop_id
          FROM memories
          WHERE id = ?;
        `,
        ['memory-missing-links'],
      );
      assert.deepEqual(
        { ...memory },
        {
          title: 'Keep this memory',
          caption: 'Preserve this caption',
          day_id: null,
          stop_id: null,
        },
      );

      const archived = await database.queryFirst(
        `
          SELECT
            memory_trip_id,
            day_id,
            day_trip_id,
            stop_id,
            stop_trip_id
          FROM migration_v7_invalid_memory_links
          WHERE memory_id = ?;
        `,
        ['memory-missing-links'],
      );
      assert.deepEqual(
        { ...archived },
        {
          memory_trip_id: 'trip-a',
          day_id: 'day-gone',
          day_trip_id: null,
          stop_id: 'stop-gone',
          stop_trip_id: null,
        },
      );
    } finally {
      database.close();
    }
  },
);
