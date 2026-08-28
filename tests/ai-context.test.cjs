const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildAIContextSnapshot,
} = require('../.test-build/src/services/ai-context.js');

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
    id: 'trip-ai-context',
    title: 'Tokyo food and design',
    status: 'planned',
    intent: 'food',
    pace: 'balanced',
    destinations: [
      {
        id: 'destination-tokyo',
        name: 'Tokyo',
        countryCode: 'JP',
        timezone: 'Asia/Tokyo',
        currencyCode: 'JPY',
      },
    ],
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    travelerIds: ['traveler-1', 'traveler-2'],
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
      title: 'Breakfast',
      type: 'food',
      order: 1,
      startTime: '09:00',
      endTime: '10:00',
      location: {
        name: 'Tsukiji',
        address: 'Tokyo, Japan',
        latitude: 35.6655,
        longitude: 139.7708,
        placeId: 'safe-place-id',
      },
      notes: 'PRIVATE STOP NOTE',
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
      startTime: '11:30',
      endTime: '13:00',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'stop-lunch',
      tripId: trip.id,
      dayId: 'day-2',
      title: 'Lunch',
      type: 'food',
      order: 3,
      startTime: '12:30',
      endTime: '14:00',
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
      startAt: '2026-09-02T11:30:00',
      endAt: '2026-09-02T13:00:00',
      amount: 25,
      currencyCode: 'EUR',
      isPaid: true,
      notes: 'PRIVATE BOOKING NOTE',
      externalUrl: 'https://private.example/booking',
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
      address: 'Tokyo, Japan',
      latitude: 35.68,
      longitude: 139.76,
      checkInAt: '2026-09-01T15:00:00',
      checkOutAt: '2026-09-03T10:00:00',
      phone: '+81-PRIVATE',
      website: 'https://hotel.example',
      notes: 'PRIVATE ACCOMMODATION NOTE',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];

  const travelers = [
    {
      id: 'traveler-1',
      firstName: 'Mina',
      lastName: 'Private',
      type: 'adult',
      email: 'mina@example.com',
      phone: '+30-PRIVATE',
      avatarUri: 'file:///private/avatar.jpg',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'traveler-2',
      firstName: 'Leo',
      type: 'child',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];

  const budget = {
    id: 'budget-1',
    tripId: trip.id,
    currencyCode: 'EUR',
    plannedAmount: 1200,
    items: [
      {
        id: 'budget-item-eur',
        budgetId: 'budget-1',
        tripId: trip.id,
        title: 'Museum',
        category: 'activities',
        status: 'paid',
        amount: 25,
        currencyCode: 'EUR',
        notes: 'PRIVATE BUDGET NOTE',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'budget-item-jpy',
        budgetId: 'budget-1',
        tripId: trip.id,
        title: 'Cash allowance',
        category: 'other',
        status: 'planned',
        amount: 10000,
        currencyCode: 'JPY',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };

  return {
    trip,
    days,
    stops,
    bookings,
    accommodations,
    travelers,
    budget,
    runtimeState: null,
    memories: [],
    travelBook: null,
    ...overrides,
  };
}

function makeTravelDNA() {
  return {
    id: 'travel-dna-local',
    pace: 'slow',
    interests: ['food', 'culture'],
    travelStyle: 'local',
    budgetStyle: 'comfortable',
    dailyRhythm: 'morning',
    typicalParty: 'family',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

test('AI context combines explicit trip, Travel DNA, itinerary flexibility and runtime truth', () => {
  const context = buildAIContextSnapshot(
    makeWorkspace(),
    makeTravelDNA(),
    fixedClock('2026-09-02T01:00:00.000Z'),
  );

  assert.equal(context.version, 1);

  assert.deepEqual(context.trip.intent, 'food');
  assert.deepEqual(context.trip.pace, 'balanced');
  assert.equal(context.trip.accountingCurrency, 'EUR');
  assert.equal(context.trip.destinations[0].currencyCode, 'JPY');

  assert.deepEqual(context.travelDNA, {
    pace: 'slow',
    interests: ['food', 'culture'],
    travelStyle: 'local',
    budgetStyle: 'comfortable',
    dailyRhythm: 'morning',
    typicalParty: 'family',
  });

  assert.deepEqual(context.travelers, {
    total: 2,
    adults: 1,
    children: 1,
    infants: 0,
  });

  const dayTwo = context.itinerary.find(
    (day) => day.id === 'day-2',
  );

  assert.ok(dayTwo);
  assert.deepEqual(
    dayTwo.freeTime.map((gap) => ({
      startTime: gap.startTime,
      endTime: gap.endTime,
      durationMinutes: gap.durationMinutes,
    })),
    [
      {
        startTime: '10:00',
        endTime: '11:30',
        durationMinutes: 90,
      },
    ],
  );

  assert.deepEqual(
    dayTwo.timeConflicts.map((conflict) => ({
      firstStopId: conflict.firstStopId,
      secondStopId: conflict.secondStopId,
      startTime: conflict.startTime,
      endTime: conflict.endTime,
      durationMinutes: conflict.durationMinutes,
    })),
    [
      {
        firstStopId: 'stop-museum',
        secondStopId: 'stop-lunch',
        startTime: '12:30',
        endTime: '13:00',
        durationMinutes: 30,
      },
    ],
  );

  assert.equal(context.runtime.mode, 'active');
  assert.equal(context.runtime.displayDayId, 'day-2');
  assert.equal(context.runtime.localTime, '10:00');
  assert.equal(context.runtime.timingReliable, true);
  assert.equal(context.runtime.currentStopId, null);
  assert.equal(context.runtime.nextStopId, 'stop-museum');
});

test('general AI context excludes sensitive and free-form fields by default', () => {
  const context = buildAIContextSnapshot(
    makeWorkspace(),
    makeTravelDNA(),
    fixedClock('2026-09-02T01:00:00.000Z'),
  );

  const serialized = JSON.stringify(context);

  assert.equal(serialized.includes('PRIVATE-CODE'), false);
  assert.equal(serialized.includes('PRIVATE BOOKING NOTE'), false);
  assert.equal(serialized.includes('private.example'), false);
  assert.equal(serialized.includes('PRIVATE STOP NOTE'), false);
  assert.equal(serialized.includes('PRIVATE ACCOMMODATION NOTE'), false);
  assert.equal(serialized.includes('+81-PRIVATE'), false);
  assert.equal(serialized.includes('hotel.example'), false);
  assert.equal(serialized.includes('mina@example.com'), false);
  assert.equal(serialized.includes('+30-PRIVATE'), false);
  assert.equal(serialized.includes('private/avatar.jpg'), false);
  assert.equal(serialized.includes('PRIVATE BUDGET NOTE'), false);

  assert.deepEqual(
    Object.keys(context.travelers).sort(),
    ['adults', 'children', 'infants', 'total'],
  );

  assert.deepEqual(
    Object.keys(context.bookings[0]).sort(),
    [
      'amount',
      'currencyCode',
      'endAt',
      'id',
      'isPaid',
      'provider',
      'startAt',
      'status',
      'stopId',
      'title',
      'type',
    ].sort(),
  );
});

test('AI context keeps currencies explicit and never converts or merges them', () => {
  const context = buildAIContextSnapshot(
    makeWorkspace(),
    makeTravelDNA(),
    fixedClock('2026-09-02T01:00:00.000Z'),
  );

  assert.equal(context.trip.accountingCurrency, 'EUR');
  assert.equal(context.trip.destinations[0].currencyCode, 'JPY');
  assert.equal(context.budget.currencyCode, 'EUR');

  assert.deepEqual(
    context.budget.itemTotalsByCurrency,
    [
      {
        currencyCode: 'EUR',
        plannedItemsAmount: 0,
        committedItemsAmount: 0,
        paidItemsAmount: 25,
      },
      {
        currencyCode: 'JPY',
        plannedItemsAmount: 10000,
        committedItemsAmount: 0,
        paidItemsAmount: 0,
      },
    ],
  );
});

test('missing Travel DNA and optional trip preferences stay missing instead of being inferred', () => {
  const workspace = makeWorkspace();
  workspace.trip = {
    ...workspace.trip,
    intent: undefined,
    pace: undefined,
  };

  const context = buildAIContextSnapshot(
    workspace,
    null,
    fixedClock('2026-09-02T01:00:00.000Z'),
  );

  assert.equal(context.travelDNA, null);
  assert.equal(context.trip.intent, undefined);
  assert.equal(context.trip.pace, undefined);
});
