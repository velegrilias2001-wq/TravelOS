const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AIContextService,
} = require('../.test-build/src/services/ai-context-service.js');

const TIMESTAMP = '2026-08-28T10:00:00.000Z';

function fixedClock(
  instant = '2026-09-01T08:00:00.000Z',
  deviceTimeZone = 'Europe/Athens',
) {
  const value = new Date(instant);

  return {
    now: () => new Date(value.getTime()),
    deviceTimeZone: () => deviceTimeZone,
  };
}

function makeWorkspace() {
  const trip = {
    id: 'trip-ai-service',
    title: 'Athens weekend',
    status: 'planned',
    intent: 'explore',
    pace: 'balanced',
    destinations: [
      {
        id: 'destination-athens',
        name: 'Athens',
        countryCode: 'GR',
        timezone: 'Europe/Athens',
        currencyCode: 'EUR',
      },
    ],
    startDate: '2026-09-01',
    endDate: '2026-09-02',
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
    ],
    stops: [],
    bookings: [],
    accommodations: [],
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
    memories: [],
    travelBook: null,
  };
}

test('AIContextService returns null when the trip workspace does not exist', async () => {
  let travelDNARead = false;

  const service = new AIContextService(
    {
      getWorkspace: async () => null,
    },
    {
      get: async () => {
        travelDNARead = true;
        return null;
      },
    },
    fixedClock(),
  );

  const result =
    await service.getSnapshot('missing-trip');

  assert.equal(result, null);
  assert.equal(travelDNARead, false);
});

test('AIContextService loads persisted workspace and Travel DNA before building a snapshot', async () => {
  const workspace = makeWorkspace();

  const travelDNA = {
    id: 'travel-dna-local',
    pace: 'slow',
    interests: ['culture'],
    travelStyle: 'local',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };

  const requestedTripIds = [];
  let travelDNAReads = 0;

  const service = new AIContextService(
    {
      getWorkspace: async (tripId) => {
        requestedTripIds.push(tripId);
        return workspace;
      },
    },
    {
      get: async () => {
        travelDNAReads += 1;
        return travelDNA;
      },
    },
    fixedClock(
      '2026-09-01T08:00:00.000Z',
      'Europe/Athens',
    ),
  );

  const result =
    await service.getSnapshot(workspace.trip.id);

  assert.ok(result);
  assert.deepEqual(
    requestedTripIds,
    [workspace.trip.id],
  );
  assert.equal(travelDNAReads, 1);

  assert.equal(
    result.trip.id,
    workspace.trip.id,
  );
  assert.equal(
    result.trip.intent,
    'explore',
  );
  assert.equal(
    result.trip.pace,
    'balanced',
  );

  assert.deepEqual(
    result.travelDNA,
    {
      pace: 'slow',
      interests: ['culture'],
      travelStyle: 'local',
      budgetStyle: undefined,
      dailyRhythm: undefined,
      typicalParty: undefined,
    },
  );

  assert.deepEqual(
    result.travelers,
    {
      total: 1,
      adults: 1,
      children: 0,
      infants: 0,
    },
  );
});

test('AIContextService preserves missing Travel DNA as explicit null', async () => {
  const workspace = makeWorkspace();

  const service = new AIContextService(
    {
      getWorkspace: async () => workspace,
    },
    {
      get: async () => null,
    },
    fixedClock(),
  );

  const result =
    await service.getSnapshot(workspace.trip.id);

  assert.ok(result);
  assert.equal(result.travelDNA, null);
});
