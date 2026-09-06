/**
 * Google Time Zone API proxy for local-dev enrichment.
 * Key lives only in server/.env — never in the native client.
 * Do not reuse GOOGLE_MAPS_API_KEY for this web service.
 */

const { z } = require('zod');

const timezoneLookupRequestSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  timestamp: z
    .number()
    .finite()
    .int()
    .optional(),
});

function isValidIanaTimeZone(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en', {
      timeZone: value.trim(),
    }).format();
    return true;
  } catch {
    return false;
  }
}

function parseTimezoneLookupRequest(body) {
  return timezoneLookupRequestSchema.parse(body);
}

function readTimezoneApiKey(env = process.env) {
  const key = (env.GOOGLE_TIMEZONE_API_KEY || '').trim();
  return key || null;
}

/**
 * Parse a Google Time Zone API JSON body without inventing a zone.
 * @returns {{ timeZoneId: string } | null}
 */
function parseGoogleTimezoneResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const status =
    typeof payload.status === 'string'
      ? payload.status
      : '';

  if (status !== 'OK') {
    return null;
  }

  const timeZoneId =
    typeof payload.timeZoneId === 'string'
      ? payload.timeZoneId.trim()
      : '';

  if (!isValidIanaTimeZone(timeZoneId)) {
    return null;
  }

  return { timeZoneId };
}

function buildGoogleTimezoneUrl({
  latitude,
  longitude,
  timestamp,
  apiKey,
}) {
  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    timestamp: String(
      timestamp ?? Math.floor(Date.now() / 1000),
    ),
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/timezone/json?${params.toString()}`;
}

/**
 * @param {{
 *   latitude: number;
 *   longitude: number;
 *   timestamp?: number;
 *   apiKey?: string | null;
 *   fetchImpl?: typeof fetch;
 *   env?: NodeJS.ProcessEnv;
 * }} options
 */
async function lookupTimezoneFromCoordinates(options) {
  const {
    latitude,
    longitude,
    timestamp,
    fetchImpl = fetch,
    env = process.env,
  } = options;

  const apiKey =
    options.apiKey !== undefined
      ? options.apiKey
      : readTimezoneApiKey(env);

  if (!apiKey) {
    const error = new Error('timezone_api_key_missing');
    error.code = 'timezone_api_key_missing';
    throw error;
  }

  const url = buildGoogleTimezoneUrl({
    latitude,
    longitude,
    timestamp,
    apiKey,
  });

  let response;

  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    const error = new Error('timezone_provider_unavailable');
    error.code = 'timezone_provider_unavailable';
    throw error;
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    const error = new Error('timezone_provider_unavailable');
    error.code = 'timezone_provider_unavailable';
    throw error;
  }

  if (!response.ok) {
    const error = new Error('timezone_provider_unavailable');
    error.code = 'timezone_provider_unavailable';
    throw error;
  }

  const parsed = parseGoogleTimezoneResponse(payload);

  if (!parsed) {
    const error = new Error('timezone_lookup_failed');
    error.code = 'timezone_lookup_failed';
    throw error;
  }

  return {
    timezone: parsed.timeZoneId,
    source: 'provider',
  };
}

module.exports = {
  buildGoogleTimezoneUrl,
  isValidIanaTimeZone,
  lookupTimezoneFromCoordinates,
  parseGoogleTimezoneResponse,
  parseTimezoneLookupRequest,
  readTimezoneApiKey,
};
