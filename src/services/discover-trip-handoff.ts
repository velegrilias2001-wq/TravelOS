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
 */
export interface DiscoverTripRouteParams {
  source: 'discover';

  destinationName: string;
  destinationLatitude: string;
  destinationLongitude: string;

  destinationCountryCode?: string;
  destinationTimezone?: string;
  destinationCurrencyCode?: string;

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
    normalizeDiscoverBrief(rawBrief);

  const normalizedDestination =
    normalizeDestinationSelection(
      destination,
    );

  const exactTiming =
    brief.timing?.kind === 'exact'
      ? brief.timing
      : undefined;

  return {
    destination:
      normalizedDestination,

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

  return {
    source: 'discover',

    destinationName:
      destination.name,

    destinationLatitude:
      String(destination.latitude),

    destinationLongitude:
      String(destination.longitude),

    destinationCountryCode:
      destination.countryCode,

    destinationTimezone:
      destination.timezone,

    destinationCurrencyCode:
      destination.currencyCode,

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
    firstParam(params.source) !==
    'discover'
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
    latitudeValue === undefined ||
    longitudeValue === undefined
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

      currencyCode:
        firstParam(
          params.destinationCurrencyCode,
        ),
    });

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
    ) as TripIntent | undefined;

  const pace =
    firstParam(
      params.pace,
    ) as TripPace | undefined;

  const brief =
    normalizeDiscoverBrief({
      mode: 'find_destination',

      destination,

      timing:
        startDate && endDate
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

    startDate:
      brief.timing?.kind === 'exact'
        ? brief.timing.startDate
        : undefined,

    endDate:
      brief.timing?.kind === 'exact'
        ? brief.timing.endDate
        : undefined,

    intent:
      brief.intent,

    pace:
      brief.pace,
  };
}