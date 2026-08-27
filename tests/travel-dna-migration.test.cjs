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
  '2026-08-27T12:00:00.000Z';

test(
  'migration v8 creates one empty explicit Travel DNA profile store',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await database.execAsync(
        DATABASE_SCHEMA,
      );

      /*
       * Simulate an existing V7 database.
       * The current fresh-install schema already contains
       * travel_dna, so remove it before running V8.
       */
      await database.execAsync(`
        DROP TABLE travel_dna;
        PRAGMA user_version = 7;
      `);

      await migrateDatabase(database);

      const version =
        await database.queryFirst(
          'PRAGMA user_version;',
        );

      assert.equal(
        version.user_version,
        DATABASE_VERSION,
      );

      const table =
        await database.queryFirst(
          `
            SELECT name
            FROM sqlite_master
            WHERE
              type = 'table' AND
              name = 'travel_dna';
          `,
        );

      assert.ok(table);

      const count =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM travel_dna;
          `,
        );

      assert.equal(
        count.count,
        0,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'Travel DNA storage accepts explicit preferences and enforces one local profile',
  async () => {
    const database =
      new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);

      await database.runAsync(
        `
          INSERT INTO travel_dna (
            singleton_key,
            id,
            pace,
            interests_json,
            travel_style,
            budget_style,
            daily_rhythm,
            typical_party,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          1,
          'travel-dna-local',
          'balanced',
          JSON.stringify([
            'food',
            'culture',
          ]),
          'mix',
          'comfortable',
          'flexible',
          'couple',
          TIMESTAMP,
          TIMESTAMP,
        ],
      );

      const row =
        await database.queryFirst(
          `
            SELECT
              id,
              pace,
              interests_json,
              travel_style,
              budget_style,
              daily_rhythm,
              typical_party
            FROM travel_dna
            WHERE singleton_key = 1;
          `,
        );

      assert.deepEqual(
        { ...row },
        {
          id: 'travel-dna-local',
          pace: 'balanced',
          interests_json:
            '["food","culture"]',
          travel_style: 'mix',
          budget_style: 'comfortable',
          daily_rhythm: 'flexible',
          typical_party: 'couple',
        },
      );

      await assert.rejects(
        () =>
          database.runAsync(
            `
              INSERT INTO travel_dna (
                singleton_key,
                id,
                interests_json,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?);
            `,
            [
              2,
              'second-profile',
              '[]',
              TIMESTAMP,
              TIMESTAMP,
            ],
          ),
      );

      await assert.rejects(
        () =>
          database.runAsync(
            `
              UPDATE travel_dna
              SET pace = ?
              WHERE singleton_key = 1;
            `,
            ['impossible'],
          ),
      );
    } finally {
      database.close();
    }
  },
);
