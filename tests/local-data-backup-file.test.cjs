const assert = require('node:assert/strict');
const test = require('node:test');
const { prepareLocalDataBackupText: prepare } = require('../.test-build/src/services/local-data-backup-file.js');
const { serializeLocalDataExport } = require('../.test-build/src/services/local-data-export.js');
const { MAX_RESTORE_BYTES, LocalDataRestoreError, parseLocalDataExportDocument: parse } = require('../.test-build/src/services/local-data-restore.js');
const { createDocument } = require('./support/local-data-fixture.cjs');
const { NodeSQLiteDatabase } = require('./support/node-sqlite-database.cjs');
const { migrateDatabase } = require('../.test-build/src/data/database/migrations.js');
const { replaceLocalDataFromExport: restore } = require('../.test-build/src/data/repositories/local-data-restore-persistence.js');

test('representative large archive retains ordered stop content through SQLite replacement', async t => {
  const document = createDocument();
  const bundle = document.trips[0];
  const first = bundle.stops[0];
  const initialCount = bundle.stops.length;
  const lastOrder = Math.max(...bundle.stops.filter(stop => stop.dayId === first.dayId).map(stop => stop.order));
  for (let index = 1; index <= 1000; index++) {
    bundle.stops.push({ ...first, id: `large-stop-${index}`, order: lastOrder + index, notes: `Synthetic ${index}: ${'α'.repeat(512)}` });
  }
  const started = performance.now();
  const text = prepare(document);
  assert.ok(Buffer.byteLength(text) < MAX_RESTORE_BYTES);
  const db = new NodeSQLiteDatabase();
  try {
    await migrateDatabase(db);
    await restore(db, JSON.parse(text));
    assert.equal((await db.queryFirst('SELECT COUNT(*) AS n FROM trip_stops')).n, initialCount + 1000);
    const rows = await db.query("SELECT id, position, notes FROM trip_stops WHERE id LIKE 'large-stop-%' ORDER BY position");
    assert.deepEqual(rows.map(row => ({ ...row })), bundle.stops.slice(initialCount).map(stop => ({ id: stop.id, position: stop.order, notes: stop.notes })));
    t.diagnostic(`${Buffer.byteLength(text)} UTF-8 bytes; prepare, migrate and restore ${Math.round(performance.now() - started)} ms on Node SQLite; not an Android RAM benchmark`);
  } finally { db.close(); }
});

test('prepared export is unchanged JSON accepted by the restore preflight', () => {
  const document = createDocument();
  const before = structuredClone(document);
  const text = prepare(document);
  assert.equal(text, serializeLocalDataExport(document));
  assert.deepEqual(parse(JSON.parse(text)), document);
  assert.deepEqual(document, before);
});

test('export accepts exactly 8 MiB and rejects one byte more, including formatting', () => {
  const document = createDocument();
  document.trips[0].days[0].notes = '';
  const overhead = Buffer.byteLength(serializeLocalDataExport(document), 'utf8');
  document.trips[0].days[0].notes = 'a'.repeat(MAX_RESTORE_BYTES - overhead);
  assert.equal(Buffer.byteLength(prepare(document), 'utf8'), MAX_RESTORE_BYTES);
  document.trips[0].days[0].notes += 'a';
  assert.throws(() => prepare(document), LocalDataRestoreError);
});

test('export counts multibyte text and JSON escape overhead, never truncates it', () => {
  for (const content of ['é', '🌍', '\n']) {
    const document = createDocument();
    document.trips[0].days[0].notes = content.repeat(MAX_RESTORE_BYTES / 2);
    assert.throws(() => prepare(document), LocalDataRestoreError);
    assert.equal(document.trips[0].days[0].notes, content.repeat(MAX_RESTORE_BYTES / 2));
  }
});

test('export rejects an invalid relationship instead of producing a rejected restore file', () => {
  const document = createDocument();
  document.trips[0].bookings[0].stopId = 'missing';
  assert.throws(() => prepare(document), LocalDataRestoreError);
});

test('legacy v1 without packing and with wall/absolute booking times restores unchanged', async () => {
  const db = new NodeSQLiteDatabase();
  try {
    await migrateDatabase(db);
    for (const startAt of ['2026-09-03T09:00', '2026-09-03T09:00:00.000Z', '2026-09-03T09:00:00+01:00']) {
      const document = createDocument();
      delete document.trips[0].packingItems;
      document.trips[0].bookings[0].startAt = startAt;
      const parsed = parse(JSON.parse(prepare(document)));
      await restore(db, parsed);
      assert.equal((await db.queryFirst('SELECT start_at FROM bookings')).start_at, startAt);
      assert.equal((await db.queryFirst('SELECT COUNT(*) AS count FROM packing_items')).count, 0);
    }
  } finally { db.close(); }
});

test('backup semantics reject future fields and unsupported enums without changing input', () => {
  for (const mutate of [
    d => { d.trips[0].trip.futurePreference = 'unsupported'; },
    d => { d.trips[0].travelers[0].futurePreference = 'unsupported'; },
    d => { d.trips[0].bookings[0].status = 'invented'; },
    d => { d.trips[0].stops[0].type = 'invented'; },
    d => { d.travelDNA.interests.push('invented'); },
    d => { d.savedPlaces[0].source = 'ai'; },
    d => { d.trips[0].trip.accountingCurrency = 'not currency'; },
  ]) {
    const document = createDocument(); mutate(document);
    const before = structuredClone(document);
    assert.throws(() => prepare(document), LocalDataRestoreError);
    assert.deepEqual(document, before);
  }
});

test('backup semantics reject malformed clocks and metadata instead of normalizing them', () => {
  for (const mutate of [
    d => { d.trips[0].stops[0].startTime = '25:00'; },
    d => { d.trips[0].bookings[0].startAt = '2026-02-30T09:00'; },
    d => { d.exportedAt = 'yesterday'; },
    d => { d.trips[0].trip.updatedAt = '2026-09-08T10:00'; },
  ]) {
    const document = createDocument(); mutate(document);
    assert.throws(() => prepare(document), LocalDataRestoreError);
  }
});

test('unsupported semantics are rejected before the destructive transaction starts', async () => {
  const document = createDocument(); document.trips[0].trip.status = 'invented';
  let started = false;
  await assert.rejects(restore({ transaction: async () => { started = true; } }, document), LocalDataRestoreError);
  assert.equal(started, false);
});

test('legacy descriptive contract metadata does not change restore authority', () => {
  const document = createDocument();
  document.contract.restoreAvailable = false;
  assert.deepEqual(parse(JSON.parse(prepare(document))), document);
});

test('backup rejects conflicting memory and runtime day/stop pairs before SQLite', () => {
  for (const kind of ['memory', 'runtime']) {
    const document = createDocument();
    const bundle = document.trips[0];
    bundle.days.push({ ...bundle.days[0], id: 'day-2', date: '2026-09-04', dayNumber: 2 });
    if (kind === 'memory') {
      bundle.memories.push({ id: 'memory-1', tripId: 'trip-1', dayId: 'day-2', stopId: 'stop-1', type: 'note', title: 'Test', capturedAt: document.exportedAt, createdAt: document.exportedAt, updatedAt: document.exportedAt });
    } else {
      bundle.runtimeState = { tripId: 'trip-1', phase: 'upcoming', currentDayId: 'day-2', currentStopId: 'stop-1', isCompanionActive: false, updatedAt: document.exportedAt };
    }
    assert.throws(() => prepare(document), LocalDataRestoreError);
  }
});
