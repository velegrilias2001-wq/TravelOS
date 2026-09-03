import type {
  DestinationSelection,
} from './destination-authoring';

import {
  normalizeDestinationSelection,
} from './destination-authoring';

import type {
  DiscoverBrief,
  DiscoverDestination,
  TripIntent,
  TripPace,
} from '@/domain/entities';

import {
  normalizeDiscoverBrief,
} from './discover-brief';

export interface DiscoverTripPrefill {
  destination: DestinationSelection;
  extraDestinations?: DestinationSelection[];

  /**
   * Only exact dates can prefill the canonical trip creator.
   * Flexible timing remains a Discover concern until the user
   * chooses real calendar dates.
   */
  startDate?: string;
  endDate?: string;

  intent?: TripIntent;
  pace?: TripPace;
}

/**
 * Route contract used when Discover hands a grounded
 * destination to the existing /new-trip screen.
 *
 * Values stay primitive because Expo Router params are URL
 * parameters, not a second persistence layer.
 *
 * The string index signature also makes this object directly
 * compatible with Expo Router's route params contract.
 */
export interface DiscoverTripRouteParams
  extends Record<
    string,
    string | undefined
  > {
  source: 'discover';

  destinationName: string;
  destinationLatitude: string;
  destinationLongitude: string;

  destinationCountryCode?: string;
  destinationTimezone?: string;
  destinationCurrencyCode?: string;
  extraDestinations?: string;

  startDate?: string;
  endDate?: string;

  intent?: TripIntent;
  pace?: TripPace;
}

export type SearchParamValue =
  | string
  | string[]
  | undefined;

function firstParam(
  value: SearchParamValue,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function buildDiscoverTripPrefill(
  rawBrief: DiscoverBrief,
  destination: DiscoverDestination,
): DiscoverTripPrefill {
  const brief =
    normalizeDiscoverBrief(
      rawBrief,
    );

  const normalizedDestination =
    normalizeDestinationSelection(
      destination,
    );

  const exactTiming =
    brief.timing?.kind ===
    'exact'
      ? brief.timing
      : undefined;

  return {
    destination: {
      ...normalizedDestination,
      timezoneSource: normalizedDestination.timezone
        ? 'catalogue'
        : undefined,
    },

    startDate:
      exactTiming?.startDate,

    endDate:
      exactTiming?.endDate,

    intent:
      brief.intent,

    pace:
      brief.pace,
  };
}

export function serializeDiscoverTripPrefill(
  prefill: DiscoverTripPrefill,
): DiscoverTripRouteParams {
  const destination =
    normalizeDestinationSelection(
      prefill.destination,
    );
  const extraDestinations = (prefill.extraDestinations ?? [])
    .map((item) => normalizeDestinationSelection(item));

  return {
    source: 'discover',

    destinationName:
      destination.name,

    destinationLatitude:
      String(
        destination.latitude,
      ),

    destinationLongitude:
      String(
        destination.longitude,
      ),

    destinationCountryCode:
      destination.countryCode,

    destinationTimezone:
      destination.timezone,

    destinationCurrencyCode:
      destination.currencyCode,

    extraDestinations:
      extraDestinations.length > 0
        ? JSON.stringify(extraDestinations)
        : undefined,

    startDate:
      prefill.startDate,

    endDate:
      prefill.endDate,

    intent:
      prefill.intent,

    pace:
      prefill.pace,
  };
}

export function parseDiscoverTripRouteParams(
  params: Record<
    string,
    SearchParamValue
  >,
): DiscoverTripPrefill | null {
  if (
    firstParam(
      params.source,
    ) !== 'discover'
  ) {
    return null;
  }

  const name =
    firstParam(
      params.destinationName,
    );

  const latitudeValue =
    firstParam(
      params.destinationLatitude,
    );

  const longitudeValue =
    firstParam(
      params.destinationLongitude,
    );

  if (
    !name ||
    latitudeValue ===
      undefined ||
    longitudeValue ===
      undefined
  ) {
    throw new Error(
      'Discover handoff is missing destination data',
    );
  }

  const latitude =
    Number(latitudeValue);

  const longitude =
    Number(longitudeValue);

  const destination =
    normalizeDestinationSelection({
      name,

      latitude,
      longitude,

      countryCode:
        firstParam(
          params.destinationCountryCode,
        ),

      timezone:
        firstParam(
          params.destinationTimezone,
        ),
      timezoneSource: firstParam(
        params.destinationTimezone,
      )
        ? 'catalogue'
        : undefined,

      currencyCode:
        firstParam(
          params.destinationCurrencyCode,
        ),
    });

  const extraDestinations = parseExtraDestinations(
    firstParam(params.extraDestinations),
  );

  const startDate =
    firstParam(
      params.startDate,
    );

  const endDate =
    firstParam(
      params.endDate,
    );

  if (
    Boolean(startDate) !==
    Boolean(endDate)
  ) {
    throw new Error(
      'Discover handoff must provide both trip dates or neither',
    );
  }

  const intent =
    firstParam(
      params.intent,
    ) as
      | TripIntent
      | undefined;

  const pace =
    firstParam(
      params.pace,
    ) as
      | TripPace
      | undefined;

  const brief =
    normalizeDiscoverBrief({
      mode:
        'find_destination',

      destination,

      timing:
        startDate &&
        endDate
          ? {
              kind: 'exact',
              startDate,
              endDate,
            }
          : undefined,

      intent,
      pace,

      interests: [],
    });

  return {
    destination,
    ...(extraDestinations && extraDestinations.length > 0
      ? { extraDestinations }
      : {}),

    startDate:
      brief.timing?.kind ===
      'exact'
        ? brief.timing
            .startDate
        : undefined,

    endDate:
      brief.timing?.kind ===
      'exact'
        ? brief.timing
            .endDate
        : undefined,

    intent:
      brief.intent,

    pace:
      brief.pace,
  };
}

function parseExtraDestinations(
  raw: string | undefined,
): DestinationSelection[] | undefined {
  if (!raw) {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'Discover handoff extra destinations could not be read',
    );
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      'Discover handoff extra destinations could not be read',
    );
  }

  return parsed.map((item) => {
    if (
      item === null ||
      typeof item !== 'object' ||
      !('name' in item) ||
      !('latitude' in item) ||
      !('longitude' in item)
    ) {
      throw new Error(
        'Discover handoff extra destinations could not be read',
      );
    }

    const record = item as {
      name: unknown;
      latitude: unknown;
      longitude: unknown;
      countryCode?: unknown;
      timezone?: unknown;
      timezoneSource?: unknown;
      currencyCode?: unknown;
    };

    if (
      typeof record.name !== 'string' ||
      typeof record.latitude !== 'number' ||
      typeof record.longitude !== 'number'
    ) {
      throw new Error(
        'Discover handoff extra destinations could not be read',
      );
    }

    const timezone =
      typeof record.timezone === 'string'
        ? record.timezone
        : undefined;

    return normalizeDestinationSelection({
      name: record.name,
      latitude: record.latitude,
      longitude: record.longitude,
      countryCode:
        typeof record.countryCode === 'string'
          ? record.countryCode
          : undefined,
      timezone,
      timezoneSource:
        timezone
          ? record.timezoneSource === 'provider' ||
            record.timezoneSource === 'catalogue' ||
            record.timezoneSource === 'traveler'
            ? record.timezoneSource
            : 'catalogue'
          : undefined,
      currencyCode:
        typeof record.currencyCode === 'string'
          ? record.currencyCode
          : undefined,
    });
  });
}