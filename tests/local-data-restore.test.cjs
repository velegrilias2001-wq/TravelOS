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
  buildLocalDataExportDocument,
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

function createDocument() {
  return buildLocalDataExportDocument({
    travelDNA: {
      id: 'dna-1',
      interests: ['food', 'culture'],
      pace: 'slow',
      travelStyle: 'local',
      budgetStyle: 'comfortable',
      dailyRhythm: 'morning',
      typicalParty: 'couple',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    savedPlaces: [
      {
        id: 'saved-1',
        kind: 'destination',
        groundedIdentity: 'curated:pt-porto',
        source: 'curated',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    travelers: [
      {
        id: 'traveler-1',
        firstName: 'Alex',
        type: 'adult',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    trips: [
      {
        id: 'trip-1',
        title: 'Lisbon',
        status: 'planned',
        destinations: [
          {
            id: 'dest-1',
            name: 'Lisbon',
            countryCode: 'PT',
            latitude: 38.7223,
            longitude: -9.1393,
            timezone: 'Europe/Lisbon',
            timezoneSource: 'traveler',
          },
        ],
        travelerIds: ['traveler-1'],
        ownerTravelerId: 'traveler-1',
        startDate: '2026-09-03',
        endDate: '2026-09-05',
        accountingCurrency: 'EUR',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    days: [
      {
        id: 'day-1',
        tripId: 'trip-1',
        date: '2026-09-03',
        dayNumber: 1,
        destinationId: 'dest-1',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    stops: [
      {
        id: 'stop-1',
        tripId: 'trip-1',
        dayId: 'day-1',
        title: 'Morning coffee',
        type: 'food',
        order: 1,
        startTime: '09:00',
        endTime: '10:00',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    bookingsByTripId: {
      'trip-1': [
        {
          id: 'booking-1',
          tripId: 'trip-1',
          stopId: 'stop-1',
          type: 'activity',
          status: 'confirmed',
          title: 'Coffee reservation',
          startAt: '2026-09-03T09:00:00.000Z',
          isPaid: false,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
    },
    accommodationsByTripId: { 'trip-1': [] },
    budgetsByTripId: { 'trip-1': null },
    fxRatesByTripId: { 'trip-1': [] },
    memoriesByTripId: { 'trip-1': [] },
    travelBooksByTripId: { 'trip-1': null },
    runtimeByTripId: { 'trip-1': null },
    livedByTripId: {
      'trip-1': [
        {
          stopId: 'stop-1',
          tripId: 'trip-1',
          phase: 'done',
          recordedAt: TIMESTAMP,
        },
      ],
    },
    travelersByTripId: {
      'trip-1': [
        {
          id: 'traveler-1',
          firstName: 'Alex',
          type: 'adult',
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
    },
    exportedAt: '2026-09-05T12:00:00.000Z',
    appVersion: '1.0.0',
  });
}

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
