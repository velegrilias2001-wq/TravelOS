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

async function insertMemory(
  database,
  {
    id,
    tripId,
    dayId = null,
    stopId = null,
  },
) {
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
      id,
      tripId,
      dayId,
      stopId,
      'note',
      id,
      'Keep this memory',
      TIMESTAMP,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

function memoryForeignKeys(rows) {
  return new Set(rows.map((key) => key.from));
}

test(
  'migration v15 declares Memory day and stop foreign keys on a fresh database',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );
      assert.equal(version.user_version, DATABASE_VERSION);
      assert.equal(DATABASE_VERSION, 20);

      const foreignKeys = await database.query(
        'PRAGMA foreign_key_list(memories);',
      );
      const referenced =
        memoryForeignKeys(foreignKeys);

      assert.ok(referenced.has('trip_id'));
      assert.ok(referenced.has('day_id'));
      assert.ok(referenced.has('stop_id'));
    } finally {
      database.close();
    }
  },
);

test(
  'same-trip Memory day and stop survive matching deletes as unlinks',
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
      await insertMemory(database, {
        id: 'memory-a',
        tripId: 'trip-a',
        dayId: 'day-a',
        stopId: 'stop-a',
      });

      await database.execute(
        `
          INSERT INTO travel_books (
            id, trip_id, title, is_published,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?);
        `,
        [
          'book-a',
          'trip-a',
          'Keep membership',
          0,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );
      await database.execute(
        `
          INSERT INTO travel_book_memories (
            travel_book_id, memory_id, position
          )
          VALUES (?, ?, ?);
        `,
        ['book-a', 'memory-a', 0],
      );

      await database.execute(
        'DELETE FROM trip_stops WHERE id = ?;',
        ['stop-a'],
      );

      let memory = await database.queryFirst(
        `
          SELECT
            id,
            title,
            day_id,
            stop_id
          FROM memories
          WHERE id = ?;
        `,
        ['memory-a'],
      );
      assert.equal(memory.id, 'memory-a');
      assert.equal(memory.title, 'memory-a');
      assert.equal(memory.day_id, 'day-a');
      assert.equal(memory.stop_id, null);

      await database.execute(
        'DELETE FROM trip_days WHERE id = ?;',
        ['day-a'],
      );

      memory = await database.queryFirst(
        `
          SELECT
            id,
            title,
            day_id,
            stop_id
          FROM memories
          WHERE id = ?;
        `,
        ['memory-a'],
      );
      assert.equal(memory.id, 'memory-a');
      assert.equal(memory.title, 'memory-a');
      assert.equal(memory.day_id, null);
      assert.equal(memory.stop_id, null);

      const membership =
        await database.queryFirst(
          `
            SELECT memory_id, position
            FROM travel_book_memories
            WHERE travel_book_id = ?;
          `,
          ['book-a'],
        );
      assert.equal(membership.memory_id, 'memory-a');
      assert.equal(membership.position, 0);
    } finally {
      database.close();
    }
  },
);

test(
  'cross-trip Memory day and stop remain rejected after declared foreign keys',
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
          insertMemory(database, {
            id: 'memory-cross-day',
            tripId: 'trip-a',
            dayId: 'day-b',
          }),
        /memory day must belong to memory trip/,
      );

      await assert.rejects(
        () =>
          insertMemory(database, {
            id: 'memory-cross-stop',
            tripId: 'trip-a',
            stopId: 'stop-b',
          }),
        /memory stop must belong to memory trip/,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'migration v15 rebuilds historical memories with v7 unlink triggers present',
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

        CREATE TABLE memories (
          id TEXT PRIMARY KEY NOT NULL,
          trip_id TEXT NOT NULL,
          day_id TEXT,
          stop_id TEXT,
          type TEXT NOT NULL,
          title TEXT,
          caption TEXT,
          media_uri TEXT,
          captured_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (trip_id)
            REFERENCES trips(id)
            ON DELETE CASCADE
        );

        CREATE TABLE travel_books (
          id TEXT PRIMARY KEY NOT NULL,
          trip_id TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          cover_image_uri TEXT,
          summary TEXT,
          is_published INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (trip_id)
            REFERENCES trips(id)
            ON DELETE CASCADE
        );

        CREATE TABLE travel_book_memories (
          travel_book_id TEXT NOT NULL,
          memory_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          PRIMARY KEY (travel_book_id, memory_id),
          FOREIGN KEY (travel_book_id)
            REFERENCES travel_books(id)
            ON DELETE CASCADE,
          FOREIGN KEY (memory_id)
            REFERENCES memories(id)
            ON DELETE CASCADE
        );

        PRAGMA foreign_keys = ON;

        CREATE TRIGGER unlink_memories_after_day_delete
        AFTER DELETE ON trip_days
        BEGIN
          UPDATE memories
          SET day_id = NULL
          WHERE day_id = OLD.id;
        END;

        CREATE TRIGGER unlink_memories_after_stop_delete
        AFTER DELETE ON trip_stops
        BEGIN
          UPDATE memories
          SET stop_id = NULL
          WHERE stop_id = OLD.id;
        END;

        CREATE TRIGGER
          validate_travel_book_trip_update_for_memories
        BEFORE UPDATE OF trip_id ON travel_books
        WHEN EXISTS (
          SELECT 1
          FROM travel_book_memories tbm
          JOIN memories m
            ON m.id = tbm.memory_id
          WHERE
            tbm.travel_book_id = OLD.id AND
            m.trip_id <> NEW.trip_id
        )
        BEGIN
          SELECT RAISE(
            ABORT,
            'travel book must remain in linked memory trip'
          );
        END;

        PRAGMA user_version = 14;
      `);

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
      await insertMemory(database, {
        id: 'memory-keep',
        tripId: 'trip-a',
        dayId: 'day-a',
        stopId: 'stop-a',
      });
      await insertMemory(database, {
        id: 'memory-dangling',
        tripId: 'trip-a',
        dayId: 'day-missing',
      });

      await database.execute(
        `
          INSERT INTO travel_books (
            id, trip_id, title, is_published,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?);
        `,
        [
          'book-a',
          'trip-a',
          'Keep membership',
          0,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );
      await database.execute(
        `
          INSERT INTO travel_book_memories (
            travel_book_id, memory_id, position
          )
          VALUES (?, ?, ?);
        `,
        ['book-a', 'memory-keep', 0],
      );

      const beforeKeys = await database.query(
        'PRAGMA foreign_key_list(memories);',
      );
      assert.equal(
        memoryForeignKeys(beforeKeys).has('day_id'),
        false,
      );

      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );
      assert.equal(version.user_version, DATABASE_VERSION);
      assert.equal(DATABASE_VERSION, 20);

      const afterKeys = await database.query(
        'PRAGMA foreign_key_list(memories);',
      );
      const referenced =
        memoryForeignKeys(afterKeys);
      assert.ok(referenced.has('day_id'));
      assert.ok(referenced.has('stop_id'));

      const kept = await database.queryFirst(
        `
          SELECT
            title,
            day_id,
            stop_id
          FROM memories
          WHERE id = ?;
        `,
        ['memory-keep'],
      );
      assert.equal(kept.title, 'memory-keep');
      assert.equal(kept.day_id, 'day-a');
      assert.equal(kept.stop_id, 'stop-a');

      const dangling = await database.queryFirst(
        `
          SELECT day_id, stop_id
          FROM memories
          WHERE id = ?;
        `,
        ['memory-dangling'],
      );
      assert.equal(dangling.day_id, null);
      assert.equal(dangling.stop_id, null);

      const membership =
        await database.queryFirst(
          `
            SELECT memory_id, position
            FROM travel_book_memories
            WHERE travel_book_id = ?;
          `,
          ['book-a'],
        );
      assert.equal(membership.memory_id, 'memory-keep');
      assert.equal(membership.position, 0);

      const unlinkTrigger =
        await database.queryFirst(
          `
            SELECT name
            FROM sqlite_master
            WHERE
              type = 'trigger' AND
              name = 'unlink_memories_after_day_delete';
          `,
        );
      assert.equal(
        unlinkTrigger.name,
        'unlink_memories_after_day_delete',
      );

      await database.execute(
        'DELETE FROM trip_days WHERE id = ?;',
        ['day-a'],
      );

      const afterDelete =
        await database.queryFirst(
          `
            SELECT
              id,
              day_id,
              stop_id
            FROM memories
            WHERE id = ?;
          `,
          ['memory-keep'],
        );
      assert.equal(afterDelete.id, 'memory-keep');
      assert.equal(afterDelete.day_id, null);
      assert.equal(afterDelete.stop_id, 'stop-a');
    } finally {
      database.close();
    }
  },
);
