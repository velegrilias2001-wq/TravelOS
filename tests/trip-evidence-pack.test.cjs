const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTripEvidencePack,
  summarizeTripEvidencePack,
} = require('../.test-build/src/services/trip-evidence-pack.js');
const {
  strings,
} = require('../.test-build/src/i18n/index.js');

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
    new RegExp(strings.evidence.packingEmpty),
  );
  assert.match(
    summarizeTripEvidencePack(pack),
    new RegExp(strings.evidence.pendingClaims(2)),
  );
});

test('the Copilot facts summary shows travel dates as readable text, not ISO keys', () => {
  const pack = {
    title: 'Lisboa',
    startDate: '2026-09-20',
    endDate: '2026-09-24',
    destinationNames: ['Lisboa, Portugal'],
    readinessPercent: 40,
    readinessGaps: ['plan'],
    packingTotal: 0,
    packingPacked: 0,
    pendingImportClaims: 0,
  };

  const summary = summarizeTripEvidencePack(pack);

  assert.doesNotMatch(summary, /\d{4}-\d{2}-\d{2}/);
  assert.match(summary, /Lisboa · .*2026.* → .*2026/);
});

test('an unreadable stored date is flagged instead of printed as a key', () => {
  const summary = summarizeTripEvidencePack({
    title: 'Lisboa',
    startDate: 'not-a-date',
    endDate: '2026-09-24',
    destinationNames: [],
    readinessPercent: null,
    readinessGaps: [],
    packingTotal: 0,
    packingPacked: 0,
    pendingImportClaims: 0,
  });

  assert.match(summary, /Saved date needs review/);
  assert.doesNotMatch(summary, /not-a-date/);
});
