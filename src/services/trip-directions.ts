import {
  LOCAL_DEV_AI_FALLBACK_URL,
  resolveLocalDevAiBaseUrl,
} from './ai-local-dev-contract';
import { mappedStopCoordinate, type TripMapCoordinate } from './trip-map-context';
import type { TripStop } from '../domain/entities/trip-stop';

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
 * Build walking estimates only between adjacent saved stops within each day.
 * Include unmapped stops in the input: a missing location breaks the chain.
 * Scope is explicit; a day with no usable pair never borrows another day.
 */
export function buildTripRoutePlan(
  stops: readonly TripStop[],
  scope: { tripId: string; dayId?: string | null },
) {
  const byDay = new Map<string, TripStop[]>();
  for (const stop of stops) {
    if (stop.tripId !== scope.tripId || !stop.dayId ||
        (scope.dayId != null && stop.dayId !== scope.dayId)) continue;
    const dayStops = byDay.get(stop.dayId) ?? [];
    dayStops.push(stop);
    byDay.set(stop.dayId, dayStops);
  }
  const all: (TripRouteLegRequest & { fromStopId: string; toStopId: string; dayId: string })[] = [];
  for (const [dayId, dayStops] of byDay) {
    dayStops.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    for (let index = 0; index < dayStops.length - 1; index += 1) {
      const from = dayStops[index];
      const to = dayStops[index + 1];
      const origin = mappedStopCoordinate(from);
      const destination = mappedStopCoordinate(to);
      if (!origin || !destination || from.id === to.id ||
          !Number.isInteger(from.order) || !Number.isInteger(to.order) ||
          to.order <= from.order) continue;
      all.push({ fromStopId: from.id, toStopId: to.id, dayId,
        origin, destination, mode: 'walking' });
    }
  }
  const requests = all.slice(0, 6);
  return { requests, totalLegs: all.length, omittedLegs: all.length - requests.length };
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
