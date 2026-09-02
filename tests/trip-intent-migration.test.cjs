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
  NodeSQLiteDatabase,
} = require(
  './support/node-sqlite-database.cjs',
);

const TIMESTAMP =
  '2026-08-27T12:00:00.000Z';

async function createVersionEightDatabase() {
  const database =
    new NodeSQLiteDatabase();

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

    PRAGMA user_version = 8;
  `);

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
      'legacy-trip',
      'Existing trip',
      'planned',
      '2026-09-10',
      '2026-09-15',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  return database;
}

test(
  'migration v9 adds optional trip intent and pace without inventing values',
  async () => {
    const database =
      await createVersionEightDatabase();

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

      assert.equal(
        DATABASE_VERSION,
        11,
      );

      const columns =
        await database.query(
          'PRAGMA table_info(trips);',
        );

      assert.ok(
        columns.some(
          (column) =>
            column.name === 'intent',
        ),
      );

      assert.ok(
        columns.some(
          (column) =>
            column.name === 'pace',
        ),
      );

      const legacyTrip =
        await database.queryFirst(
          `
            SELECT
              id,
              title,
              intent,
              pace
            FROM trips
            WHERE id = ?;
          `,
          ['legacy-trip'],
        );

      assert.deepEqual(
        { ...legacyTrip },
        {
          id: 'legacy-trip',
          title: 'Existing trip',
          intent: null,
          pace: null,
        },
      );
    } finally {
      database.close();
    }
  },
);

test(
  'trip intent and pace constraints accept supported values and reject invalid values',
  async () => {
    const database =
      await createVersionEightDatabase();

    try {
      await migrateDatabase(database);

      await database.runAsync(
        `
          UPDATE trips
          SET
            intent = ?,
            pace = ?
          WHERE id = ?;
        `,
        [
          'explore',
          'balanced',
          'legacy-trip',
        ],
      );

      const trip =
        await database.queryFirst(
          `
            SELECT
              intent,
              pace
            FROM trips
            WHERE id = ?;
          `,
          ['legacy-trip'],
        );

      assert.deepEqual(
        { ...trip },
        {
          intent: 'explore',
          pace: 'balanced',
        },
      );

      await assert.rejects(
        () =>
          database.runAsync(
            `
              UPDATE trips
              SET intent = ?
              WHERE id = ?;
            `,
            [
              'impossible',
              'legacy-trip',
            ],
          ),
      );

      await assert.rejects(
        () =>
          database.runAsync(
            `
              UPDATE trips
              SET pace = ?
              WHERE id = ?;
            `,
            [
              'impossible',
              'legacy-trip',
            ],
          ),
      );
    } finally {
      database.close();
    }
  },
);
