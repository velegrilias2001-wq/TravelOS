const assert = require('node:assert/strict');
const test = require('node:test');

const {
  filterWorldPlaces,
  selectWorldPlaces,
  worldPlaceCounts,
} = require('../.test-build/src/services/world-places.js');

const TIMESTAMP = '2026-09-03T08:00:00.000Z';

function makeTrip(overrides = {}) {
  return {
    id: 'trip-lisbon',
    title: 'Lisbon and Porto',
    status: 'completed',
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
    ...overrides,
  };
}

function makeContext(overrides = {}) {
  return {
    days: [
      {
        id: 'day-1',
        tripId: 'trip-lisbon',
        date: '2026-09-03',
        dayNumber: 1,
        destinationId: 'destination-lisbon',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'day-2',
        tripId: 'trip-lisbon',
        date: '2026-09-04',
        dayNumber: 2,
        destinationId: 'destination-porto',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    stops: [
      {
        id: 'stop-belem',
        tripId: 'trip-lisbon',
        dayId: 'day-1',
        title: 'Belem',
        type: 'place',
        order: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: 'stop-ribeira',
        tripId: 'trip-lisbon',
        dayId: 'day-2',
        title: 'Ribeira',
        type: 'place',
        order: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    livedStates: [],
    memories: [],
    ...overrides,
  };
}

test('a completed trip is still planned until a stop is marked done', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext(),
  );

  assert.deepEqual(
    places.map((place) => [place.destination.id, place.kind]),
    [
      ['destination-lisbon', 'planned'],
      ['destination-porto', 'planned'],
    ],
  );
});

test('a done stop on an assigned day marks only that destination lived', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext({
      livedStates: [
        {
          stopId: 'stop-belem',
          tripId: 'trip-lisbon',
          phase: 'done',
          recordedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.equal(places[0].kind, 'lived');
  assert.equal(places[1].kind, 'planned');
});

test('a skipped stop is not a visit', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext({
      livedStates: [
        {
          stopId: 'stop-belem',
          tripId: 'trip-lisbon',
          phase: 'skipped',
          recordedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.ok(places.every((place) => place.kind === 'planned'));
});

test('a done stop on an unassigned day does not invent a city visit', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext({
      days: [
        {
          id: 'day-1',
          tripId: 'trip-lisbon',
          date: '2026-09-03',
          dayNumber: 1,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
      livedStates: [
        {
          stopId: 'stop-belem',
          tripId: 'trip-lisbon',
          phase: 'done',
          recordedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.ok(places.every((place) => place.kind === 'planned'));
});

test('the same city name on another trip is not fused by title', () => {
  const other = makeTrip({
    id: 'trip-later',
    title: 'Lisbon again',
    status: 'planned',
    destinations: [
      {
        id: 'destination-lisbon-later',
        name: 'Lisbon',
        latitude: 38.7223,
        longitude: -9.1393,
      },
    ],
  });
  const places = selectWorldPlaces(
    [makeTrip(), other],
    makeContext({
      livedStates: [
        {
          stopId: 'stop-belem',
          tripId: 'trip-lisbon',
          phase: 'done',
          recordedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.equal(
    places.find((place) => place.id === 'trip-lisbon:destination-lisbon')
      .kind,
    'lived',
  );
  assert.equal(
    places.find(
      (place) => place.id === 'trip-later:destination-lisbon-later',
    ).kind,
    'planned',
  );
});

test('World filters use lived evidence instead of trip status', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext({
      livedStates: [
        {
          stopId: 'stop-belem',
          tripId: 'trip-lisbon',
          phase: 'done',
          recordedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.deepEqual(worldPlaceCounts(places), {
    lived: 1,
    planned: 1,
    mapped: 2,
    archiveMemories: 0,
  });
  assert.deepEqual(
    filterWorldPlaces(places, 'lived').map(
      (place) => place.destination.id,
    ),
    ['destination-lisbon'],
  );
  assert.deepEqual(
    filterWorldPlaces(places, 'planned').map(
      (place) => place.destination.id,
    ),
    ['destination-porto'],
  );
});

test('a memory without day or stop does not attach to a city', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext({
      livedStates: [
        {
          stopId: 'stop-belem',
          tripId: 'trip-lisbon',
          phase: 'done',
          recordedAt: TIMESTAMP,
        },
      ],
      memories: [
        {
          id: 'memory-loose',
          tripId: 'trip-lisbon',
          type: 'note',
          title: 'Lisbon',
          capturedAt: TIMESTAMP,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.equal(places[0].archive.memoryCount, 0);
  assert.equal(places[1].archive.memoryCount, 0);
});

test('a memory on a planned city does not become a visit or archive', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext({
      memories: [
        {
          id: 'memory-plan',
          tripId: 'trip-lisbon',
          dayId: 'day-2',
          type: 'note',
          caption: 'Looking forward to Porto',
          capturedAt: TIMESTAMP,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.equal(places[1].kind, 'planned');
  assert.equal(places[1].archive.memoryCount, 0);
});

test('a lived city archive uses explicit day and stop memory IDs', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext({
      livedStates: [
        {
          stopId: 'stop-belem',
          tripId: 'trip-lisbon',
          phase: 'done',
          recordedAt: TIMESTAMP,
        },
      ],
      memories: [
        {
          id: 'memory-note',
          tripId: 'trip-lisbon',
          dayId: 'day-1',
          type: 'note',
          capturedAt: TIMESTAMP,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
        {
          id: 'memory-photo',
          tripId: 'trip-lisbon',
          stopId: 'stop-belem',
          type: 'photo',
          mediaUri: 'file:///belem.jpg',
          capturedAt: '2026-09-03T10:00:00.000Z',
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.deepEqual(places[0].archive, {
    memoryCount: 2,
    photoCount: 1,
    noteCount: 1,
    coverUri: 'file:///belem.jpg',
  });
  assert.equal(places[1].archive.memoryCount, 0);
  assert.equal(worldPlaceCounts(places).archiveMemories, 2);
});

test('a photo without a saved media URI does not invent a cover', () => {
  const places = selectWorldPlaces(
    [makeTrip()],
    makeContext({
      livedStates: [
        {
          stopId: 'stop-belem',
          tripId: 'trip-lisbon',
          phase: 'done',
          recordedAt: TIMESTAMP,
        },
      ],
      memories: [
        {
          id: 'memory-photo',
          tripId: 'trip-lisbon',
          dayId: 'day-1',
          type: 'photo',
          capturedAt: TIMESTAMP,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
    }),
  );

  assert.equal(places[0].archive.photoCount, 0);
  assert.equal(places[0].archive.memoryCount, 1);
  assert.equal(places[0].archive.coverUri, null);
});
