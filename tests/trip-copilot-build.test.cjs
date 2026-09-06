const assert = require('node:assert/strict');
const test = require('node:test');

const {
  selectTripCopilotBuildQueue,
} = require('../.test-build/src/services/trip-copilot-build.js');
const {
  packingTemplateSuggestions,
  PACKING_TEMPLATE_SEEDS,
} = require('../.test-build/src/services/packing-templates.js');

test('build queue keeps readiness and packing first within limit 3', () => {
  const queue = selectTripCopilotBuildQueue(
    [
      {
        kind: 'free_time',
        id: 'ft',
        dayId: 'd1',
        dayDate: '2026-09-06',
        dayLabel: 'Day 1',
        gap: { kind: 'open_day' },
      },
      {
        kind: 'plan_assist',
        id: 'pa',
        dayId: 'd1',
        dayDate: '2026-09-06',
        dayLabel: 'Day 1',
        candidates: [],
      },
      {
        kind: 'packing',
        id: 'pack',
        title: 'Packing',
        body: 'empty',
        packingTotal: 0,
        packingPacked: 0,
      },
      {
        kind: 'readiness',
        id: 'ready',
        title: 'Stay',
        body: 'Add stay',
        route: '/trip/[tripId]/accommodation',
        actionLabel: 'Add',
      },
      {
        kind: 'import_review',
        id: 'imp',
        title: 'Import',
        body: '1 pending',
        pendingCount: 1,
      },
    ],
    3,
  );

  assert.equal(queue.length, 3);
  assert.equal(queue[0].kind, 'readiness');
  assert.equal(queue[1].kind, 'packing');
  assert.equal(queue[2].kind, 'plan_assist');
});

test('packing templates never invent titles outside curated seeds', () => {
  assert.deepEqual(
    packingTemplateSuggestions({ alreadyTitles: [] }),
    [...PACKING_TEMPLATE_SEEDS],
  );
  assert.deepEqual(
    packingTemplateSuggestions({
      alreadyTitles: ['Passport / ID', 'Phone charger'],
      limit: 2,
    }),
    ['Tickets & confirmations', 'Medications'],
  );
});
