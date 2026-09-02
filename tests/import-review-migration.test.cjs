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
  'migration v11 creates an empty import review queue without inventing bookings',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await database.execAsync(DATABASE_SCHEMA);
      await database.execAsync(`
        DROP TABLE IF EXISTS import_claims;
        DROP TABLE IF EXISTS import_batches;
        DROP INDEX IF EXISTS idx_import_claims_batch_id;
        DROP INDEX IF EXISTS idx_import_batches_created_at;
        PRAGMA user_version = 10;
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

      assert.equal(version.user_version, 15);
      assert.equal(DATABASE_VERSION, 15);

      const batches = await database.queryFirst(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name = 'import_batches';
        `,
      );
      const claims = await database.queryFirst(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name = 'import_claims';
        `,
      );

      assert.ok(batches);
      assert.ok(claims);

      const batchCount = await database.queryFirst(
        'SELECT COUNT(*) AS count FROM import_batches;',
      );
      const claimCount = await database.queryFirst(
        'SELECT COUNT(*) AS count FROM import_claims;',
      );
      const bookingCount = await database.queryFirst(
        'SELECT COUNT(*) AS count FROM bookings;',
      );

      assert.equal(batchCount.count, 0);
      assert.equal(claimCount.count, 0);
      assert.equal(bookingCount.count, 0);

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
