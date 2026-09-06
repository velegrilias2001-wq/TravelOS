const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildMappedStopRouteRequests,
  formatRouteLegSummary,
  lookupTripRouteLeg,
  parseDirectionsResponse,
} = require('../.test-build/src/services/trip-directions.js');

test('buildMappedStopRouteRequests pairs consecutive mapped stops', () => {
  const requests = buildMappedStopRouteRequests(
    [
      { id: 'a', coordinate: { latitude: 1, longitude: 2 } },
      { id: 'b', coordinate: { latitude: 3, longitude: 4 } },
      { id: 'c', coordinate: { latitude: 5, longitude: 6 } },
    ],
    'walking',
  );

  assert.equal(requests.length, 2);
  assert.equal(requests[0].fromStopId, 'a');
  assert.equal(requests[0].toStopId, 'b');
  assert.equal(requests[1].fromStopId, 'b');
  assert.equal(requests[1].toStopId, 'c');
  assert.equal(requests[0].mode, 'walking');
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
