/**
 * Google Directions API proxy for local-dev Map routes/ETAs.
 * Key lives only in server/.env — never reuse GOOGLE_MAPS_API_KEY.
 */

const { z } = require('zod');

const coordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

const directionsRequestSchema = z.object({
  origin: coordinateSchema,
  destination: coordinateSchema,
  mode: z
    .enum(['driving', 'walking', 'transit', 'bicycling'])
    .optional()
    .default('walking'),
});

function readDirectionsApiKey(env = process.env) {
  const key = (env.GOOGLE_DIRECTIONS_API_KEY || '').trim();
  return key || null;
}

function parseDirectionsLookupRequest(body) {
  return directionsRequestSchema.parse(body);
}

function decodePolyline(encoded) {
  if (typeof encoded !== 'string' || !encoded) {
    return [];
  }

  let index = 0;
  const coordinates = [];
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coordinates;
}

function parseGoogleDirectionsResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (payload.status !== 'OK') {
    return null;
  }

  const route = Array.isArray(payload.routes)
    ? payload.routes[0]
    : null;

  if (!route || typeof route !== 'object') {
    return null;
  }

  const leg = Array.isArray(route.legs)
    ? route.legs[0]
    : null;

  if (!leg || typeof leg !== 'object') {
    return null;
  }

  const durationSeconds =
    leg.duration &&
    typeof leg.duration.value === 'number' &&
    Number.isFinite(leg.duration.value)
      ? Math.round(leg.duration.value)
      : null;

  const distanceMeters =
    leg.distance &&
    typeof leg.distance.value === 'number' &&
    Number.isFinite(leg.distance.value)
      ? Math.round(leg.distance.value)
      : null;

  const durationText =
    leg.duration &&
    typeof leg.duration.text === 'string'
      ? leg.duration.text.trim()
      : null;

  const distanceText =
    leg.distance &&
    typeof leg.distance.text === 'string'
      ? leg.distance.text.trim()
      : null;

  const encoded =
    route.overview_polyline &&
    typeof route.overview_polyline.points === 'string'
      ? route.overview_polyline.points
      : '';

  const coordinates = decodePolyline(encoded);

  if (
    durationSeconds == null ||
    distanceMeters == null ||
    coordinates.length < 2
  ) {
    return null;
  }

  return {
    durationSeconds,
    distanceMeters,
    durationText: durationText || null,
    distanceText: distanceText || null,
    coordinates,
    encodedPolyline: encoded || null,
  };
}

function buildGoogleDirectionsUrl({
  origin,
  destination,
  mode,
  apiKey,
}) {
  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: mode || 'walking',
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
}

async function lookupDirections(options) {
  const {
    origin,
    destination,
    mode = 'walking',
    fetchImpl = fetch,
    env = process.env,
  } = options;

  const apiKey =
    options.apiKey !== undefined
      ? options.apiKey
      : readDirectionsApiKey(env);

  if (!apiKey) {
    const error = new Error('directions_api_key_missing');
    error.code = 'directions_api_key_missing';
    throw error;
  }

  const url = buildGoogleDirectionsUrl({
    origin,
    destination,
    mode,
    apiKey,
  });

  let response;

  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    const error = new Error('directions_provider_unavailable');
    error.code = 'directions_provider_unavailable';
    throw error;
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    const error = new Error('directions_provider_unavailable');
    error.code = 'directions_provider_unavailable';
    throw error;
  }

  if (!response.ok) {
    const error = new Error('directions_provider_unavailable');
    error.code = 'directions_provider_unavailable';
    throw error;
  }

  const parsed = parseGoogleDirectionsResponse(payload);

  if (!parsed) {
    const error = new Error('directions_lookup_failed');
    error.code = 'directions_lookup_failed';
    throw error;
  }

  return {
    ...parsed,
    mode,
    source: 'provider',
  };
}

module.exports = {
  buildGoogleDirectionsUrl,
  decodePolyline,
  lookupDirections,
  parseDirectionsLookupRequest,
  parseGoogleDirectionsResponse,
  readDirectionsApiKey,
};
