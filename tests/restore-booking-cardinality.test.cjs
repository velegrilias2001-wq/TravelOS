const assert = require('node:assert/strict');
const test = require('node:test');
const { NodeSQLiteDatabase } = require('./support/node-sqlite-database.cjs');
const { migrateDatabase } = require('../.test-build/src/data/database/migrations.js');
const { replaceLocalDataFromExport } = require('../.test-build/src/data/repositories/local-data-restore-persistence.js');
const { LOCAL_DATA_EXPORT_FORMAT, LOCAL_DATA_EXPORT_CONTRACT } = require('../.test-build/src/services/local-data-export.js');

test('restore preserves multiple distinct bookings linked to the same itinerary stop', async () => {
  const db = new NodeSQLiteDatabase();
  const timestamps = { createdAt: '2026-09-08T12:00:00Z', updatedAt: '2026-09-08T12:00:00Z' };
  const document = {
    format: LOCAL_DATA_EXPORT_FORMAT, contract: LOCAL_DATA_EXPORT_CONTRACT,
    exportedAt: timestamps.createdAt, appVersion: '1.0.0', travelDNA: null,
    savedPlaces: [], travelers: [], trips: [{
      trip: { ...timestamps, id: 'trip-test', title: 'Synthetic test', status: 'planned', destinations: [], travelerIds: [], startDate: '2026-09-08', endDate: '2026-09-08', accountingCurrency: 'EUR' },
      days: [{ ...timestamps, id: 'day-test', tripId: 'trip-test', date: '2026-09-08', dayNumber: 1 }],
      stops: [{ ...timestamps, id: 'stop-test', tripId: 'trip-test', dayId: 'day-test', title: 'Synthetic stop', type: 'activity', order: 1 }],
      bookings: ['booking-a', 'booking-b'].map(id => ({ ...timestamps, id, tripId: 'trip-test', stopId: 'stop-test', title: id, type: 'activity', status: 'confirmed' })),
      accommodations: [], budget: null, fxRates: [], memories: [], travelBook: null,
      runtimeState: null, livedStates: [], travelers: [], packingItems: [],
    }],
  };
  try {
    await migrateDatabase(db);
    await replaceLocalDataFromExport(db, document);
    assert.deepEqual((await db.query('SELECT id, stop_id FROM bookings ORDER BY id')).map(row => ({ ...row })), [
      { id: 'booking-a', stop_id: 'stop-test' },
      { id: 'booking-b', stop_id: 'stop-test' },
    ]);
  } finally { db.close(); }
});
