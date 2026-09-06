const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTripEvidencePack,
  summarizeTripEvidencePack,
} = require('../.test-build/src/services/trip-evidence-pack.js');

const TIMESTAMP = '2026-09-06T12:00:00.000Z';

test('evidence pack stays read-only and never invents packing or readiness', () => {
  const pack = buildTripEvidencePack({
    workspace: {
      trip: {
        id: 'trip-1',
        title: 'Lisboa',
        status: 'planned',
        destinations: [
          {
            id: 'dest-1',
            tripId: 'trip-1',
            name: 'Lisboa, Portugal',
            order: 0,
          },
        ],
        startDate: '2026-09-06',
        endDate: '2026-09-06',
        travelerIds: [],
        accountingCurrency: 'EUR',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      days: [],
      stops: [],
      bookings: [],
      accommodations: [],
      travelers: [],
      budget: null,
      fxRates: [],
      runtimeState: null,
      stopLivedStates: [],
      memories: [],
      travelBook: null,
    },
    packingItems: [],
    pendingImportClaims: 2,
    travelDNA: {
      id: 'dna-1',
      pace: 'slow',
      interests: ['food'],
      travelStyle: 'local',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  });

  assert.equal(pack.packingTotal, 0);
  assert.equal(pack.packingPacked, 0);
  assert.equal(pack.pendingImportClaims, 2);
  assert.deepEqual(pack.destinationNames, [
    'Lisboa, Portugal',
  ]);
  assert.match(
    summarizeTripEvidencePack(pack),
    /Packing empty/,
  );
  assert.match(
    summarizeTripEvidencePack(pack),
    /2 pending import/,
  );
});
