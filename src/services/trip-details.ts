import type {
  Trip,
  TripDestination,
  TripStatus,
} from '@/domain/entities';

export interface TripDestinationNameInput {
  id: string;
  name: string;
}

export interface TripDetailsInput {
  title: string;
  destinations: TripDestinationNameInput[];
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

export function isCanonicalDateKey(
  value: string,
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateTripDateRange(
  startDate: string,
  endDate: string,
): void {
  if (
    !isCanonicalDateKey(startDate) ||
    !isCanonicalDateKey(endDate)
  ) {
    throw new Error(
      'Travel dates must be valid calendar dates',
    );
  }

  if (startDate > endDate) {
    throw new Error(
      'The start date cannot be after the end date',
    );
  }
}

export function hasStructuredDestinationMetadata(
  destination: TripDestination,
): boolean {
  return (
    destination.countryCode !== undefined ||
    destination.latitude !== undefined ||
    destination.longitude !== undefined ||
    destination.timezone !== undefined ||
    destination.currencyCode !== undefined
  );
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
