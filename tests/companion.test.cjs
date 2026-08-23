const assert = require('node:assert/strict');
const test = require('node:test');

const {
  selectCompanion,
} = require('../.test-build/src/services/companion.js');
const {
  millisecondsUntilNextCalendarDateChange,
} = require('../.test-build/src/services/companion-refresh.js');
const {
  resolveTripTimeZone,
} = require('../.test-build/src/services/time-truth.js');

const TIMESTAMP = '2026-08-23T12:00:00.000Z';

function fixedClock(instant, deviceTimeZone = 'Europe/Athens') {
  const value = new Date(instant);

  return {
    now: () => new Date(value.getTime()),
    deviceTimeZone: () => deviceTimeZone,
  };
}

function makeWorkspace(overrides = {}) {
  const trip = {
    id: 'trip-companion',
    title: 'Tokyo field notes',
    status: 'planned',
    destinations: [
      {
        id: 'destination-tokyo',
        name: 'Tokyo',
        timezone: 'Asia/Tokyo',
      },
    ],
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    travelerIds: ['traveler-1'],
    accountingCurrency: 'EUR',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
  const days = [1, 2, 3].map((dayNumber) => ({
    id: `day-${dayNumber}`,
    tripId: trip.id,
    date: `2026-09-0${dayNumber}`,
    dayNumber,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  }));
  const stops = [
    {
      id: 'stop-breakfast',
      tripId: trip.id,
      dayId: 'day-2',
      title: 'Breakfast counter',
      type: 'food',
      order: 1,
      startTime: '09:00',
      endTime: '10:00',
      location: {
        name: 'Tsukiji',
        latitude: 35.6655,
        longitude: 139.7708,
      },
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'stop-museum',
      tripId: trip.id,
      dayId: 'day-2',
      title: 'Design museum',
      type: 'activity',
      order: 2,
      startTime: '12:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'stop-walk',
      tripId: trip.id,
      dayId: 'day-2',
      title: 'Neighborhood walk',
      type: 'place',
      order: 3,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'stop-arrival',
      tripId: trip.id,
      dayId: 'day-1',
      title: 'Arrival',
      type: 'transport',
      order: 1,
      startTime: '15:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'stop-departure',
      tripId: trip.id,
      dayId: 'day-3',
      title: 'Departure',
      type: 'transport',
      order: 1,
      startTime: '11:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];
  const bookings = [
    {
      id: 'booking-museum',
      tripId: trip.id,
      stopId: 'stop-museum',
      type: 'ticket',
      status: 'confirmed',
      title: 'Museum ticket',
      provider: 'Design Center',
      confirmationCode: 'PRIVATE-CODE',
      isPaid: true,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'booking-flight',
      tripId: trip.id,
      type: 'flight',
      status: 'confirmed',
      title: 'Flight to Tokyo',
      provider: 'Example Air',
      startAt: '2026-09-01T08:00:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];
  const accommodations = [
    {
      id: 'stay-tokyo',
      tripId: trip.id,
      name: 'Tokyo Hotel',
      type: 'hotel',
      checkInAt: '2026-09-01T15:00:00',
      checkOutAt: '2026-09-03T10:00:00',
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
    budget: {
      id: 'budget-1',
      tripId: trip.id,
      currencyCode: 'EUR',
      plannedAmount: 1200,
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

test('upcoming Companion derives countdown, first-day preview and readiness from saved truth', () => {
  const result = selectCompanion(
    makeWorkspace(),
    fixedClock('2026-08-27T15:00:00.000Z'),
  );

  assert.equal(result.mode, 'upcoming');
  assert.equal(result.countdownDays, 4);
  assert.equal(result.displayDay.id, 'day-1');
  assert.deepEqual(
    result.stopContexts.map((context) => context.stop.id),
    ['stop-arrival'],
  );
  assert.equal(result.nextAccommodation.id, 'stay-tokyo');
  assert.deepEqual(
    result.relevantUnlinkedBookings.map((booking) => booking.id),
    ['booking-flight'],
  );
  assert.deepEqual(result.readiness, {
    accommodationCount: 1,
    bookingCount: 2,
    populatedDayCount: 3,
    totalDayCount: 3,
    travelerCount: 1,
    budgetConfigured: true,
  });
});

test('active Companion selects the exact day, Day X of N, linked truth and a current ranged stop', () => {
  const result = selectCompanion(
    makeWorkspace(),
    fixedClock('2026-09-02T00:30:00.000Z'),
  );

  assert.equal(result.mode, 'active');
  assert.equal(result.displayDay.id, 'day-2');
  assert.equal(result.dayIndex, 2);
  assert.equal(result.totalDays, 3);
  assert.equal(result.localTime, '09:30');
  assert.equal(result.currentStop.stop.id, 'stop-breakfast');
  assert.equal(result.nextStop.stop.id, 'stop-museum');
  assert.deepEqual(
    result.nextStop.bookings.map((booking) => booking.id),
    ['booking-museum'],
  );
  assert.equal(result.currentAccommodation.id, 'stay-tokyo');
  assert.deepEqual(
    result.relevantAccommodations.map((context) => context.phase),
    ['stay'],
  );
});

test('timed relevance is deterministic before, between and after saved stop times', () => {
  const workspace = makeWorkspace();
  const before = selectCompanion(
    workspace,
    fixedClock('2026-09-01T22:00:00.000Z'),
  );
  assert.equal(before.currentStop, null);
  assert.equal(before.nextStop.stop.id, 'stop-breakfast');
  assert.deepEqual(before.previousStops, []);

  const between = selectCompanion(
    workspace,
    fixedClock('2026-09-02T01:30:00.000Z'),
  );
  assert.equal(between.currentStop, null);
  assert.deepEqual(
    between.previousStops.map((context) => context.stop.id),
    ['stop-breakfast'],
  );
  assert.equal(between.nextStop.stop.id, 'stop-museum');
  assert.deepEqual(
    between.untimedStops.map((context) => context.stop.id),
    ['stop-walk'],
  );

  const after = selectCompanion(
    workspace,
    fixedClock('2026-09-02T09:00:00.000Z'),
  );
  assert.equal(after.currentStop, null);
  assert.equal(after.nextStop, null);
  assert.deepEqual(
    after.previousStops.map((context) => context.stop.id),
    ['stop-breakfast', 'stop-museum'],
  );
  assert.equal(after.remainingStops.length, 0);
  assert.deepEqual(
    after.untimedStops.map((context) => context.stop.id),
    ['stop-walk'],
  );
});

test('untimed and mixed itineraries never invent a current stop', () => {
  const workspace = makeWorkspace();
  workspace.stops = workspace.stops.map((stop) =>
    stop.dayId === 'day-2'
      ? { ...stop, startTime: undefined, endTime: undefined }
      : stop,
  );
  const result = selectCompanion(
    workspace,
    fixedClock('2026-09-02T01:30:00.000Z'),
  );

  assert.equal(result.currentStop, null);
  assert.equal(result.nextStop, null);
  assert.equal(result.untimedStops.length, 3);
  assert.deepEqual(
    result.stopContexts.map((context) => context.stop.id),
    ['stop-breakfast', 'stop-museum', 'stop-walk'],
  );
});

test('missing and ambiguous timezone truth degrades to ordered itinerary context', () => {
  const missing = makeWorkspace();
  missing.trip = {
    ...missing.trip,
    destinations: [{ id: 'tokyo', name: 'Tokyo' }],
  };
  missing.bookings = [
    ...missing.bookings,
    {
      id: 'booking-unlinked-today',
      tripId: missing.trip.id,
      type: 'activity',
      status: 'confirmed',
      title: 'Unlinked local booking',
      startAt: '2026-09-02T10:00:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];
  const missingResult = selectCompanion(
    missing,
    fixedClock('2026-09-02T08:00:00.000Z', 'UTC'),
  );
  assert.equal(missingResult.timingReliable, false);
  assert.equal(missingResult.currentStop, null);
  assert.equal(missingResult.nextStop, null);
  assert.deepEqual(missingResult.relevantUnlinkedBookings, []);
  assert.ok(
    missingResult.stopContexts.every(
      (context) => context.phase === 'ordered',
    ),
  );

  const ambiguous = makeWorkspace();
  ambiguous.trip = {
    ...ambiguous.trip,
    destinations: [
      { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo' },
      { id: 'paris', name: 'Paris', timezone: 'Europe/Paris' },
    ],
  };
  const ambiguousResult = selectCompanion(
    ambiguous,
    fixedClock('2026-09-02T08:00:00.000Z', 'UTC'),
  );
  assert.equal(ambiguousResult.timingReliable, false);
  assert.equal(
    ambiguousResult.runtime.timeZone.reason,
    'ambiguous-destination-timezones',
  );
});

test('missing current TripDay and an incomplete trip stay explicit and safe', () => {
  const workspace = makeWorkspace();
  workspace.days = workspace.days.filter((day) => day.id !== 'day-2');
  const missingDay = selectCompanion(
    workspace,
    fixedClock('2026-09-02T01:30:00.000Z'),
  );
  assert.equal(missingDay.mode, 'active');
  assert.equal(missingDay.displayDay, null);
  assert.deepEqual(missingDay.stopContexts, []);

  const incomplete = makeWorkspace({
    stops: [],
    bookings: [],
    accommodations: [],
    travelers: [],
    budget: null,
  });
  incomplete.trip = { ...incomplete.trip, destinations: [] };
  const result = selectCompanion(
    incomplete,
    fixedClock('2026-08-27T15:00:00.000Z', 'UTC'),
  );
  assert.equal(result.mode, 'upcoming');
  assert.equal(result.stopContexts.length, 0);
  assert.equal(result.nextAccommodation, null);
  assert.deepEqual(result.readiness, {
    accommodationCount: 0,
    bookingCount: 0,
    populatedDayCount: 0,
    totalDayCount: 3,
    travelerCount: 0,
    budgetConfigured: false,
  });
});

test('completed Companion uses final-day history and never emits live selections', () => {
  const result = selectCompanion(
    makeWorkspace(),
    fixedClock('2026-09-04T03:00:00.000Z'),
  );

  assert.equal(result.mode, 'completed');
  assert.equal(result.displayDay.id, 'day-3');
  assert.equal(result.currentStop, null);
  assert.equal(result.nextStop, null);
  assert.ok(
    result.stopContexts.every(
      (context) => context.phase === 'history',
    ),
  );
  assert.deepEqual(result.summary, {
    dayCount: 3,
    stopCount: 5,
    bookingCount: 2,
    accommodationCount: 1,
    travelerCount: 1,
  });
});

test('legacy absolute accommodation values are preserved but not treated as local current-stay truth', () => {
  const workspace = makeWorkspace();
  workspace.accommodations = [
    {
      ...workspace.accommodations[0],
      checkInAt: '2026-09-01T15:00:00.000Z',
      checkOutAt: '2026-09-03T10:00:00.000Z',
    },
  ];
  const result = selectCompanion(
    workspace,
    fixedClock('2026-09-02T00:30:00.000Z'),
  );

  assert.equal(result.currentAccommodation, null);
  assert.deepEqual(result.relevantAccommodations, []);
});

test('calendar-boundary scheduling targets the next resolved local midnight without polling', () => {
  const tokyo = resolveTripTimeZone(
    [{ id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo' }],
    'UTC',
  );
  const delay = millisecondsUntilNextCalendarDateChange(
    new Date('2026-09-02T14:59:30.000Z'),
    tokyo,
  );

  assert.ok(delay >= 30_000);
  assert.ok(delay < 31_000);

  const athens = resolveTripTimeZone(
    [{ id: 'athens', name: 'Athens' }],
    'Europe/Athens',
  );
  assert.ok(
    millisecondsUntilNextCalendarDateChange(
      new Date('2026-10-24T20:00:00.000Z'),
      athens,
    ) > 0,
  );
});
