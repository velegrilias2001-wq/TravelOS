const { buildLocalDataExportDocument } = require('../../.test-build/src/services/local-data-export.js');
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
    packingByTripId: {
      'trip-1': [
        {
          id: 'pack-1',
          tripId: 'trip-1',
          title: 'Passport / ID',
          packed: true,
          position: 0,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
    },
    exportedAt: '2026-09-05T12:00:00.000Z',
    appVersion: '1.0.0',
  });
}

module.exports = { createDocument, TIMESTAMP };
