const assert = require('node:assert/strict');
const test = require('node:test');

const {
  selectTripReadiness,
} = require('../.test-build/src/services/trip-readiness.js');

const TIMESTAMP = '2026-08-23T12:00:00.000Z';

function workspace(overrides = {}) {
  const trip = {
    id: 'trip-ready',
    title: 'Lisbon',
    status: 'planned',
    destinations: [],
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    travelerIds: ['traveler-1'],
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
      {
        id: 'day-3',
        tripId: trip.id,
        date: '2026-09-03',
        dayNumber: 3,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    stops: [
      {
        id: 'stop-1',
        tripId: trip.id,
        dayId: 'day-1',
        title: 'Arrival',
        type: 'transport',
        order: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'stop-2',
        tripId: trip.id,
        dayId: 'day-3',
        title: 'Dinner',
        type: 'food',
        order: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    bookings: [
      {
        id: 'booking-1',
        tripId: trip.id,
        type: 'flight',
        status: 'confirmed',
        title: 'Flight',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'booking-2',
        tripId: trip.id,
        type: 'activity',
        status: 'cancelled',
        title: 'Cancelled',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    accommodations: [
      {
        id: 'stay-1',
        tripId: trip.id,
        name: 'Hotel',
        type: 'hotel',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    travelers: [
      {
        id: 'traveler-1',
        firstName: 'Mina',
        type: 'adult',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    budget: {
      id: 'budget-1',
      tripId: trip.id,
      currencyCode: 'EUR',
      plannedAmount: 0,
      items: [],
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    runtimeState: null,
    memories: [],
    travelBook: null,
    ...overrides,
  };
}

test('trip readiness derives automatic truth from the workspace', () => {
  const result = selectTripReadiness(workspace());

  assert.deepEqual(result.readiness, {
    accommodationCount: 1,
    bookingCount: 1,
    populatedDayCount: 2,
    totalDayCount: 3,
    travelerCount: 1,
    budgetConfigured: true,
  });
});

test('trip readiness ignores non-canonical and cross-trip itinerary data', () => {
  const value = workspace();

  value.days.push(
    {
      id: 'outside',
      tripId: value.trip.id,
      date: '2026-10-01',
      dayNumber: 4,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'other-day',
      tripId: 'trip-other',
      date: '2026-09-02',
      dayNumber: 2,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  );

  value.stops.push(
    {
      id: 'outside-stop',
      tripId: value.trip.id,
      dayId: 'outside',
      title: 'Outside',
      type: 'place',
      order: 1,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'other-stop',
      tripId: 'trip-other',
      dayId: 'day-2',
      title: 'Other',
      type: 'place',
      order: 1,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  );

  value.bookings.push({
    id: 'booking-other',
    tripId: 'trip-other',
    type: 'activity',
    status: 'confirmed',
    title: 'Other trip booking',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  value.accommodations.push({
    id: 'stay-other',
    tripId: 'trip-other',
    name: 'Other trip hotel',
    type: 'hotel',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  const result = selectTripReadiness(value);

  assert.deepEqual(
    result.canonicalDays.map((day) => day.id),
    ['day-1', 'day-2', 'day-3'],
  );
  assert.equal(result.readiness.populatedDayCount, 2);
  assert.equal(result.readiness.bookingCount, 1);
  assert.equal(result.readiness.accommodationCount, 1);
});

test('trip readiness builds an explicit checklist and percent from countable facts', () => {
  const result = selectTripReadiness(workspace());

  assert.equal(result.totalCheckCount, 5);
  assert.equal(result.readyCount, 4);
  assert.equal(result.percentReady, 80);
  assert.equal(
    result.checklist.some(
      (item) => item.id === 'plan' && item.ready === false,
    ),
    true,
  );
  assert.equal(
    result.checklist.every((item) =>
      [
        'plan',
        'accommodation',
        'bookings',
        'travelers',
        'budget',
      ].includes(item.id),
    ),
    true,
  );
});

test('trip readiness stays explicit when preparation data is absent', () => {
  const result = selectTripReadiness(
    workspace({
      stops: [],
      bookings: [],
      accommodations: [],
      travelers: [],
      budget: null,
    }),
  );

  assert.deepEqual(result.readiness, {
    accommodationCount: 0,
    bookingCount: 0,
    populatedDayCount: 0,
    totalDayCount: 3,
    travelerCount: 0,
    budgetConfigured: false,
  });
});
