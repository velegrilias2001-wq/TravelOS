const assert = require('node:assert/strict');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

// Only replace the native singleton boundary. Every repository and mapper below
// is real; using its default/global database must fail the test immediately.
const nativeModule = require.resolve('../.test-build/src/data/database/expo-sqlite-database.js');
require.cache[nativeModule] = { exports: { travelOSDatabase: new Proxy({}, {
  get() { throw new Error('Export escaped its scoped connection'); },
}) } };
const { collectLocalDataExportSnapshotFromDatabase: collect } = require('../.test-build/src/data/repositories/local-data-export-persistence.js');
const { buildLocalDataExportDocument: build } = require('../.test-build/src/services/local-data-export.js');
const { parseLocalDataExportDocument: parse } = require('../.test-build/src/services/local-data-restore.js');
const { replaceLocalDataFromExport: restore } = require('../.test-build/src/data/repositories/local-data-restore-persistence.js');
const { migrateDatabase } = require('../.test-build/src/data/database/migrations.js');
const { NodeSQLiteDatabase } = require('./support/node-sqlite-database.cjs');
const { createDocument, TIMESTAMP } = require('./support/local-data-fixture.cjs');

const json = value => JSON.parse(JSON.stringify(value));
const documentFrom = snapshot => build({ ...snapshot, exportedAt: TIMESTAMP, appVersion: '1.0.0' });

test('snapshot exports an empty database without inventing or writing records', async () => {
  const db = new NodeSQLiteDatabase();
  try {
    await migrateDatabase(db);
    const changes = db.raw.prepare('SELECT total_changes() AS n').get().n;
    const document = parse(documentFrom(await collect(db)));
    assert.deepEqual(document.trips, []);
    assert.deepEqual(document.travelers, []);
    assert.equal(document.travelDNA, null);
    assert.equal(db.raw.prepare('SELECT total_changes() AS n').get().n, changes);
  } finally { db.close(); }
});

test('snapshot reuses all repository readers and retains linked facts on round trip', async () => {
  const db = new NodeSQLiteDatabase();
  try {
    await migrateDatabase(db);
    const input = createDocument();
    const bundle = input.trips[0];
    const base = { tripId: 'trip-1', createdAt: TIMESTAMP, updatedAt: TIMESTAMP };
    bundle.accommodations = [{ ...base, id: 'stay-1', name: 'Synthetic stay', type: 'hotel', stopId: 'stop-1', bookingId: 'booking-1' }];
    bundle.budget = { ...base, id: 'budget-1', currencyCode: 'EUR', plannedAmount: 500, items: [
      { ...base, id: 'expense-1', budgetId: 'budget-1', title: 'Synthetic expense', amount: 20, currencyCode: 'USD', category: 'food', status: 'paid', date: '2026-09-03', bookingId: 'booking-1', stopId: 'stop-1' },
    ] };
    bundle.fxRates = [{ ...base, id: 'fx-1', fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.9, source: 'traveler', asOf: '2026-09-03' }];
    bundle.memories = [{ ...base, id: 'memory-1', dayId: 'day-1', stopId: 'stop-1', type: 'photo', caption: 'Synthetic caption', mediaUri: 'file:///synthetic-only.jpg', capturedAt: TIMESTAMP }];
    bundle.travelBook = { ...base, id: 'book-1', title: 'Synthetic book', memoryIds: ['memory-1'], isPublished: false, coverImageUri: 'file:///synthetic-only.jpg' };
    bundle.runtimeState = { tripId: 'trip-1', phase: 'active', currentDayId: 'day-1', currentStopId: 'stop-1', isCompanionActive: true, updatedAt: TIMESTAMP };
    await restore(db, input);
    const changes = db.raw.prepare('SELECT total_changes() AS n').get().n;
    const first = parse(json(documentFrom(await collect(db))));
    assert.equal(db.raw.prepare('SELECT total_changes() AS n').get().n, changes);
    // Metadata timestamp is intentionally supplied by this test, not SQLite.
    assert.deepEqual(first, json({ ...input, exportedAt: TIMESTAMP }));
    await restore(db, first);
    assert.deepEqual(json(documentFrom(await collect(db))), first);
  } finally { db.close(); }
});

test('one WAL snapshot survives a concurrent committed mutation during collection', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'travelos-export-snapshot-'));
  const db = new NodeSQLiteDatabase();
  db.raw.close();
  db.raw = new DatabaseSync(join(directory, 'isolated.db'));
  let writer;
  try {
    await migrateDatabase(db);
    await restore(db, createDocument());
    writer = new DatabaseSync(join(directory, 'isolated.db'));
    let mutated = false;
    let transactions = 0;
    const scopedOnly = {
      transaction: async operation => {
        transactions += 1;
        db.raw.exec('BEGIN'); // Same deferred read transaction as Expo SQLite.
        try {
          const result = await operation({
            query: async (sql, params = []) => {
              const rows = await db.query(sql, params);
              if (!mutated && /FROM trips\s/.test(sql)) {
                mutated = true;
                writer.exec("BEGIN; UPDATE trips SET title = 'Changed'; UPDATE travelers SET first_name = 'Changed'; UPDATE trip_days SET title = 'Changed'; UPDATE bookings SET title = 'Changed'; COMMIT;");
              }
              return rows;
            },
            queryFirst: db.queryFirst.bind(db),
            execute: async () => { throw new Error('Snapshot wrote data'); },
          });
          db.raw.exec('COMMIT');
          return result;
        } catch (error) { db.raw.exec('ROLLBACK'); throw error; }
      },
      query: async () => { throw new Error('Unscoped query'); },
      queryFirst: async () => { throw new Error('Unscoped query'); },
    };
    const snapshot = parse(json(documentFrom(await collect(scopedOnly))));
    assert.equal(transactions, 1);
    assert.equal(mutated, true);
    assert.equal(snapshot.trips[0].trip.title, 'Lisbon');
    assert.equal(snapshot.travelers[0].firstName, 'Alex');
    assert.equal(snapshot.trips[0].travelers[0].firstName, 'Alex');
    assert.equal(snapshot.trips[0].days[0].title, undefined);
    assert.equal(snapshot.trips[0].bookings[0].title, 'Coffee reservation');
    assert.equal((await db.queryFirst('SELECT title FROM trips')).title, 'Changed');
    assert.equal((await collect(db)).travelers[0].firstName, 'Changed');
  } finally {
    writer?.close();
    db.close();
    rmSync(directory, { recursive: true, force: true }); // Only this mkdtemp fixture.
  }
});

test('failed snapshot returns no partial result and a subsequent collection succeeds', async () => {
  const db = new NodeSQLiteDatabase();
  try {
    await migrateDatabase(db);
    await restore(db, createDocument());
    const failing = { transaction: operation => db.transaction(connection => operation({
      query: async (sql, params) => {
        if (/FROM packing_items/.test(sql)) throw new Error('injected read failure');
        return connection.query(sql, params);
      },
      queryFirst: connection.queryFirst.bind(connection),
      execute: async () => { throw new Error('Snapshot wrote data'); },
    })) };
    await assert.rejects(collect(failing), /injected read failure/);
    assert.equal((await collect(db)).trips[0].title, 'Lisbon');
  } finally { db.close(); }
});
