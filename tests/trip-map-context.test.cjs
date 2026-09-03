const assert = require('node:assert/strict');
const test = require('node:test');

const {
  mappedStopCoordinate,
  selectTripMapFrame,
  systemDirectionsUrl,
} = require('../.test-build/src/services/trip-map-context.js');

const TIMESTAMP = '2026-09-03T08:00:00.000Z';

function makeWorkspace(overrides = {}) {
  const trip = {
    id: 'trip-map',
    title: 'Lisbon and Porto',
    status: 'planned',
    destinations: [
      {
        id: 'destination-lisbon',
        name: 'Lisbon',
        latitude: 38.7223,
        longitude: -9.1393,
      },
      {
        id: 'destination-porto',
        name: 'Porto',
        latitude: 41.1579,
        longitude: -8.6291,
      },
    ],
    startDate: '2026-09-03',
    endDate: '2026-09-05',
    travelerIds: [],
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
      id: 'stop-belem',
      tripId: trip.id,
      dayId: 'day-1',
      title: 'Belem',
      type: 'place',
      order: 1,
      location: {
        name: 'Belem',
        latitude: 38.6976,
        longitude: -9.2067,
      },
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'stop-porto',
      tripId: trip.id,
      dayId: 'day-2',
      title: 'Ribeira',
      type: 'place',
      order: 1,
      location: {
        name: 'Ribeira',
        latitude: 41.1406,
        longitude: -8.6111,
      },
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'stop-notes',
      tripId: trip.id,
      dayId: 'day-1',
      title: 'Untimed note',
      type: 'other',
      order: 2,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
  ];

  return {
    trip,
    days,
    stops,
    bookings: [],
    accommodations: [
      {
        id: 'stay-1',
        tripId: trip.id,
        name: 'Invented stay pin',
        type: 'hotel',
        latitude: 1,
        longitude: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    travelers: [],
    budget: null,
    fxRates: [],
    runtimeState: null,
    stopLivedStates: [],
    memories: [],
    travelBook: null,
    ...overrides,
  };
}

test('day framing uses the assigned city and that day’s mapped stops, not destination order', () => {
  const workspace = makeWorkspace();
  const frame = selectTripMapFrame(workspace, {
    displayDay: workspace.days[0],
    mode: 'active',
  });

  assert.equal(frame.kind, 'display-day');
  assert.equal(frame.title, 'Lisbon');
  assert.equal(frame.eyebrow, "TODAY'S MAP");
  assert.deepEqual(
    frame.coordinates.map(
      (coordinate) => `${coordinate.latitude},${coordinate.longitude}`,
    ),
    ['38.7223,-9.1393', '38.6976,-9.2067'],
  );
});

test('an unassigned day does not borrow another city’s coordinates', () => {
  const workspace = makeWorkspace();
  const frame = selectTripMapFrame(workspace, {
    displayDay: workspace.days[1],
    mode: 'active',
  });

  assert.equal(frame.kind, 'display-day');
  assert.equal(frame.title, "Today's places");
  assert.deepEqual(frame.coordinates, [
    { latitude: 41.1406, longitude: -8.6111 },
  ]);
});

test('a day without mapped facts falls back to every saved coordinate', () => {
  const workspace = makeWorkspace({
    stops: [
      {
        id: 'stop-notes',
        tripId: 'trip-map',
        dayId: 'day-1',
        title: 'Untimed note',
        type: 'other',
        order: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    days: [
      {
        id: 'day-1',
        tripId: 'trip-map',
        date: '2026-09-03',
        dayNumber: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
  });
  const frame = selectTripMapFrame(workspace, {
    displayDay: workspace.days[0],
    mode: 'active',
  });

  assert.equal(frame.kind, 'all-mapped');
  assert.equal(frame.title, 'Lisbon · Porto');
  assert.equal(frame.coordinates.length, 2);
});

test('view-all framing keeps every mapped destination and stop and ignores stays', () => {
  const workspace = makeWorkspace();
  const frame = selectTripMapFrame(workspace, {
    displayDay: workspace.days[0],
    viewAll: true,
    mode: 'active',
  });

  assert.equal(frame.kind, 'all-mapped');
  assert.equal(frame.coordinates.length, 4);
  assert.ok(
    !frame.coordinates.some(
      (coordinate) =>
        coordinate.latitude === 1 && coordinate.longitude === 1,
    ),
  );
});

test('mapped stop coordinates stay unknown without a real pair', () => {
  assert.equal(
    mappedStopCoordinate({
      id: 'stop-1',
      tripId: 'trip-1',
      dayId: 'day-1',
      title: 'Note',
      type: 'other',
      order: 1,
      location: { name: 'Somewhere', latitude: 38.7 },
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    }),
    null,
  );
});

test('system directions URLs pin saved coordinates and do not invent a route', () => {
  const coordinate = { latitude: 38.6976, longitude: -9.2067 };

  assert.equal(
    systemDirectionsUrl(coordinate, 'Belem', 'ios'),
    'https://maps.apple.com/?ll=38.6976,-9.2067&q=Belem',
  );
  assert.equal(
    systemDirectionsUrl(coordinate, 'Belem', 'android'),
    'https://www.google.com/maps/search/?api=1&query=38.6976%2C-9.2067',
  );
  assert.equal(
    systemDirectionsUrl(coordinate, 'Belem', 'web'),
    null,
  );
  assert.equal(
    systemDirectionsUrl(
      { latitude: 91, longitude: 0 },
      'Invalid',
      'android',
    ),
    null,
  );
});
