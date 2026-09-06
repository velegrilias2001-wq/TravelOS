import {
  LOCAL_DEV_AI_FALLBACK_URL,
  resolveLocalDevAiBaseUrl,
} from './ai-local-dev-contract';
import {
  isValidIanaTimeZone,
} from './time-truth';
import type {
  DestinationSelection,
} from './destination-authoring';

export interface TimezoneLookupResult {
  timezone: string;
  source: 'provider';
}

interface TimezoneLookupResponse {
  ok?: unknown;
  timezone?: unknown;
  source?: unknown;
  error?: unknown;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveTimezoneLookupBaseUrl(
  configured: string | null | undefined =
    process.env.EXPO_PUBLIC_TRAVELOS_AI_URL,
): string {
  return resolveLocalDevAiBaseUrl(
    configured,
    LOCAL_DEV_AI_FALLBACK_URL,
  );
}

/**
 * Parse POST /geo/timezone JSON. Unknown / invalid stays null.
 */
export function parseTimezoneLookupResponse(
  payload: unknown,
): TimezoneLookupResult | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const body = payload as TimezoneLookupResponse;

  if (body.ok !== true) {
    return null;
  }

  if (
    typeof body.timezone !== 'string' ||
    !isValidIanaTimeZone(body.timezone)
  ) {
    return null;
  }

  if (body.source !== 'provider') {
    return null;
  }

  return {
    timezone: body.timezone.trim(),
    source: 'provider',
  };
}

/**
 * Loopback Time Zone enrichment. Fail closed when the local
 * server is unreachable, the key is missing, or the response
 * is invalid. Never invents a timezone.
 */
export async function lookupTimezoneFromCoordinates(
  latitude: number,
  longitude: number,
  options?: {
    timestamp?: number;
    signal?: AbortSignal;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
  },
): Promise<TimezoneLookupResult | null> {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const baseUrl = normalizeBaseUrl(
    options?.baseUrl ??
      resolveTimezoneLookupBaseUrl(),
  );
  const fetchImpl = options?.fetchImpl ?? fetch;

  let response: Response;

  try {
    response = await fetchImpl(
      `${baseUrl}/geo/timezone`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
          ...(options?.timestamp != null
            ? { timestamp: options.timestamp }
            : {}),
        }),
        signal: options?.signal,
      },
    );
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

  return parseTimezoneLookupResponse(payload);
}

/**
 * If the selection already has a timezone, keep it.
 * Otherwise try loopback enrichment; on failure leave unknown.
 */
export async function enrichSelectionWithProviderTimezone(
  selection: DestinationSelection,
  options?: {
    timestamp?: number;
    signal?: AbortSignal;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
  },
): Promise<DestinationSelection> {
  if (selection.timezone) {
    return selection;
  }

  const lookup = await lookupTimezoneFromCoordinates(
    selection.latitude,
    selection.longitude,
    options,
  );

  if (!lookup) {
    return selection;
  }

  return {
    ...selection,
    timezone: lookup.timezone,
    timezoneSource: 'provider',
  };
}
