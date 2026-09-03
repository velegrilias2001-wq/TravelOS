const assert = require('node:assert/strict');
const test = require('node:test');

const {
  collectOfflineTripFacts,
  resolveNetworkReachability,
  selectOfflineTripNotice,
} = require('../.test-build/src/services/offline-trip-context.js');

const TIMESTAMP = '2026-09-03T08:00:00.000Z';

function makeWorkspace(overrides = {}) {
  const trip = {
    id: 'trip-offline',
    title: 'Lisbon field notes',
    status: 'planned',
    destinations: [
      {
        id: 'destination-lisbon',
        name: 'Lisbon',
        latitude: 38.7223,
        longitude: -9.1393,
      },
    ],
    startDate: '2026-09-03',
    endDate: '2026-09-05',
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
        date: '2026-09-03',
        dayNumber: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    stops: [
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
        id: 'stop-notes',
        tripId: trip.id,
        dayId: 'day-1',
        title: 'Cafe notes',
        type: 'food',
        order: 2,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    bookings: [
      {
        id: 'booking-1',
        tripId: trip.id,
        type: 'ticket',
        status: 'confirmed',
        title: 'Museum ticket',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    accommodations: [
      {
        id: 'stay-1',
        tripId: trip.id,
        name: 'Baixa Hotel',
        type: 'hotel',
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

test('no network state stays unknown instead of inventing online or offline', () => {
  assert.equal(resolveNetworkReachability(null), 'unknown');
  assert.equal(resolveNetworkReachability({}), 'unknown');
  assert.equal(
    resolveNetworkReachability({ type: 'UNKNOWN' }),
    'unknown',
  );
});

test('NONE, disconnected, or unreachable internet is offline', () => {
  assert.equal(
    resolveNetworkReachability({ type: 'NONE' }),
    'offline',
  );
  assert.equal(
    resolveNetworkReachability({ isConnected: false }),
    'offline',
  );
  assert.equal(
    resolveNetworkReachability({
      type: 'WIFI',
      isConnected: true,
      isInternetReachable: false,
    }),
    'offline',
  );
});

test('an active connection without a failed reachability check is online', () => {
  assert.equal(
    resolveNetworkReachability({
      type: 'WIFI',
      isConnected: true,
    }),
    'online',
  );
  assert.equal(
    resolveNetworkReachability({
      type: 'UNKNOWN',
      isConnected: true,
      isInternetReachable: true,
    }),
    'online',
  );
  assert.equal(
    resolveNetworkReachability({
      type: 'CELLULAR',
      isConnected: true,
      isInternetReachable: true,
    }),
    'online',
  );
});

test('SQLite trip facts stay the offline cache and do not invent coordinates', () => {
  const facts = collectOfflineTripFacts(makeWorkspace());

  assert.deepEqual(facts, {
    bookingCount: 1,
    stayCount: 1,
    stopCount: 2,
    mappedPinCount: 2,
    unmappedStopCount: 1,
  });
});

test('unknown reachability does not claim a network outage', () => {
  const facts = collectOfflineTripFacts(makeWorkspace());

  assert.equal(
    selectOfflineTripNotice({
      reachability: 'unknown',
      facts,
      surface: 'companion',
    }),
    null,
  );
});

test('offline Companion names on-device facts without a second cache', () => {
  const facts = collectOfflineTripFacts(makeWorkspace());

  assert.deepEqual(
    selectOfflineTripNotice({
      reachability: 'offline',
      facts,
      surface: 'companion',
    }),
    {
      kind: 'offline',
      body: 'Trip, bookings, stays, and saved pins are on this device. Map tiles and live lookup need a network.',
    },
  );
});

test('offline Map does not claim a cached route', () => {
  const facts = collectOfflineTripFacts(makeWorkspace());

  assert.deepEqual(
    selectOfflineTripNotice({
      reachability: 'offline',
      facts,
      surface: 'map',
    }),
    {
      kind: 'offline',
      body: 'Saved pins stay on this device. Live map tiles need a network. Directions use the saved pin, not a cached route.',
    },
  );
});

test('offline Map without pins stays explicit', () => {
  const facts = collectOfflineTripFacts(
    makeWorkspace({
      trip: {
        ...makeWorkspace().trip,
        destinations: [
          {
            id: 'destination-lisbon',
            name: 'Lisbon',
          },
        ],
      },
      stops: [
        {
          id: 'stop-notes',
          tripId: 'trip-offline',
          dayId: 'day-1',
          title: 'Cafe notes',
          type: 'food',
          order: 1,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.equal(facts.mappedPinCount, 0);
  assert.deepEqual(
    selectOfflineTripNotice({
      reachability: 'offline',
      facts,
      surface: 'map',
    }),
    {
      kind: 'offline-unmapped',
      body: 'Trip, bookings, and stays are saved on this device. There is no saved pin, and live map tiles need a network.',
    },
  );
});

test('online Map names missing coordinates instead of inventing a pin', () => {
  const facts = collectOfflineTripFacts(makeWorkspace());

  assert.deepEqual(
    selectOfflineTripNotice({
      reachability: 'online',
      facts,
      surface: 'map',
    }),
    {
      kind: 'unmapped',
      body: 'Stops without saved coordinates stay off the map. TravelOS does not invent a pin.',
    },
  );
  assert.equal(
    selectOfflineTripNotice({
      reachability: 'online',
      facts,
      surface: 'companion',
    }),
    null,
  );
});
