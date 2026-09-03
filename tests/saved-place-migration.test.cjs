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
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

test(
  'migration v10 creates an empty saved_places store without inventing candidates',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await database.execAsync(DATABASE_SCHEMA);
      await database.execAsync(`
        DROP TABLE saved_places;
        DROP INDEX IF EXISTS idx_saved_places_created_at;
        PRAGMA user_version = 9;
      `);

      await database.execute(
        `
          INSERT INTO trips (
            id, title, status, start_date, end_date,
            accounting_currency, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'keep-me',
          'Keep me',
          'planned',
          '2026-11-01',
          '2026-11-04',
          'EUR',
          '2026-09-02T12:00:00.000Z',
          '2026-09-02T12:00:00.000Z',
        ],
      );

      await migrateDatabase(database);

      const version = await database.queryFirst(
        'PRAGMA user_version;',
      );

      assert.equal(version.user_version, 16);
      assert.equal(DATABASE_VERSION, 16);

      const table = await database.queryFirst(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name = 'saved_places';
        `,
      );

      assert.ok(table);

      const count = await database.queryFirst(
        'SELECT COUNT(*) AS count FROM saved_places;',
      );

      assert.equal(count.count, 0);

      const trip = await database.queryFirst(
        'SELECT id FROM trips WHERE id = ?;',
        ['keep-me'],
      );

      assert.equal(trip.id, 'keep-me');
    } finally {
      database.close();
    }
  },
);
