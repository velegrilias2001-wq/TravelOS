import type {
  DestinationTimezoneSource,
  TripDestination,
  TripOrigin,
} from '@/domain/entities';

import {
  isValidIanaTimeZone,
} from './time-truth';

export interface DestinationProviderResult {
  latitude: number;
  longitude: number;
  name?: string;
  locality?: string;
  administrativeArea?: string;
  formattedAddress?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  timezoneSource?: DestinationTimezoneSource;
  currencyCode?: string;
  placeId?: string;
}

export interface DestinationSelection {
  name: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneSource?: DestinationTimezoneSource;
  currencyCode?: string;
  placeId?: string;
}

export type DestinationAuthoringKind =
  | 'selected'
  | 'partially-enriched'
  | 'manual';

export interface MappedDestination {
  destination: TripDestination;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

function cleanOptional(
  value: string | undefined,
): string | undefined {
  const clean = value?.trim();
  return clean || undefined;
}

function assertCoordinates(
  latitude: number,
  longitude: number,
): void {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      'The selected destination does not have valid coordinates',
    );
  }
}

function normalizeCountryCode(
  value: string | undefined,
): string | undefined {
  const clean = cleanOptional(value)?.toUpperCase();

  if (clean && !/^[A-Z]{2}$/.test(clean)) {
    throw new Error(
      'Destination country code must use two letters',
    );
  }

  return clean;
}

function normalizeCurrencyCode(
  value: string | undefined,
): string | undefined {
  const clean = cleanOptional(value)?.toUpperCase();

  if (clean && !/^[A-Z]{3}$/.test(clean)) {
    throw new Error(
      'Destination currency must use a three-letter code',
    );
  }

  return clean;
}

function normalizePlaceId(
  value: string | undefined,
): string | undefined {
  return cleanOptional(value);
}

function normalizeTimeZoneSource(
  timezone: string | undefined,
  source: DestinationTimezoneSource | undefined,
): DestinationTimezoneSource | undefined {
  if (!timezone) {
    return undefined;
  }

  if (
    source &&
    source !== 'provider' &&
    source !== 'catalogue' &&
    source !== 'traveler'
  ) {
    throw new Error(
      'Destination timezone source is not supported',
    );
  }

  return source;
}

function normalizeTimeZone(
  value: string | undefined,
): string | undefined {
  const clean = cleanOptional(value);

  if (clean && !isValidIanaTimeZone(clean)) {
    throw new Error(
      'Destination timezone must be a valid IANA identifier',
    );
  }

  return clean;
}

function destinationDisplayName(
  result: DestinationProviderResult,
): string {
  const country = cleanOptional(result.country);
  const base =
    cleanOptional(result.locality) ??
    cleanOptional(result.administrativeArea) ??
    cleanOptional(result.name) ??
    cleanOptional(result.formattedAddress) ??
    country;

  if (!base) {
    throw new Error(
      'The selected destination does not have a usable name',
    );
  }

  if (
    !country ||
    base.localeCompare(country, undefined, {
      sensitivity: 'accent',
    }) === 0 ||
    base.toLocaleLowerCase().includes(
      country.toLocaleLowerCase(),
    )
  ) {
    return base;
  }

  return `${base}, ${country}`;
}

export function mapDestinationProviderResult(
  result: DestinationProviderResult,
): DestinationSelection {
  assertCoordinates(
    result.latitude,
    result.longitude,
  );

  const timezone = normalizeTimeZone(result.timezone);

  return {
    name: destinationDisplayName(result),
    countryCode: normalizeCountryCode(
      result.countryCode,
    ),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone,
    timezoneSource: normalizeTimeZoneSource(
      timezone,
      result.timezoneSource ??
        (timezone ? 'provider' : undefined),
    ),
    currencyCode: normalizeCurrencyCode(
      result.currencyCode,
    ),
    placeId: normalizePlaceId(result.placeId),
  };
}

export function normalizeDestinationSelection(
  selection: DestinationSelection,
): DestinationSelection {
  const name = selection.name.trim();

  if (!name) {
    throw new Error(
      'Choose a destination from the map',
    );
  }

  assertCoordinates(
    selection.latitude,
    selection.longitude,
  );

  const timezone = normalizeTimeZone(selection.timezone);

  return {
    name,
    countryCode: normalizeCountryCode(
      selection.countryCode,
    ),
    latitude: selection.latitude,
    longitude: selection.longitude,
    timezone,
    timezoneSource: normalizeTimeZoneSource(
      timezone,
      selection.timezoneSource,
    ),
    currencyCode: normalizeCurrencyCode(
      selection.currencyCode,
    ),
    placeId: normalizePlaceId(selection.placeId),
  };
}

export function applyDestinationSelection(
  destinationId: string,
  selection: DestinationSelection,
): TripDestination {
  return {
    id: destinationId,
    ...normalizeDestinationSelection(selection),
  };
}

/**
 * Origin uses the same picker facts as a destination,
 * but is never given a destination ID or day-clock role.
 */
export function buildTripOriginFromSelection(
  selection: DestinationSelection,
): TripOrigin {
  return normalizeDestinationSelection(selection);
}

export function mergeDestinationReplacement(
  existing: TripDestination,
  replacement: DestinationSelection,
): TripDestination {
  const next = applyDestinationSelection(
    existing.id,
    replacement,
  );

  return {
    ...next,
    timezone: next.timezone ?? existing.timezone,
    timezoneSource: next.timezone
      ? next.timezoneSource ??
        (next.timezone === existing.timezone
          ? existing.timezoneSource
          : undefined)
      : existing.timezoneSource,
    currencyCode:
      next.currencyCode ?? existing.currencyCode,
    placeId: next.placeId,
  };
}

export function assignTravelerTimeZone(
  destination: TripDestination,
  timezone: string | null,
): TripDestination {
  return {
    ...destination,
    ...travelerTimeZoneFields(timezone),
  };
}

export function assignTravelerTimeZoneToSelection(
  selection: DestinationSelection,
  timezone: string | null,
): DestinationSelection {
  return {
    ...selection,
    ...travelerTimeZoneFields(timezone),
  };
}

function travelerTimeZoneFields(
  timezone: string | null,
): Pick<
  DestinationSelection,
  'timezone' | 'timezoneSource'
> {
  if (timezone === null || timezone.trim() === '') {
    return {
      timezone: undefined,
      timezoneSource: undefined,
    };
  }

  const next = normalizeTimeZone(timezone);

  return {
    timezone: next,
    timezoneSource: next ? 'traveler' : undefined,
  };
}

export function preserveSelectionEnrichment(
  existing: DestinationSelection,
  replacement: DestinationSelection,
): DestinationSelection {
  return {
    ...replacement,
    timezone: replacement.timezone ?? existing.timezone,
    timezoneSource: replacement.timezone
      ? replacement.timezoneSource ?? existing.timezoneSource
      : existing.timezoneSource,
    currencyCode:
      replacement.currencyCode ?? existing.currencyCode,
    placeId: replacement.placeId ?? existing.placeId,
  };
}

export function hasRealDestinationCoordinates(
  destination: Pick<
    TripDestination,
    'latitude' | 'longitude'
  >,
): boolean {
  try {
    if (
      destination.latitude === undefined ||
      destination.longitude === undefined
    ) {
      return false;
    }

    assertCoordinates(
      destination.latitude,
      destination.longitude,
    );
    return true;
  } catch {
    return false;
  }
}

export function destinationAuthoringKind(
  destination: TripDestination,
): DestinationAuthoringKind {
  if (hasRealDestinationCoordinates(destination)) {
    return 'selected';
  }

  if (
    destination.countryCode !== undefined ||
    destination.latitude !== undefined ||
    destination.longitude !== undefined ||
    destination.timezone !== undefined ||
    destination.currencyCode !== undefined
  ) {
    return 'partially-enriched';
  }

  return 'manual';
}

export function mappedDestinations(
  destinations: readonly TripDestination[],
): MappedDestination[] {
  return destinations.flatMap((destination) =>
    hasRealDestinationCoordinates(destination)
      ? [
          {
            destination,
            coordinate: {
              latitude: destination.latitude as number,
              longitude: destination.longitude as number,
            },
          },
        ]
      : [],
  );
}

export function singleMappedDestinationCoordinate(
  destinations: readonly TripDestination[],
): MappedDestination['coordinate'] | undefined {
  const mapped = mappedDestinations(destinations);
  return mapped.length === 1
    ? mapped[0].coordinate
    : undefined;
}

export function tripDestinationLabel(
  destinations: readonly TripDestination[],
): string {
  const names = destinations
    .map((destination) => destination.name.trim())
    .filter(Boolean);

  if (names.length === 0) {
    return 'Your trip';
  }

  return names.join(' · ');
}
