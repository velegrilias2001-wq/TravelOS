const assert = require('node:assert/strict');
const test = require('node:test');
const { ZodError } = require('zod');

const {
  decodePolyline,
  lookupDirections,
  parseDirectionsLookupRequest,
  parseGoogleDirectionsResponse,
  readDirectionsApiKey,
} = require('../directions-lookup');

test('parseDirectionsLookupRequest accepts walking mode', () => {
  assert.deepEqual(
    parseDirectionsLookupRequest({
      origin: { latitude: 35.68, longitude: 139.76 },
      destination: { latitude: 35.71, longitude: 139.8 },
      mode: 'walking',
    }),
    {
      origin: { latitude: 35.68, longitude: 139.76 },
      destination: { latitude: 35.71, longitude: 139.8 },
      mode: 'walking',
    },
  );
});

test('parseDirectionsLookupRequest rejects invalid coordinates', () => {
  assert.throws(
    () =>
      parseDirectionsLookupRequest({
        origin: { latitude: 91, longitude: 0 },
        destination: { latitude: 0, longitude: 0 },
      }),
    ZodError,
  );
});

test('decodePolyline returns coordinates', () => {
  // Encoded "_p~iF~ps|U_ulLnnqC_mqNvxq`@" ≈ classic Google sample fragment
  const coords = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  assert.ok(coords.length >= 2);
  assert.ok(Number.isFinite(coords[0].latitude));
});

test('parseGoogleDirectionsResponse accepts OK route', () => {
  const parsed = parseGoogleDirectionsResponse({
    status: 'OK',
    routes: [
      {
        overview_polyline: {
          points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        },
        legs: [
          {
            duration: { value: 600, text: '10 mins' },
            distance: { value: 800, text: '0.8 km' },
          },
        ],
      },
    ],
  });

  assert.equal(parsed.durationSeconds, 600);
  assert.equal(parsed.distanceMeters, 800);
  assert.ok(parsed.coordinates.length >= 2);
});

test('parseGoogleDirectionsResponse fails closed on ZERO_RESULTS', () => {
  assert.equal(
    parseGoogleDirectionsResponse({ status: 'ZERO_RESULTS' }),
    null,
  );
});

test('lookupDirections returns provider route on OK', async () => {
  const result = await lookupDirections({
    origin: { latitude: 35.68, longitude: 139.76 },
    destination: { latitude: 35.71, longitude: 139.8 },
    apiKey: 'test-key',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: {
              points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            },
            legs: [
              {
                duration: { value: 420, text: '7 mins' },
                distance: { value: 500, text: '0.5 km' },
              },
            ],
          },
        ],
      }),
    }),
  });

  assert.equal(result.source, 'provider');
  assert.equal(result.durationSeconds, 420);
});

test('lookupDirections fails closed without a key', async () => {
  await assert.rejects(
    () =>
      lookupDirections({
        origin: { latitude: 1, longitude: 1 },
        destination: { latitude: 2, longitude: 2 },
        env: {},
      }),
    (error) => error.code === 'directions_api_key_missing',
  );
});

test('readDirectionsApiKey fails closed when missing', () => {
  assert.equal(readDirectionsApiKey({}), null);
});
