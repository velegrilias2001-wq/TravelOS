import {
  LOCAL_DEV_AI_FALLBACK_URL,
  resolveLocalDevAiBaseUrl,
} from './ai-local-dev-contract';
import type { TripMapCoordinate } from './trip-map-context';

export type TripDirectionsMode =
  | 'driving'
  | 'walking'
  | 'transit'
  | 'bicycling';

export interface TripRouteLeg {
  origin: TripMapCoordinate;
  destination: TripMapCoordinate;
  mode: TripDirectionsMode;
  durationSeconds: number;
  distanceMeters: number;
  durationText: string | null;
  distanceText: string | null;
  coordinates: TripMapCoordinate[];
  source: 'provider';
}

export interface TripRouteLegRequest {
  origin: TripMapCoordinate;
  destination: TripMapCoordinate;
  mode?: TripDirectionsMode;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveDirectionsBaseUrl(
  configured: string | null | undefined =
    process.env.EXPO_PUBLIC_TRAVELOS_AI_URL,
): string {
  return resolveLocalDevAiBaseUrl(
    configured,
    LOCAL_DEV_AI_FALLBACK_URL,
  );
}

export function parseDirectionsResponse(
  payload: unknown,
  request: TripRouteLegRequest,
): TripRouteLeg | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const body = payload as Record<string, unknown>;

  if (body.ok !== true || body.source !== 'provider') {
    return null;
  }

  if (
    typeof body.durationSeconds !== 'number' ||
    !Number.isFinite(body.durationSeconds) ||
    body.durationSeconds <= 0 ||
    typeof body.distanceMeters !== 'number' ||
    !Number.isFinite(body.distanceMeters) ||
    body.distanceMeters <= 0
  ) {
    return null;
  }

  if (!Array.isArray(body.coordinates) || body.coordinates.length < 2) {
    return null;
  }

  const coordinates: TripMapCoordinate[] = [];

  for (const point of body.coordinates) {
    if (!point || typeof point !== 'object') {
      return null;
    }

    const latitude = (point as { latitude?: unknown }).latitude;
    const longitude = (point as { longitude?: unknown }).longitude;

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    coordinates.push({ latitude, longitude });
  }

  const mode =
    body.mode === 'driving' ||
    body.mode === 'walking' ||
    body.mode === 'transit' ||
    body.mode === 'bicycling'
      ? body.mode
      : request.mode ?? 'walking';

  return {
    origin: request.origin,
    destination: request.destination,
    mode,
    durationSeconds: Math.round(body.durationSeconds),
    distanceMeters: Math.round(body.distanceMeters),
    durationText:
      typeof body.durationText === 'string'
        ? body.durationText
        : null,
    distanceText:
      typeof body.distanceText === 'string'
        ? body.distanceText
        : null,
    coordinates,
    source: 'provider',
  };
}

/**
 * Consecutive mapped stops become route legs. Untimed or unmapped
 * stops are skipped — never invent a path.
 */
export function buildMappedStopRouteRequests(
  stops: readonly {
    id: string;
    coordinate: TripMapCoordinate;
  }[],
  mode: TripDirectionsMode = 'walking',
): Array<TripRouteLegRequest & { fromStopId: string; toStopId: string }> {
  const requests: Array<
    TripRouteLegRequest & { fromStopId: string; toStopId: string }
  > = [];

  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];

    requests.push({
      fromStopId: from.id,
      toStopId: to.id,
      origin: from.coordinate,
      destination: to.coordinate,
      mode,
    });
  }

  return requests;
}

export async function lookupTripRouteLeg(
  request: TripRouteLegRequest,
  options?: {
    baseUrl?: string;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  },
): Promise<TripRouteLeg | null> {
  const baseUrl = normalizeBaseUrl(
    options?.baseUrl ?? resolveDirectionsBaseUrl(),
  );
  const fetchImpl = options?.fetchImpl ?? fetch;

  let response: Response;

  try {
    response = await fetchImpl(`${baseUrl}/geo/directions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        origin: request.origin,
        destination: request.destination,
        mode: request.mode ?? 'walking',
      }),
      signal: options?.signal,
    });
  } catch {
    return null;
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return parseDirectionsResponse(payload, request);
}

export function formatRouteLegSummary(leg: TripRouteLeg): string {
  const duration =
    leg.durationText ??
    `${Math.max(1, Math.round(leg.durationSeconds / 60))} min`;
  const distance =
    leg.distanceText ??
    (leg.distanceMeters >= 1000
      ? `${(leg.distanceMeters / 1000).toFixed(1)} km`
      : `${leg.distanceMeters} m`);

  return `${duration} · ${distance} · ${leg.mode}`;
}
