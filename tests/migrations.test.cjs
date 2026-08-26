const assert =
  require('node:assert/strict');

const test =
  require('node:test');

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
  '2026-08-23T12:00:00.000Z';

test(
  'current migrations initialize a fresh database',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );

      assert.equal(
        version.user_version,
        DATABASE_VERSION,
      );

      const tripDaysTable =
        await database.queryFirst(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'trip_days';",
        );

      assert.ok(tripDaysTable);

      const indexes =
        await database.query(
          "PRAGMA index_list('trip_days');",
        );

      assert.ok(
        indexes.some(
          (index) =>
            index.name ===
            'ux_trip_days_trip_date',
        ),
      );
    } finally {
      database.close();
    }
  },
);

async function createVersionTwoDatabase() {
  const database =
    new NodeSQLiteDatabase();

  await database.execAsync(
    DATABASE_SCHEMA,
  );

  await database.execAsync(
    'PRAGMA user_version = 2;',
  );

  await database.runAsync(
    `
      INSERT INTO trips (
        id,
        title,
        status,
        start_date,
        end_date,
        accounting_currency,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      'trip-1',
      'Migration Test',
      'planned',
      '2026-09-01',
      '2026-09-03',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  return database;
}

async function rebuildAccommodationWithoutStopId(
  database,
) {
  await database.execAsync(`
    PRAGMA foreign_keys = OFF;

    ALTER TABLE accommodations
    RENAME TO accommodations_v2_source;

    CREATE TABLE accommodations (
      id TEXT PRIMARY KEY NOT NULL,
      trip_id TEXT NOT NULL,
      booking_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      check_in_at TEXT,
      check_out_at TEXT,
      phone TEXT,
      website TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (trip_id)
        REFERENCES trips(id)
        ON DELETE CASCADE,

      FOREIGN KEY (booking_id)
        REFERENCES bookings(id)
        ON DELETE SET NULL
    );

    DROP TABLE accommodations_v2_source;

    PRAGMA foreign_keys = ON;
  `);
}

async function insertDay(
  database,
  {
    id,
    date,
    dayNumber,
    title = null,
    notes = null,
  },
) {
  await database.runAsync(
    `
      INSERT INTO trip_days (
        id,
        trip_id,
        date,
        day_number,
        title,
        notes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      'trip-1',
      date,
      dayNumber,
      title,
      notes,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

test(
  'current migrations reconcile drift and install safe invariants without dropping referenced data',
  async () => {
    const database =
      await createVersionTwoDatabase();

    try {
      await rebuildAccommodationWithoutStopId(
        database,
      );

      await insertDay(
        database,
        {
          id: 'day-duplicate',
          date: '2026-09-01',
          dayNumber: 1,
          title:
            'Archived duplicate title',
          notes:
            'Archived duplicate notes',
        },
      );

      await insertDay(
        database,
        {
          id: 'day-keeper',
          date: '2026-09-01',
          dayNumber: 1,
          title: 'Arrival',
        },
      );

      await insertDay(
        database,
        {
          id: 'day-later',
          date: '2026-09-03',
          dayNumber: 1,
          title: 'Departure',
        },
      );

      await database.runAsync(
        `
          INSERT INTO trip_stops (
            id,
            trip_id,
            day_id,
            title,
            type,
            position,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'stop-duplicate',
          'trip-1',
          'day-duplicate',
          'Museum',
          'place',
          1,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO trip_stops (
            id,
            trip_id,
            day_id,
            title,
            type,
            position,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'stop-keeper',
          'trip-1',
          'day-keeper',
          'Lunch',
          'food',
          1,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO memories (
            id,
            trip_id,
            day_id,
            type,
            captured_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'memory-1',
          'trip-1',
          'day-keeper',
          'note',
          TIMESTAMP,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO trip_runtime_states (
            trip_id,
            phase,
            current_day_id,
            is_companion_active,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?);
        `,
        [
          'trip-1',
          'active',
          'day-keeper',
          1,
          TIMESTAMP,
        ],
      );

      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );

      assert.equal(
        version.user_version,
        DATABASE_VERSION,
      );

      const accommodationColumns =
        await database.query(
          'PRAGMA table_info(accommodations);',
        );

      assert.ok(
        accommodationColumns.some(
          (column) =>
            column.name ===
            'stop_id',
        ),
      );

      const days =
        await database.query(
          `
            SELECT
              id,
              date,
              day_number
            FROM trip_days
            WHERE trip_id = ?
            ORDER BY day_number ASC;
          `,
          ['trip-1'],
        );

      assert.equal(
        days.length,
        2,
      );

      assert.deepEqual(
        days.map(
          (day) =>
            day.day_number,
        ),
        [1, 2],
      );

      const archived =
        await database.queryFirst(
          `
            SELECT *
            FROM
              migration_v3_trip_day_duplicates
            WHERE id = ?;
          `,
          ['day-duplicate'],
        );

      assert.ok(archived);
      assert.equal(
        archived.title,
        'Archived duplicate title',
      );
      assert.equal(
        archived.notes,
        'Archived duplicate notes',
      );
      assert.equal(
        archived.kept_day_id,
        'day-keeper',
      );

      const stops =
        await database.query(
          `
            SELECT
              id,
              day_id,
              position
            FROM trip_stops
            ORDER BY position ASC;
          `,
        );

      assert.deepEqual(
        stops.map(
          (stop) => stop.day_id,
        ),
        [
          'day-keeper',
          'day-keeper',
        ],
      );

      assert.deepEqual(
        stops.map(
          (stop) => stop.position,
        ),
        [1, 2],
      );

      const tripDayIndexes =
        await database.query(
          `
            PRAGMA index_list(
              'trip_days'
            );
          `,
        );

      assert.ok(
        tripDayIndexes.some(
          (index) =>
            index.name ===
            'ux_trip_days_trip_date',
        ),
      );

      assert.ok(
        tripDayIndexes.some(
          (index) =>
            index.name ===
            'ux_trip_days_trip_day_number',
        ),
      );

      await assert.rejects(
        insertDay(
          database,
          {
            id: 'day-invalid-date',
            date: '2026-09-01',
            dayNumber: 3,
          },
        ),
      );

      await assert.rejects(
        insertDay(
          database,
          {
            id: 'day-invalid-number',
            date: '2026-09-04',
            dayNumber: 2,
          },
        ),
      );

      const archiveCountBefore =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM
              migration_v3_trip_day_duplicates;
          `,
        );

      await migrateDatabase(database);

      const archiveCountAfter =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM
              migration_v3_trip_day_duplicates;
          `,
        );

      assert.equal(
        archiveCountAfter.count,
        archiveCountBefore.count,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'migration v3 rolls back fully when reconciliation fails',
  async () => {
    const database =
      await createVersionTwoDatabase();

    try {
      await insertDay(
        database,
        {
          id: 'day-1',
          date: '2026-09-01',
          dayNumber: 1,
        },
      );

      await database.runAsync(
        `
          INSERT INTO trip_stops (
            id,
            trip_id,
            day_id,
            title,
            type,
            position,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'stop-1',
          'trip-1',
          'day-1',
          'Museum',
          'place',
          7,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.execAsync(`
        CREATE TRIGGER fail_v3_position_repair
        BEFORE UPDATE OF position
        ON trip_stops
        BEGIN
          SELECT RAISE(
            ABORT,
            'forced migration failure'
          );
        END;
      `);

      await assert.rejects(
        migrateDatabase(database),
        /forced migration failure/,
      );

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );

      assert.equal(
        version.user_version,
        2,
      );

      const stop =
        await database.queryFirst(
          `
            SELECT position
            FROM trip_stops
            WHERE id = ?;
          `,
          ['stop-1'],
        );

      assert.equal(
        stop.position,
        7,
      );

      const archiveTable =
        await database.queryFirst(
          `
            SELECT name
            FROM sqlite_master
            WHERE
              type = 'table' AND
              name =
                'migration_v3_trip_day_duplicates';
          `,
        );

      assert.equal(
        archiveTable,
        null,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'migration v4 adds expense dates without inventing them for existing items',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await database.execAsync(
        DATABASE_SCHEMA,
      );

      await database.execAsync(
        'PRAGMA user_version = 3;',
      );

      await database.runAsync(
        `
          INSERT INTO trips (
            id,
            title,
            status,
            start_date,
            end_date,
            accounting_currency,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'budget-trip',
          'Budget migration',
          'planned',
          '2026-09-01',
          '2026-09-03',
          'EUR',
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO budgets (
            id,
            trip_id,
            currency_code,
            planned_amount,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?);
        `,
        [
          'budget-1',
          'budget-trip',
          'EUR',
          1200,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO budget_items (
            id,
            budget_id,
            trip_id,
            title,
            category,
            status,
            amount,
            currency_code,
            notes,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'legacy-expense',
          'budget-1',
          'budget-trip',
          'Legacy expense',
          'food',
          'paid',
          42,
          'EUR',
          'Keep this note',
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );

      assert.equal(
        version.user_version,
        DATABASE_VERSION,
      );

      const columns = await database.query(
        'PRAGMA table_info(budget_items);',
      );

      assert.ok(
        columns.some(
          (column) =>
            column.name === 'expense_date',
        ),
      );

      const expense =
        await database.queryFirst(
          `
            SELECT
              title,
              amount,
              currency_code,
              expense_date,
              notes
            FROM budget_items
            WHERE id = ?;
          `,
          ['legacy-expense'],
        );

      assert.deepEqual({ ...expense }, {
        title: 'Legacy expense',
        amount: 42,
        currency_code: 'EUR',
        expense_date: null,
        notes: 'Keep this note',
      });

      const indexes = await database.query(
        "PRAGMA index_list('budget_items');",
      );
      const indexNames = new Set(
        indexes.map((index) => index.name),
      );

      assert.ok(
        indexNames.has(
          'idx_budget_items_trip_expense_date',
        ),
      );
      assert.ok(
        indexNames.has(
          'idx_budget_items_booking_id',
        ),
      );
      assert.ok(
        indexNames.has(
          'idx_budget_items_stop_id',
        ),
      );

      await migrateDatabase(database);

      const afterRepeat =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM budget_items
            WHERE id = ?;
          `,
          ['legacy-expense'],
        );

      assert.equal(afterRepeat.count, 1);
    } finally {
      database.close();
    }
  },
);

test(
  'migration v5 archives invalid cross-trip links, preserves bookings and enforces same-trip links',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await database.execAsync(
        DATABASE_SCHEMA,
      );
      await database.execAsync(
        'PRAGMA user_version = 4;',
      );

      for (const tripId of [
        'trip-a',
        'trip-b',
      ]) {
        await database.runAsync(
          `
            INSERT INTO trips (
              id,
              title,
              status,
              start_date,
              end_date,
              accounting_currency,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            tripId,
            tripId,
            'planned',
            '2026-09-01',
            '2026-09-01',
            'EUR',
            TIMESTAMP,
            TIMESTAMP,
          ],
        );

        await database.runAsync(
          `
            INSERT INTO trip_days (
              id,
              trip_id,
              date,
              day_number,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?);
          `,
          [
            `day-${tripId}`,
            tripId,
            '2026-09-01',
            1,
            TIMESTAMP,
            TIMESTAMP,
          ],
        );

        await database.runAsync(
          `
            INSERT INTO trip_stops (
              id,
              trip_id,
              day_id,
              title,
              type,
              position,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            `stop-${tripId}`,
            tripId,
            `day-${tripId}`,
            tripId,
            'place',
            1,
            TIMESTAMP,
            TIMESTAMP,
          ],
        );
      }

      await database.runAsync(
        `
          INSERT INTO bookings (
            id,
            trip_id,
            stop_id,
            type,
            status,
            title,
            confirmation_code,
            notes,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'legacy-booking',
          'trip-a',
          'stop-trip-b',
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

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );
      const booking =
        await database.queryFirst(
          `
            SELECT
              stop_id,
              title,
              confirmation_code,
              notes
            FROM bookings
            WHERE id = ?;
          `,
          ['legacy-booking'],
        );
      const archived =
        await database.queryFirst(
          `
            SELECT
              booking_trip_id,
              stop_id,
              stop_trip_id
            FROM
              migration_v5_invalid_booking_stop_links
            WHERE booking_id = ?;
          `,
          ['legacy-booking'],
        );

      assert.equal(
        version.user_version,
        DATABASE_VERSION,
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
      assert.deepEqual(
        { ...archived },
        {
          booking_trip_id: 'trip-a',
          stop_id: 'stop-trip-b',
          stop_trip_id: 'trip-b',
        },
      );

      const triggers =
        await database.query(
          `
            SELECT name
            FROM sqlite_master
            WHERE
              type = 'trigger' AND
              name LIKE
                'validate_booking_stop_%'
            ORDER BY name ASC;
          `,
        );

      assert.deepEqual(
        triggers.map(
          (trigger) =>
            trigger.name,
        ),
        [
          'validate_booking_stop_insert',
          'validate_booking_stop_update',
        ],
      );

      await assert.rejects(
        database.runAsync(
          `
            UPDATE bookings
            SET stop_id = ?
            WHERE id = ?;
          `,
          [
            'stop-trip-b',
            'legacy-booking',
          ],
        ),
        /booking stop must belong/,
      );

      await database.runAsync(
        `
          UPDATE bookings
          SET stop_id = ?
          WHERE id = ?;
        `,
        [
          'stop-trip-a',
          'legacy-booking',
        ],
      );

      await migrateDatabase(database);

      const afterRepeat =
        await database.queryFirst(
          `
            SELECT
              stop_id,
              title
            FROM bookings
            WHERE id = ?;
          `,
          ['legacy-booking'],
        );

      assert.deepEqual(
        { ...afterRepeat },
        {
          stop_id: 'stop-trip-a',
          title: 'Preserved booking',
        },
      );
    } finally {
      database.close();
    }
  },
);
async function insertV7Trip(
  database,
  tripId,
) {
  await database.runAsync(
    `
      INSERT INTO trips (
        id,
        title,
        status,
        start_date,
        end_date,
        accounting_currency,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      tripId,
      tripId,
      'completed',
      '2026-09-01',
      '2026-09-03',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

async function insertV7Day(
  database,
  {
    id,
    tripId,
    date,
    dayNumber,
  },
) {
  await database.runAsync(
    `
      INSERT INTO trip_days (
        id,
        trip_id,
        date,
        day_number,
        created_at,
        updated_at
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

async function insertV7Stop(
  database,
  {
    id,
    tripId,
    dayId,
    position,
  },
) {
  await database.runAsync(
    `
      INSERT INTO trip_stops (
        id,
        trip_id,
        day_id,
        title,
        type,
        position,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      tripId,
      dayId,
      id,
      'place',
      position,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

async function insertV7Memory(
  database,
  {
    id,
    tripId,
    dayId = null,
    stopId = null,
    title = id,
  },
) {
  await database.runAsync(
    `
      INSERT INTO memories (
        id,
        trip_id,
        day_id,
        stop_id,
        type,
        title,
        caption,
        captured_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      tripId,
      dayId,
      stopId,
      'note',
      title,
      'Preserve this memory',
      TIMESTAMP,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

test(
  'migration v7 archives invalid Memory and TravelBook links, preserves content and installs relationship invariants',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await database.execAsync(
        DATABASE_SCHEMA,
      );

      await database.execAsync(
        'PRAGMA user_version = 6;',
      );

      await insertV7Trip(
        database,
        'trip-a',
      );

      await insertV7Trip(
        database,
        'trip-b',
      );

      await insertV7Day(
        database,
        {
          id: 'day-a-1',
          tripId: 'trip-a',
          date: '2026-09-01',
          dayNumber: 1,
        },
      );

      await insertV7Day(
        database,
        {
          id: 'day-a-2',
          tripId: 'trip-a',
          date: '2026-09-02',
          dayNumber: 2,
        },
      );

      await insertV7Day(
        database,
        {
          id: 'day-b-1',
          tripId: 'trip-b',
          date: '2026-09-01',
          dayNumber: 1,
        },
      );

      await insertV7Stop(
        database,
        {
          id: 'stop-a-1',
          tripId: 'trip-a',
          dayId: 'day-a-1',
          position: 1,
        },
      );

      await insertV7Stop(
        database,
        {
          id: 'stop-a-2',
          tripId: 'trip-a',
          dayId: 'day-a-2',
          position: 1,
        },
      );

      await insertV7Stop(
        database,
        {
          id: 'stop-b-1',
          tripId: 'trip-b',
          dayId: 'day-b-1',
          position: 1,
        },
      );

      await insertV7Memory(
        database,
        {
          id: 'memory-valid',
          tripId: 'trip-a',
          dayId: 'day-a-1',
          stopId: 'stop-a-1',
          title: 'Valid memory',
        },
      );

      await insertV7Memory(
        database,
        {
          id: 'memory-cross-trip',
          tripId: 'trip-a',
          dayId: 'day-b-1',
          stopId: 'stop-b-1',
          title: 'Cross-trip memory',
        },
      );

      await insertV7Memory(
        database,
        {
          id: 'memory-day-stop-mismatch',
          tripId: 'trip-a',
          dayId: 'day-a-1',
          stopId: 'stop-a-2',
          title: 'Mismatched day and stop',
        },
      );

      await insertV7Memory(
        database,
        {
          id: 'memory-trip-b',
          tripId: 'trip-b',
          dayId: 'day-b-1',
          stopId: 'stop-b-1',
          title: 'Trip B memory',
        },
      );

      await database.runAsync(
        `
          INSERT INTO travel_books (
            id,
            trip_id,
            title,
            summary,
            is_published,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'book-a',
          'trip-a',
          'Trip A Travel Book',
          'Preserve this book',
          0,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO travel_book_memories (
            travel_book_id,
            memory_id,
            position
          )
          VALUES (?, ?, ?);
        `,
        [
          'book-a',
          'memory-valid',
          0,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO travel_book_memories (
            travel_book_id,
            memory_id,
            position
          )
          VALUES (?, ?, ?);
        `,
        [
          'book-a',
          'memory-trip-b',
          1,
        ],
      );

      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );

      assert.equal(
        version.user_version,
        7,
      );

      assert.equal(
        DATABASE_VERSION,
        7,
      );

      const validMemory =
        await database.queryFirst(
          `
            SELECT
              day_id,
              stop_id,
              title,
              caption
            FROM memories
            WHERE id = ?;
          `,
          ['memory-valid'],
        );

      assert.deepEqual(
        { ...validMemory },
        {
          day_id: 'day-a-1',
          stop_id: 'stop-a-1',
          title: 'Valid memory',
          caption: 'Preserve this memory',
        },
      );

      const crossTripMemory =
        await database.queryFirst(
          `
            SELECT
              day_id,
              stop_id,
              title,
              caption
            FROM memories
            WHERE id = ?;
          `,
          ['memory-cross-trip'],
        );

      assert.deepEqual(
        { ...crossTripMemory },
        {
          day_id: null,
          stop_id: null,
          title: 'Cross-trip memory',
          caption: 'Preserve this memory',
        },
      );

      const mismatchedMemory =
        await database.queryFirst(
          `
            SELECT
              day_id,
              stop_id,
              title
            FROM memories
            WHERE id = ?;
          `,
          ['memory-day-stop-mismatch'],
        );

      assert.deepEqual(
        { ...mismatchedMemory },
        {
          day_id: null,
          stop_id: 'stop-a-2',
          title: 'Mismatched day and stop',
        },
      );

      const archivedCrossTrip =
        await database.queryFirst(
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
          ['memory-cross-trip'],
        );

      assert.deepEqual(
        { ...archivedCrossTrip },
        {
          memory_trip_id: 'trip-a',
          day_id: 'day-b-1',
          day_trip_id: 'trip-b',
          stop_id: 'stop-b-1',
          stop_trip_id: 'trip-b',
        },
      );

      const archivedMismatch =
        await database.queryFirst(
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
          ['memory-day-stop-mismatch'],
        );

      assert.deepEqual(
        { ...archivedMismatch },
        {
          memory_trip_id: 'trip-a',
          day_id: 'day-a-1',
          day_trip_id: 'trip-a',
          stop_id: null,
          stop_trip_id: null,
        },
      );

      const book =
        await database.queryFirst(
          `
            SELECT
              title,
              summary,
              is_published
            FROM travel_books
            WHERE id = ?;
          `,
          ['book-a'],
        );

      assert.deepEqual(
        { ...book },
        {
          title: 'Trip A Travel Book',
          summary: 'Preserve this book',
          is_published: 0,
        },
      );

      const bookLinks =
        await database.query(
          `
            SELECT
              memory_id,
              position
            FROM travel_book_memories
            WHERE travel_book_id = ?
            ORDER BY position ASC;
          `,
          ['book-a'],
        );

      assert.deepEqual(
        bookLinks.map(
          (link) => ({
            memory_id: link.memory_id,
            position: link.position,
          }),
        ),
        [
          {
            memory_id: 'memory-valid',
            position: 0,
          },
        ],
      );

      const archivedBookLink =
        await database.queryFirst(
          `
            SELECT
              book_trip_id,
              memory_trip_id,
              position
            FROM
              migration_v7_invalid_travel_book_memory_links
            WHERE
              travel_book_id = ? AND
              memory_id = ?;
          `,
          [
            'book-a',
            'memory-trip-b',
          ],
        );

      assert.deepEqual(
        { ...archivedBookLink },
        {
          book_trip_id: 'trip-a',
          memory_trip_id: 'trip-b',
          position: 1,
        },
      );

      await assert.rejects(
        insertV7Memory(
          database,
          {
            id: 'memory-invalid-day',
            tripId: 'trip-a',
            dayId: 'day-b-1',
          },
        ),
        /memory day must belong to memory trip/,
      );

      await assert.rejects(
        insertV7Memory(
          database,
          {
            id: 'memory-invalid-stop',
            tripId: 'trip-a',
            stopId: 'stop-b-1',
          },
        ),
        /memory stop must belong to memory trip/,
      );

      await assert.rejects(
        insertV7Memory(
          database,
          {
            id: 'memory-invalid-pair',
            tripId: 'trip-a',
            dayId: 'day-a-1',
            stopId: 'stop-a-2',
          },
        ),
        /memory day and stop must describe the same trip day/,
      );

      await assert.rejects(
        database.runAsync(
          `
            INSERT INTO travel_book_memories (
              travel_book_id,
              memory_id,
              position
            )
            VALUES (?, ?, ?);
          `,
          [
            'book-a',
            'memory-trip-b',
            2,
          ],
        ),
        /travel book memory must belong to travel book trip/,
      );

      await assert.rejects(
        database.runAsync(
          `
            UPDATE memories
            SET trip_id = ?
            WHERE id = ?;
          `,
          [
            'trip-b',
            'memory-valid',
          ],
        ),
        /linked memory must remain in travel book trip/,
      );

      await assert.rejects(
        database.runAsync(
          `
            UPDATE travel_books
            SET trip_id = ?
            WHERE id = ?;
          `,
          [
            'trip-b',
            'book-a',
          ],
        ),
        /travel book must remain in linked memory trip/,
      );

      const memoryIndexes =
        await database.query(
          "PRAGMA index_list('memories');",
        );

      const memoryIndexNames =
        new Set(
          memoryIndexes.map(
            (index) => index.name,
          ),
        );

      assert.ok(
        memoryIndexNames.has(
          'idx_memories_day_id',
        ),
      );

      assert.ok(
        memoryIndexNames.has(
          'idx_memories_stop_id',
        ),
      );

      const bookMemoryIndexes =
        await database.query(
          "PRAGMA index_list('travel_book_memories');",
        );

      const bookMemoryIndexNames =
        new Set(
          bookMemoryIndexes.map(
            (index) => index.name,
          ),
        );

      assert.ok(
        bookMemoryIndexNames.has(
          'idx_travel_book_memories_memory_id',
        ),
      );

      assert.ok(
        bookMemoryIndexNames.has(
          'idx_travel_book_memories_book_position',
        ),
      );

      await migrateDatabase(database);

      const archiveCountAfterRepeat =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM migration_v7_invalid_memory_links;
          `,
        );

      assert.equal(
        archiveCountAfterRepeat.count,
        2,
      );

      const bookArchiveCountAfterRepeat =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM migration_v7_invalid_travel_book_memory_links;
          `,
        );

      assert.equal(
        bookArchiveCountAfterRepeat.count,
        1,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'migration v7 keeps Memories when linked itinerary context is deleted and cascades only TravelBook membership rows',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await database.execAsync(
        DATABASE_SCHEMA,
      );

      await database.execAsync(
        'PRAGMA user_version = 6;',
      );

      await insertV7Trip(
        database,
        'trip-delete',
      );

      await insertV7Day(
        database,
        {
          id: 'day-delete',
          tripId: 'trip-delete',
          date: '2026-09-01',
          dayNumber: 1,
        },
      );

      await insertV7Stop(
        database,
        {
          id: 'stop-delete',
          tripId: 'trip-delete',
          dayId: 'day-delete',
          position: 1,
        },
      );

      await insertV7Memory(
        database,
        {
          id: 'memory-delete-context',
          tripId: 'trip-delete',
          dayId: 'day-delete',
          stopId: 'stop-delete',
          title: 'Keep me',
        },
      );

      await database.runAsync(
        `
          INSERT INTO travel_books (
            id,
            trip_id,
            title,
            is_published,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?);
        `,
        [
          'book-delete',
          'trip-delete',
          'Delete semantics',
          0,
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      await database.runAsync(
        `
          INSERT INTO travel_book_memories (
            travel_book_id,
            memory_id,
            position
          )
          VALUES (?, ?, ?);
        `,
        [
          'book-delete',
          'memory-delete-context',
          0,
        ],
      );

      await migrateDatabase(database);

      await database.runAsync(
        `
          DELETE FROM trip_stops
          WHERE id = ?;
        `,
        ['stop-delete'],
      );

      const afterStopDelete =
        await database.queryFirst(
          `
            SELECT
              day_id,
              stop_id,
              title
            FROM memories
            WHERE id = ?;
          `,
          ['memory-delete-context'],
        );

      assert.deepEqual(
        { ...afterStopDelete },
        {
          day_id: 'day-delete',
          stop_id: null,
          title: 'Keep me',
        },
      );

      await database.runAsync(
        `
          DELETE FROM trip_days
          WHERE id = ?;
        `,
        ['day-delete'],
      );

      const afterDayDelete =
        await database.queryFirst(
          `
            SELECT
              day_id,
              stop_id,
              title
            FROM memories
            WHERE id = ?;
          `,
          ['memory-delete-context'],
        );

      assert.deepEqual(
        { ...afterDayDelete },
        {
          day_id: null,
          stop_id: null,
          title: 'Keep me',
        },
      );

      const membershipBeforeMemoryDelete =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM travel_book_memories
            WHERE
              travel_book_id = ? AND
              memory_id = ?;
          `,
          [
            'book-delete',
            'memory-delete-context',
          ],
        );

      assert.equal(
        membershipBeforeMemoryDelete.count,
        1,
      );

      await database.runAsync(
        `
          DELETE FROM memories
          WHERE id = ?;
        `,
        ['memory-delete-context'],
      );

      const membershipAfterMemoryDelete =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM travel_book_memories
            WHERE travel_book_id = ?;
          `,
          ['book-delete'],
        );

      assert.equal(
        membershipAfterMemoryDelete.count,
        0,
      );

      const preservedBook =
        await database.queryFirst(
          `
            SELECT title
            FROM travel_books
            WHERE id = ?;
          `,
          ['book-delete'],
        );

      assert.deepEqual(
        { ...preservedBook },
        {
          title: 'Delete semantics',
        },
      );
    } finally {
      database.close();
    }
  },
);
