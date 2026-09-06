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
  deletePackingItem,
  listPackingItemsByTripId,
  savePackingItem,
} = require(
  '../.test-build/src/data/repositories/packing-persistence-operations.js',
);
const {
  packingProgress,
} = require('../.test-build/src/services/packing-progress.js');
const {
  selectWorldFootprintStats,
} = require('../.test-build/src/services/world-places.js');
const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

const TIMESTAMP = '2026-09-06T12:00:00.000Z';

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
      '2026-11-01',
      '2026-11-05',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );
}

test('packingProgress is zero on empty lists and never invents items', () => {
  assert.deepEqual(packingProgress([]), {
    total: 0,
    packed: 0,
    percentPacked: 0,
  });

  assert.deepEqual(
    packingProgress([
      {
        id: 'a',
        tripId: 't',
        title: 'Passport',
        packed: true,
        position: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'b',
        tripId: 't',
        title: 'Charger',
        packed: false,
        position: 2,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ]),
    {
      total: 2,
      packed: 1,
      percentPacked: 50,
    },
  );
});

test('migration v22 creates packing_items and cascades with trip delete', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await database.execAsync(DATABASE_SCHEMA);
    await database.execAsync(`
      DROP TABLE IF EXISTS packing_items;
      DROP INDEX IF EXISTS idx_packing_items_trip_id;
      PRAGMA user_version = 21;
    `);

    await insertTrip(database, 'trip-pack');
    await migrateDatabase(database);

    const version = await database.queryFirst(
      'PRAGMA user_version;',
    );
    assert.equal(version.user_version, DATABASE_VERSION);
    assert.equal(DATABASE_VERSION, 22);

    const table = await database.queryFirst(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'packing_items';
      `,
    );
    assert.ok(table);

    await savePackingItem(database, {
      id: 'pack-1',
      tripId: 'trip-pack',
      title: 'Passport',
      packed: false,
      position: 1,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });

    const listed = await listPackingItemsByTripId(
      database,
      'trip-pack',
    );
    assert.equal(listed.length, 1);
    assert.equal(listed[0].title, 'Passport');
    assert.equal(listed[0].packed, false);

    await database.execute(
      'DELETE FROM trips WHERE id = ?;',
      ['trip-pack'],
    );

    const afterDelete = await listPackingItemsByTripId(
      database,
      'trip-pack',
    );
    assert.equal(afterDelete.length, 0);
  } finally {
    database.close();
  }
});

test('packing persistence can toggle packed and delete rows', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);
    await insertTrip(database, 'trip-pack-2');

    await savePackingItem(database, {
      id: 'pack-2',
      tripId: 'trip-pack-2',
      title: 'Adapter',
      packed: false,
      position: 1,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });

    await savePackingItem(database, {
      id: 'pack-2',
      tripId: 'trip-pack-2',
      title: 'Adapter',
      packed: true,
      position: 1,
      createdAt: TIMESTAMP,
      updatedAt: '2026-09-06T13:00:00.000Z',
    });

    const listed = await listPackingItemsByTripId(
      database,
      'trip-pack-2',
    );
    assert.equal(listed[0].packed, true);

    await deletePackingItem(database, 'pack-2');
    const empty = await listPackingItemsByTripId(
      database,
      'trip-pack-2',
    );
    assert.equal(empty.length, 0);
  } finally {
    database.close();
  }
});

test('world footprint counts countries only from lived places with codes', () => {
  const stats = selectWorldFootprintStats([
    {
      id: 'a',
      trip: { id: 't1' },
      destination: {
        id: 'd1',
        name: 'Lisbon',
        countryCode: 'PT',
      },
      kind: 'lived',
      mapped: true,
      archive: {
        memoryCount: 0,
        photoCount: 0,
        noteCount: 0,
        coverUri: null,
      },
    },
    {
      id: 'b',
      trip: { id: 't2' },
      destination: {
        id: 'd2',
        name: 'Porto',
        countryCode: 'PT',
      },
      kind: 'lived',
      mapped: true,
      archive: {
        memoryCount: 0,
        photoCount: 0,
        noteCount: 0,
        coverUri: null,
      },
    },
    {
      id: 'c',
      trip: { id: 't3' },
      destination: {
        id: 'd3',
        name: 'Unknown city',
      },
      kind: 'lived',
      mapped: false,
      archive: {
        memoryCount: 0,
        photoCount: 0,
        noteCount: 0,
        coverUri: null,
      },
    },
    {
      id: 'd',
      trip: { id: 't4' },
      destination: {
        id: 'd4',
        name: 'Barcelona',
        countryCode: 'ES',
      },
      kind: 'planned',
      mapped: true,
      archive: {
        memoryCount: 0,
        photoCount: 0,
        noteCount: 0,
        coverUri: null,
      },
    },
  ]);

  assert.deepEqual(stats, {
    livedCountries: 1,
    livedPlaces: 3,
    plannedPlaces: 1,
  });
});
