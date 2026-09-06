const assert = require('node:assert/strict');
const test = require('node:test');

const {
  selectTripCopilotProposals,
} = require('../.test-build/src/services/trip-copilot.js');

const TIMESTAMP = '2026-09-06T12:00:00.000Z';

function workspace(overrides = {}) {
  const trip = {
    id: 'trip-copilot',
    title: 'Lisbon',
    status: 'planned',
    destinations: [],
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    travelerIds: [],
    accountingCurrency: 'EUR',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };

  return {
    trip,
    days: [
      {
        id: 'day-1',
        tripId: trip.id,
        date: '2026-09-01',
        dayNumber: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'day-2',
        tripId: trip.id,
        date: '2026-09-02',
        dayNumber: 2,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
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
    ...overrides,
    trip: {
      ...trip,
      ...(overrides.trip ?? {}),
    },
  };
}

test('trip copilot proposes readiness and plan assist without inventing writes', () => {
  const proposals = selectTripCopilotProposals(workspace());

  assert.ok(
    proposals.some(
      (item) =>
        item.kind === 'readiness' && item.id === 'readiness:plan',
    ),
  );
  assert.ok(
    proposals.some((item) => item.kind === 'plan_assist'),
  );
  assert.ok(
    !proposals.some((item) => item.kind === 'free_time'),
  );
});

test('trip copilot free-time proposals require verified timed gaps', () => {
  const proposals = selectTripCopilotProposals(
    workspace({
      stops: [
        {
          id: 'stop-a',
          tripId: 'trip-copilot',
          dayId: 'day-1',
          title: 'Coffee',
          type: 'food',
          order: 1,
          startTime: '09:00',
          endTime: '10:00',
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
        {
          id: 'stop-b',
          tripId: 'trip-copilot',
          dayId: 'day-1',
          title: 'Lunch',
          type: 'food',
          order: 2,
          startTime: '13:00',
          endTime: '14:00',
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
      days: [
        {
          id: 'day-1',
          tripId: 'trip-copilot',
          date: '2026-09-01',
          dayNumber: 1,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
      trip: {
        id: 'trip-copilot',
        title: 'Lisbon',
        status: 'planned',
        destinations: [],
        startDate: '2026-09-01',
        endDate: '2026-09-01',
        travelerIds: [],
        accountingCurrency: 'EUR',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    }),
  );

  const freeTime = proposals.filter(
    (item) => item.kind === 'free_time',
  );

  assert.equal(freeTime.length, 1);
  assert.equal(freeTime[0].gap.startTime, '10:00');
  assert.equal(freeTime[0].gap.endTime, '13:00');
});

test('trip copilot import proposal only appears with pending claims', () => {
  const without = selectTripCopilotProposals(workspace());
  assert.ok(
    !without.some((item) => item.kind === 'import_review'),
  );

  const withPending = selectTripCopilotProposals(workspace(), {
    pendingImportClaimCount: 2,
  });

  const importProposal = withPending.find(
    (item) => item.kind === 'import_review',
  );

  assert.ok(importProposal);
  assert.equal(importProposal.pendingCount, 2);
});
