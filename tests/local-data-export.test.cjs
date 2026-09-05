const assert = require('node:assert/strict');
const test = require('node:test');

const {
  LOCAL_DATA_EXPORT_CONTRACT,
  LOCAL_DATA_EXPORT_FORMAT,
  buildLocalDataExportDocument,
  serializeLocalDataExport,
} = require('../.test-build/src/services/local-data-export.js');

test('local export document is versioned and read-only', () => {
  const document = buildLocalDataExportDocument({
    travelDNA: null,
    savedPlaces: [],
    travelers: [],
    trips: [
      {
        id: 'trip-1',
        title: 'Lisbon',
        status: 'planned',
        destinations: [],
        startDate: '2026-09-03',
        endDate: '2026-09-03',
        accountingCurrency: 'EUR',
        createdAt: '2026-09-03T10:00:00.000Z',
        updatedAt: '2026-09-03T10:00:00.000Z',
      },
    ],
    days: [
      {
        id: 'day-1',
        tripId: 'trip-1',
        date: '2026-09-03',
        dayNumber: 1,
        createdAt: '2026-09-03T10:00:00.000Z',
        updatedAt: '2026-09-03T10:00:00.000Z',
      },
    ],
    stops: [],
    bookingsByTripId: { 'trip-1': [] },
    accommodationsByTripId: { 'trip-1': [] },
    budgetsByTripId: { 'trip-1': null },
    fxRatesByTripId: { 'trip-1': [] },
    memoriesByTripId: { 'trip-1': [] },
    travelBooksByTripId: { 'trip-1': null },
    runtimeByTripId: { 'trip-1': null },
    livedByTripId: { 'trip-1': [] },
    travelersByTripId: { 'trip-1': [] },
    exportedAt: '2026-09-05T00:00:00.000Z',
    appVersion: '1.0.0',
  });

  assert.equal(document.format, LOCAL_DATA_EXPORT_FORMAT);
  assert.equal(document.contract.mutatesSqlite, false);
  assert.equal(document.contract.includesPhotoBytes, false);
  assert.equal(document.contract.restoreAvailable, true);
  assert.equal(document.contract.cloudSync, false);
  assert.equal(document.trips.length, 1);
  assert.equal(document.trips[0].days.length, 1);
  assert.equal(document.trips[0].trip.title, 'Lisbon');
  assert.deepEqual(
    document.contract,
    LOCAL_DATA_EXPORT_CONTRACT,
  );

  const serialized = serializeLocalDataExport(document);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.format, LOCAL_DATA_EXPORT_FORMAT);
  assert.equal(parsed.trips[0].days[0].id, 'day-1');
});

test('empty local export still carries the contract', () => {
  const document = buildLocalDataExportDocument({
    travelDNA: null,
    savedPlaces: [],
    travelers: [],
    trips: [],
    days: [],
    stops: [],
    bookingsByTripId: {},
    accommodationsByTripId: {},
    budgetsByTripId: {},
    fxRatesByTripId: {},
    memoriesByTripId: {},
    travelBooksByTripId: {},
    runtimeByTripId: {},
    livedByTripId: {},
    travelersByTripId: {},
    exportedAt: '2026-09-05T00:00:00.000Z',
  });

  assert.equal(document.trips.length, 0);
  assert.equal(document.contract.restoreAvailable, true);
});
