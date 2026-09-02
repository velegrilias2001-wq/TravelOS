import type {
  Trip,
  TripDestination,
  TripIntent,
  TripPace,
  TripStatus,
} from '@/domain/entities';

import {
  applyDestinationSelection,
  destinationAuthoringKind,
  type DestinationSelection,
} from './destination-authoring';
import {
  isCanonicalDateKey,
  validateCalendarDateRange,
} from './time-truth';

export { isCanonicalDateKey };

export const MAX_TRIP_DESTINATIONS = 8;

export interface TripDestinationEditInput {
  id: string;
  name: string;
  replacement?: DestinationSelection;
}

export function moveDestinationItems<Item>(
  items: readonly Item[],
  index: number,
  delta: number,
): Item[] {
  const next = [...items];
  const target = index + delta;

  if (
    index < 0 ||
    index >= next.length ||
    target < 0 ||
    target >= next.length
  ) {
    return next;
  }

  const [moved] = next.splice(index, 1);

  if (moved === undefined) {
    return [...items];
  }

  next.splice(target, 0, moved);
  return next;
}

export interface TripDetailsInput {
  title: string;
  destinations: TripDestinationEditInput[];
  startDate: string;
  endDate: string;
  accountingCurrency: string;
  status: TripStatus;

  /**
   * undefined means "leave the current value unchanged".
   * null explicitly clears the trip-specific preference.
   */
  intent?: TripIntent | null;
  pace?: TripPace | null;
}

export const TRIP_INTENTS: TripIntent[] = [
  'relax',
  'explore',
  'food',
  'nature',
  'event',
  'social',
  'romantic',
  'family',
  'work_leisure',
  'other',
];

export const TRIP_PACES: TripPace[] = [
  'slow',
  'balanced',
  'full',
];

const TRIP_STATUSES: TripStatus[] = [
  'draft',
  'planned',
  'active',
  'completed',
  'archived',
];

export function validateTripDateRange(
  startDate: string,
  endDate: string,
): void {
  validateCalendarDateRange(startDate, endDate);
}

export function hasStructuredDestinationMetadata(
  destination: TripDestination,
): boolean {
  return destinationAuthoringKind(destination) !== 'manual';
}

export function buildUpdatedTrip(
  trip: Trip,
  input: TripDetailsInput,
  hasPersistedBudget: boolean,
  updatedAt: string,
): Trip {
  const title = input.title.trim();
  const accountingCurrency =
    input.accountingCurrency
      .trim()
      .toUpperCase();

  if (!title) {
    throw new Error(
      'Trip title is required',
    );
  }

  validateTripDateRange(
    input.startDate,
    input.endDate,
  );

  if (!/^[A-Z]{3}$/.test(accountingCurrency)) {
    throw new Error(
      'Accounting currency must be a three-letter code',
    );
  }

  if (!TRIP_STATUSES.includes(input.status)) {
    throw new Error(
      'Trip status is not supported',
    );
  }

  if (
    input.intent !== undefined &&
    input.intent !== null &&
    !TRIP_INTENTS.includes(input.intent)
  ) {
    throw new Error(
      'Trip intent is not supported',
    );
  }

  if (
    input.pace !== undefined &&
    input.pace !== null &&
    !TRIP_PACES.includes(input.pace)
  ) {
    throw new Error(
      'Trip pace is not supported',
    );
  }

  if (
    input.status === 'active' &&
    trip.status !== 'active'
  ) {
    throw new Error(
      'Active status cannot be set manually',
    );
  }

  const destinations = applyDestinationEdits(
    trip.destinations,
    input.destinations,
  );

  if (
    hasPersistedBudget &&
    accountingCurrency !==
      trip.accountingCurrency
        .trim()
        .toUpperCase()
  ) {
    throw new Error(
      'Accounting currency cannot change while this trip has a saved budget',
    );
  }

  const intent =
    input.intent === undefined
      ? trip.intent
      : input.intent ?? undefined;

  const pace =
    input.pace === undefined
      ? trip.pace
      : input.pace ?? undefined;

  return {
    ...trip,
    title,
    intent,
    pace,
    destinations,
    startDate: input.startDate,
    endDate: input.endDate,
    accountingCurrency,
    status: input.status,
    updatedAt,
  };
}

function applyDestinationEdits(
  current: TripDestination[],
  edits: TripDestinationEditInput[],
): TripDestination[] {
  if (edits.length > MAX_TRIP_DESTINATIONS) {
    throw new Error(
      `A trip can have at most ${MAX_TRIP_DESTINATIONS} destinations`,
    );
  }

  if (edits.length === 0 && current.length > 0) {
    throw new Error(
      'A trip needs at least one destination',
    );
  }

  const existingById = new Map(
    current.map((destination) => [
      destination.id,
      destination,
    ]),
  );
  const seen = new Set<string>();

  return edits.map((edit) => {
    if (!edit.id.trim()) {
      throw new Error(
        'Every destination needs a stable identity',
      );
    }

    if (seen.has(edit.id)) {
      throw new Error(
        'Destination identity is duplicated',
      );
    }

    seen.add(edit.id);

    const existing = existingById.get(edit.id);

    if (!existing) {
      if (!edit.replacement) {
        throw new Error(
          'A new destination needs a map location',
        );
      }

      return applyDestinationSelection(
        edit.id,
        edit.replacement,
      );
    }

    if (edit.replacement) {
      return applyDestinationSelection(
        existing.id,
        edit.replacement,
      );
    }

    const name = edit.name.trim();

    if (!name) {
      throw new Error(
        'Every saved destination needs a name',
      );
    }

    if (
      hasStructuredDestinationMetadata(existing) &&
      name !== existing.name.trim()
    ) {
      throw new Error(
        'A structured destination needs a location-aware replacement flow',
      );
    }

    return {
      ...existing,
      name,
    };
  });
}
