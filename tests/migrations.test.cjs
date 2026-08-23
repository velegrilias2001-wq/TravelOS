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
        4,
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
