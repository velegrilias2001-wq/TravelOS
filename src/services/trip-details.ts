import type {
  Trip,
  TripDestination,
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

export interface TripDestinationEditInput {
  id: string;
  name: string;
  replacement?: DestinationSelection;
}

export interface TripDetailsInput {
  title: string;
  destinations: TripDestinationEditInput[];
  startDate: string;
  endDate: string;
  accountingCurrency: string;
  status: TripStatus;
}

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
    input.status === 'active' &&
    trip.status !== 'active'
  ) {
    throw new Error(
      'Active status cannot be set manually',
    );
  }

  if (
    input.destinations.length !==
    trip.destinations.length
  ) {
    throw new Error(
      'Destination records cannot be added or removed here',
    );
  }

  const destinations =
    trip.destinations.map(
      (destination, index) => {
        const update =
          input.destinations[index];

        if (
          !update ||
          update.id !== destination.id
        ) {
          throw new Error(
            'Destination identity or order changed unexpectedly',
          );
        }

        if (update.replacement) {
          return applyDestinationSelection(
            destination.id,
            update.replacement,
          );
        }

        const name = update.name.trim();

        if (!name) {
          throw new Error(
            'Every saved destination needs a name',
          );
        }

        if (
          hasStructuredDestinationMetadata(
            destination,
          ) &&
          name !== destination.name.trim()
        ) {
          throw new Error(
            'A structured destination needs a location-aware replacement flow',
          );
        }

        return {
          ...destination,
          name,
        };
      },
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

  return {
    ...trip,
    title,
    destinations,
    startDate: input.startDate,
    endDate: input.endDate,
    accountingCurrency,
    status: input.status,
    updatedAt,
  };
}
