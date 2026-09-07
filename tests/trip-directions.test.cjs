const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTripRoutePlan,
  formatRouteLegSummary,
  lookupTripRouteLeg,
  parseDirectionsResponse,
} = require('../.test-build/src/services/trip-directions.js');

function stop(id, dayId, order, location = { latitude: 1 + order, longitude: 2 }) {
  return { id, tripId: 'trip', dayId, order, location, type: 'place', title: id };
}

test('route plan pairs canonical adjacent stops without changing caller order', () => {
  const input = [stop('c', 'day', 3), stop('a', 'day', 1), stop('b', 'day', 2)];
  const { requests } = buildTripRoutePlan(input, { tripId: 'trip' });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].fromStopId, 'a');
  assert.equal(requests[0].toStopId, 'b');
  assert.equal(requests[1].fromStopId, 'b');
  assert.equal(requests[1].toStopId, 'c');
  assert.equal(requests[0].mode, 'walking');
  assert.deepEqual(input.map((item) => item.id), ['c', 'a', 'b']);
});

test('routes never connect different days or different trips', () => {
  const { requests } = buildTripRoutePlan([
    stop('a', 'day-1', 1), stop('b', 'day-1', 2),
    stop('c', 'day-2', 1), stop('d', 'day-2', 2),
    { ...stop('foreign', 'day-2', 3), tripId: 'other' },
  ], { tripId: 'trip' });
  assert.deepEqual(requests.map((r) => [r.fromStopId, r.toStopId]), [['a', 'b'], ['c', 'd']]);
});

test('missing and invalid coordinates break route chains instead of skipping ahead', () => {
  for (const location of [null, {}, { latitude: NaN, longitude: 1 }, { latitude: 91, longitude: 1 }]) {
    const plan = buildTripRoutePlan([
      stop('a', 'day', 1), stop('b', 'day', 2, location), stop('c', 'day', 3),
    ], { tripId: 'trip' });
    assert.equal(plan.totalLegs, 0);
  }
});

test('an explicit empty day does not borrow routes from another day', () => {
  const input = [stop('a', 'one', 1), stop('b', 'one', 2), stop('c', 'two', 1)];
  assert.equal(buildTripRoutePlan(input, { tripId: 'trip', dayId: 'two' }).totalLegs, 0);
  assert.equal(buildTripRoutePlan(input, { tripId: 'trip', dayId: 'one' }).totalLegs, 1);
});

test('route cap reports omitted legs explicitly', () => {
  const plan = buildTripRoutePlan(Array.from({ length: 9 }, (_, i) => stop(`s${i}`, 'day', i)), { tripId: 'trip' });
  assert.equal(plan.totalLegs, 8);
  assert.equal(plan.requests.length, 6);
  assert.equal(plan.omittedLegs, 2);
});

test('parseDirectionsResponse accepts provider legs only', () => {
  const request = {
    origin: { latitude: 35.68, longitude: 139.76 },
    destination: { latitude: 35.71, longitude: 139.8 },
    mode: 'walking',
  };

  const leg = parseDirectionsResponse(
    {
      ok: true,
      source: 'provider',
      mode: 'walking',
      durationSeconds: 600,
      distanceMeters: 800,
      durationText: '10 mins',
      distanceText: '0.8 km',
      coordinates: [
        { latitude: 35.68, longitude: 139.76 },
        { latitude: 35.71, longitude: 139.8 },
      ],
    },
    request,
  );

  assert.equal(leg?.durationSeconds, 600);
  assert.equal(leg?.source, 'provider');
  assert.equal(
    formatRouteLegSummary(leg),
    '10 mins · 0.8 km · walking',
  );

  assert.equal(
    parseDirectionsResponse(
      {
        ok: true,
        source: 'guess',
        durationSeconds: 600,
        distanceMeters: 800,
        coordinates: [
          { latitude: 1, longitude: 2 },
          { latitude: 3, longitude: 4 },
        ],
      },
      request,
    ),
    null,
  );
});

test('lookupTripRouteLeg fails closed on network or bad payload', async () => {
  const request = {
    origin: { latitude: 1, longitude: 2 },
    destination: { latitude: 3, longitude: 4 },
  };

  assert.equal(
    await lookupTripRouteLeg(request, {
      baseUrl: 'http://127.0.0.1:8789',
      fetchImpl: async () => {
        throw new Error('offline');
      },
    }),
    null,
  );

  assert.equal(
    await lookupTripRouteLeg(request, {
      baseUrl: 'http://127.0.0.1:8789',
      fetchImpl: async () => ({
        ok: false,
        json: async () => ({
          ok: false,
          error: 'directions_api_key_missing',
        }),
      }),
    }),
    null,
  );
});
