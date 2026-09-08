const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DATABASE_VERSION,
  migrateDatabase,
} = require('../.test-build/src/data/database/migrations.js');
const {
  replaceLocalDataFromExport,
} = require('../.test-build/src/data/repositories/local-data-restore-persistence.js');
const {
  loadTripById,
} = require('../.test-build/src/data/repositories/trip-list-persistence.js');
const {
  LOCAL_DATA_EXPORT_CONTRACT,
  LOCAL_DATA_EXPORT_FORMAT,
} = require('../.test-build/src/services/local-data-export.js');
const {
  LocalDataRestoreError,
  parseLocalDataExportDocument,
  summarizeLocalDataExport,
} = require('../.test-build/src/services/local-data-restore.js');
const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

const TIMESTAMP = '2026-09-05T10:00:00.000Z';

test('restore preserves explicit device AI-off and notification preferences on repeated restore', async () => {
  const db = new NodeSQLiteDatabase();
  try {
    await migrateDatabase(db);
    await db.execute('INSERT INTO ai_preferences (singleton_key, enabled, updated_at) VALUES (1, 0, ?)', [TIMESTAMP]);
    await db.execute('INSERT INTO notification_preferences (singleton_key, enabled, lead_minutes, updated_at) VALUES (1, 1, 30, ?)', [TIMESTAMP]);
    for (let i = 0; i < 2; i += 1) {
      await replaceLocalDataFromExport(db, createDocument());
      assert.deepEqual({ ...await db.queryFirst('SELECT enabled, updated_at FROM ai_preferences') }, { enabled: 0, updated_at: TIMESTAMP });
      assert.deepEqual({ ...await db.queryFirst('SELECT enabled, lead_minutes, updated_at FROM notification_preferences') }, { enabled: 1, lead_minutes: 30, updated_at: TIMESTAMP });
      assert.equal((await loadTripById(db, 'trip-1')).id, 'trip-1');
    }
  } finally { await db.close(); }
});

const { createDocument } = require('./support/local-data-fixture.cjs');

test('local export contract marks restore available', () => {
  assert.equal(LOCAL_DATA_EXPORT_CONTRACT.restoreAvailable, true);
  assert.equal(LOCAL_DATA_EXPORT_FORMAT, 'travelos.local-export.v1');
});

test('parseLocalDataExportDocument rejects unknown formats', () => {
  assert.throws(
    () =>
      parseLocalDataExportDocument({
        format: 'other.v1',
        exportedAt: TIMESTAMP,
        appVersion: '1.0.0',
        trips: [],
        travelers: [],
        savedPlaces: [],
        travelDNA: null,
      }),
    (error) =>
      error instanceof LocalDataRestoreError &&
      error.code === 'unsupported_format',
  );
});

test('parseLocalDataExportDocument accepts a valid export', () => {
  const document = createDocument();
  const parsed = parseLocalDataExportDocument(
    JSON.parse(JSON.stringify(document)),
  );
  const summary = summarizeLocalDataExport(parsed);

  assert.equal(parsed.format, LOCAL_DATA_EXPORT_FORMAT);
  assert.equal(summary.tripCount, 1);
  assert.equal(summary.travelerCount, 1);
  assert.equal(summary.savedPlaceCount, 1);
  assert.equal(summary.hasTravelDNA, true);
});

test('replaceLocalDataFromExport restores exported IDs atomically', async () => {
  const database = new NodeSQLiteDatabase();

  try {
    await migrateDatabase(database);
    assert.equal(
      (await database.queryFirst('PRAGMA user_version;')).user_version,
      DATABASE_VERSION,
    );

    await database.execute(
      `
        INSERT INTO trips (
          id, title, status, start_date, end_date,
          accounting_currency, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        'old-trip',
        'Should be wiped',
        'planned',
        '2026-01-01',
        '2026-01-02',
        'USD',
        TIMESTAMP,
        TIMESTAMP,
      ],
    );

    const document = createDocument();
    await replaceLocalDataFromExport(database, document);

    const oldTrip = await database.queryFirst(
      'SELECT id FROM trips WHERE id = ?;',
      ['old-trip'],
    );
    assert.equal(oldTrip, null);

    const trip = await loadTripById(database, 'trip-1');
    assert.ok(trip);
    assert.equal(trip.title, 'Lisbon');
    assert.equal(trip.destinations.length, 1);
    assert.equal(trip.destinations[0].id, 'dest-1');
    assert.deepEqual(trip.travelerIds, ['traveler-1']);
    assert.equal(trip.ownerTravelerId, 'traveler-1');

    const day = await database.queryFirst(
      'SELECT * FROM trip_days WHERE id = ?;',
      ['day-1'],
    );
    assert.equal(day.destination_id, 'dest-1');

    const stop = await database.queryFirst(
      'SELECT * FROM trip_stops WHERE id = ?;',
      ['stop-1'],
    );
    assert.equal(stop.title, 'Morning coffee');

    const booking = await database.queryFirst(
      'SELECT * FROM bookings WHERE id = ?;',
      ['booking-1'],
    );
    assert.equal(booking.stop_id, 'stop-1');

    const lived = await database.queryFirst(
      'SELECT * FROM trip_stop_lived_states WHERE stop_id = ?;',
      ['stop-1'],
    );
    assert.equal(lived.phase, 'done');

    const dna = await database.queryFirst(
      'SELECT * FROM travel_dna WHERE singleton_key = 1;',
    );
    assert.equal(dna.id, 'dna-1');

    const saved = await database.queryFirst(
      'SELECT * FROM saved_places WHERE grounded_identity = ?;',
      ['curated:pt-porto'],
    );
    assert.equal(saved.id, 'saved-1');

    const packing = await database.queryFirst(
      'SELECT * FROM packing_items WHERE id = ?;',
      ['pack-1'],
    );
    assert.equal(packing.title, 'Passport / ID');
    assert.equal(packing.packed, 1);
  } finally {
    database.close();
  }
});

test('failed restore leaves prior data when validation never reaches persistence', async () => {
  assert.throws(
    () => parseLocalDataExportDocument({ format: 'nope' }),
    LocalDataRestoreError,
  );
});

test('restore preflight rejects duplicate IDs, mismatched parents and dangling relationships', () => {
  const mutations = [
    d => d.trips.push(structuredClone(d.trips[0])),
    d => d.trips[0].stops.push({ ...d.trips[0].stops[0] }),
    d => { d.trips[0].stops[0].tripId = 'foreign'; },
    d => { d.trips[0].stops[0].dayId = 'missing'; },
    d => { d.trips[0].days[0].destinationId = 'missing'; },
    d => { d.trips[0].bookings[0].stopId = 'missing'; },
    d => { d.trips[0].travelers[0].firstName = 'Conflicting copy'; },
    d => { d.trips[0].trip.travelerIds.push('missing'); },
    d => { d.trips[0].trip.ownerTravelerId = 'missing'; },
    d => { d.savedPlaces.push({ ...d.savedPlaces[0], id: 'different' }); },
  ];
  for (const mutate of mutations) {
    const document = structuredClone(createDocument());
    mutate(document);
    assert.throws(() => parseLocalDataExportDocument(document), LocalDataRestoreError);
  }
});

test('restore preflight rejects primitive corruption and invalid calendar/order values', () => {
  const mutations = [
    d => { d.trips[0].trip.startDate = '2026-02-30'; },
    d => { d.trips[0].stops[0].title = { text: 'not a string' }; },
    d => { d.trips[0].stops[0].order = '1'; },
    d => { d.trips[0].stops[0].location = { name: 'bad', latitude: 91 }; },
    d => { d.trips[0].bookings[0].isPaid = 'false'; },
    d => { d.trips[0].packingItems[0].packed = 0; },
    d => { d.trips[0].days[0].dayNumber = 0; },
    d => { d.trips[0].days[0].notes = { nested: true }; },
    d => { d.travelDNA.interests = 'food'; },
  ];
  for (const mutate of mutations) {
    const document = structuredClone(createDocument());
    mutate(document);
    assert.throws(() => parseLocalDataExportDocument(document), LocalDataRestoreError);
  }
});

test('direct restore calls validate before starting any database transaction', async () => {
  const document = structuredClone(createDocument());
  document.trips[0].bookings[0].stopId = 'missing';
  let started = false;
  await assert.rejects(replaceLocalDataFromExport({ transaction: async () => { started = true; } }, document), LocalDataRestoreError);
  assert.equal(started, false);
});

test('late SQL failure rolls back the entire prior graph and privacy preferences', async () => {
  const db = new NodeSQLiteDatabase();
  try {
    await migrateDatabase(db);
    await replaceLocalDataFromExport(db, createDocument());
    await db.execute('INSERT INTO ai_preferences (singleton_key, enabled, updated_at) VALUES (1, 0, ?)', [TIMESTAMP]);
    const tables = (await db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).map(r => r.name);
    const snapshot = async () => Promise.all(tables.map(name => db.query(`SELECT * FROM "${name}"`)));
    const before = await snapshot();
    const incoming = structuredClone(createDocument());
    incoming.trips[0].trip.title = 'Replacement';
    const failingDb = { transaction: operation => db.transaction(connection => operation({
      query: connection.query.bind(connection), queryFirst: connection.queryFirst.bind(connection),
      execute: async (sql, params) => {
        if (/INSERT INTO packing_items/.test(sql)) throw new Error('injected late failure');
        await connection.execute(sql, params);
      },
    })) };
    await assert.rejects(replaceLocalDataFromExport(failingDb, incoming), /injected late failure/);
    assert.deepEqual(await snapshot(), before);
    await replaceLocalDataFromExport(db, incoming);
    assert.equal((await loadTripById(db, 'trip-1')).title, 'Replacement');
  } finally { db.close(); }
});

test('queued restore owns its validated document even if the caller mutates the input', async () => {
  const db = new NodeSQLiteDatabase();
  try {
    await migrateDatabase(db);
    const document = structuredClone(createDocument());
    const restoring = replaceLocalDataFromExport(db, document);
    document.trips[0].trip.title = 'Changed after request';
    await restoring;
    assert.equal((await loadTripById(db, 'trip-1')).title, 'Lisbon');
  } finally { db.close(); }
});

test('backup text limit counts UTF-8 bytes, not just JavaScript characters', () => {
  const { assertRestoreTextSize, MAX_RESTORE_BYTES } = require('../.test-build/src/services/local-data-restore.js');
  assert.doesNotThrow(() => assertRestoreTextSize('a'.repeat(MAX_RESTORE_BYTES)));
  assert.throws(() => assertRestoreTextSize('é'.repeat(MAX_RESTORE_BYTES / 2 + 1)), LocalDataRestoreError);
});
