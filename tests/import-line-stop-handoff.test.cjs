const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildImportLineStopHandoff,
} = require('../.test-build/src/services/import-line-stop-handoff.js');

function baseClaim(overrides = {}) {
  return {
    id: 'claim-line-1',
    batchId: 'batch-1',
    kind: 'itinerary_line',
    status: 'pending',
    title: 'Morning coffee at Central Market',
    confidence: 'medium',
    evidence: {
      fieldsPresent: ['title'],
    },
    createdAt: '2026-09-06T10:00:00.000Z',
    updatedAt: '2026-09-06T10:00:00.000Z',
    ...overrides,
  };
}

test('import line handoff prefills title and local wall times only', () => {
  const handoff = buildImportLineStopHandoff(
    baseClaim({
      startAt: '2026-09-12T09:30:00',
      endAt: '2026-09-12T10:15:00',
      locationText: ' Central Market ',
    }),
  );

  assert.equal(handoff.source, 'import_line');
  assert.equal(handoff.importClaimId, 'claim-line-1');
  assert.equal(
    handoff.importTitle,
    'Morning coffee at Central Market',
  );
  assert.equal(handoff.importStartTime, '09:30');
  assert.equal(handoff.importEndTime, '10:15');
  assert.equal(handoff.importDayDate, '2026-09-12');
  assert.equal(handoff.importLocationName, 'Central Market');
  assert.equal(handoff.importBatchId, 'batch-1');
});

test('import line handoff does not invent local time from absolute instants', () => {
  const handoff = buildImportLineStopHandoff(
    baseClaim({
      startAt: '2026-09-12T09:30:00Z',
      evidence: {
        fieldsPresent: ['title', 'startAt'],
        calendarDate: '2026-09-12',
      },
    }),
  );

  assert.equal(handoff.importStartTime, undefined);
  assert.equal(handoff.importDayDate, '2026-09-12');
});

test('import line handoff rejects non-line claims', () => {
  assert.throws(
    () =>
      buildImportLineStopHandoff(
        baseClaim({ kind: 'booking' }),
      ),
    /Only itinerary line claims/,
  );
});
