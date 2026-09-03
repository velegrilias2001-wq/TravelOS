const assert = require('node:assert/strict');
const test = require('node:test');

const {
  companionPlanSnapshot,
  describeCompanionPlanChange,
} = require('../.test-build/src/services/companion-itinerary-change.js');

const TIMESTAMP = '2026-09-03T08:00:00.000Z';

function makeWorkspace(overrides = {}) {
  const trip = {
    id: 'trip-plan-change',
    title: 'Lisbon field notes',
    status: 'planned',
    destinations: [
      {
        id: 'destination-lisbon',
        name: 'Lisbon',
        timezone: 'Europe/Lisbon',
      },
    ],
    startDate: '2026-09-03',
    endDate: '2026-09-05',
    travelerIds: ['traveler-1'],
    accountingCurrency: 'EUR',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
  const days = [
    {
      id: 'day-1',
      tripId: trip.id,
      date: '2026-09-03',
      dayNumber: 1,
      destinationId: 'destination-lisbon',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'day-2',
      tripId: trip.id,
      date: '2026-09-04',
      dayNumber: 2,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];
  const stops = [
    {
      id: 'stop-breakfast',
      tripId: trip.id,
      dayId: 'day-1',
      title: 'Breakfast',
      type: 'food',
      order: 1,
      startTime: '09:00',
      endTime: '10:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'stop-walk',
      tripId: trip.id,
      dayId: 'day-1',
      title: 'Neighborhood walk',
      type: 'place',
      order: 2,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];
  const bookings = [
    {
      id: 'booking-museum',
      tripId: trip.id,
      stopId: 'stop-walk',
      type: 'ticket',
      status: 'confirmed',
      title: 'Museum ticket',
      startAt: '2026-09-03T12:00:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];
  const accommodations = [
    {
      id: 'stay-lisbon',
      tripId: trip.id,
      name: 'Baixa Hotel',
      type: 'hotel',
      checkInAt: '2026-09-03T15:00:00',
      checkOutAt: '2026-09-05T10:00:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];

  return {
    trip,
    days,
    stops,
    bookings,
    accommodations,
    travelers: [
      {
        id: 'traveler-1',
        firstName: 'Mina',
        type: 'adult',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    budget: null,
    fxRates: [],
    runtimeState: null,
    stopLivedStates: [],
    memories: [],
    travelBook: null,
    ...overrides,
  };
}

test('first Companion load does not claim a plan change', () => {
  const snapshot = companionPlanSnapshot(makeWorkspace());

  assert.equal(
    describeCompanionPlanChange(null, snapshot),
    null,
  );
});

test('a different trip is treated as a fresh Companion load', () => {
  const previous = companionPlanSnapshot(makeWorkspace());
  const next = companionPlanSnapshot(
    makeWorkspace({
      trip: {
        ...makeWorkspace().trip,
        id: 'trip-other',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
      },
    }),
  );

  assert.equal(
    describeCompanionPlanChange(previous, next),
    null,
  );
});

test('lived skip or done does not look like a plan change', () => {
  const workspace = makeWorkspace();
  const previous = companionPlanSnapshot(workspace);
  const next = companionPlanSnapshot({
    ...workspace,
    stopLivedStates: [
      {
        tripId: workspace.trip.id,
        stopId: 'stop-breakfast',
        phase: 'done',
        recordedAt: TIMESTAMP,
      },
    ],
    runtimeState: {
      tripId: workspace.trip.id,
      isCompanionActive: true,
      currentStopId: 'stop-breakfast',
      currentDayId: 'day-1',
      updatedAt: TIMESTAMP,
    },
  });

  assert.equal(
    describeCompanionPlanChange(previous, next),
    null,
  );
});

test('a stop time change tells Companion to follow the saved itinerary', () => {
  const workspace = makeWorkspace();
  const previous = companionPlanSnapshot(workspace);
  const next = companionPlanSnapshot({
    ...workspace,
    stops: workspace.stops.map((stop) =>
      stop.id === 'stop-breakfast'
        ? { ...stop, startTime: '09:30' }
        : stop,
    ),
  });

  assert.deepEqual(describeCompanionPlanChange(previous, next), {
    kind: 'stops',
    body: 'The saved itinerary was updated. NOW and NEXT follow the plan, including any done or skipped marks.',
  });
});

test('a day city assignment change is named without inventing another city', () => {
  const workspace = makeWorkspace();
  const previous = companionPlanSnapshot(workspace);
  const next = companionPlanSnapshot({
    ...workspace,
    days: workspace.days.map((day) =>
      day.id === 'day-2'
        ? { ...day, destinationId: 'destination-lisbon' }
        : day,
    ),
  });

  assert.deepEqual(describeCompanionPlanChange(previous, next), {
    kind: 'day-assignment',
    body: 'A day\'s city assignment was updated. Companion follows the saved plan.',
  });
});

test('trip date edits are named separately from stop edits', () => {
  const workspace = makeWorkspace();
  const previous = companionPlanSnapshot(workspace);
  const next = companionPlanSnapshot({
    ...workspace,
    trip: {
      ...workspace.trip,
      endDate: '2026-09-06',
    },
  });

  assert.deepEqual(describeCompanionPlanChange(previous, next), {
    kind: 'dates',
    body: 'Trip dates were updated. Companion follows the saved dates, not a live override.',
  });
});

test('a booking time change does not rewrite stop times', () => {
  const workspace = makeWorkspace();
  const previous = companionPlanSnapshot(workspace);
  const nextWorkspace = {
    ...workspace,
    bookings: workspace.bookings.map((booking) => ({
      ...booking,
      startAt: '2026-09-03T13:00:00',
    })),
  };
  const next = companionPlanSnapshot(nextWorkspace);

  assert.deepEqual(describeCompanionPlanChange(previous, next), {
    kind: 'bookings',
    body: 'A booking was updated. Companion follows the saved reservation.',
  });
  assert.deepEqual(next.stops, previous.stops);
});

test('a stay check-in change is named as accommodation truth', () => {
  const workspace = makeWorkspace();
  const previous = companionPlanSnapshot(workspace);
  const next = companionPlanSnapshot({
    ...workspace,
    accommodations: workspace.accommodations.map((stay) => ({
      ...stay,
      checkInAt: '2026-09-03T16:00:00',
    })),
  });

  assert.deepEqual(describeCompanionPlanChange(previous, next), {
    kind: 'stays',
    body: 'A stay was updated. Companion follows the saved accommodation.',
  });
});

test('mixed plan edits collapse to one SQLite-authoritative notice', () => {
  const workspace = makeWorkspace();
  const previous = companionPlanSnapshot(workspace);
  const next = companionPlanSnapshot({
    ...workspace,
    trip: {
      ...workspace.trip,
      endDate: '2026-09-07',
    },
    stops: workspace.stops.filter(
      (stop) => stop.id !== 'stop-walk',
    ),
  });

  assert.deepEqual(describeCompanionPlanChange(previous, next), {
    kind: 'plan',
    body: 'The saved trip was updated. Companion follows SQLite, not a live override.',
  });
});

test('identical reloaded snapshots stay silent', () => {
  const workspace = makeWorkspace();
  const previous = companionPlanSnapshot(workspace);
  const next = companionPlanSnapshot({
    ...workspace,
    memories: [
      {
        id: 'memory-1',
        tripId: workspace.trip.id,
        type: 'note',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
  });

  assert.equal(
    describeCompanionPlanChange(previous, next),
    null,
  );
});
