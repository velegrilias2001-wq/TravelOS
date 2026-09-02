import type {
  Trip,
  TripIntent,
  TripPace,
} from '@/domain/entities';

import {
  applyDestinationSelection,
  type DestinationSelection,
} from './destination-authoring';

import {
  validateCalendarDateRange,
} from './time-truth';
import { MAX_TRIP_DESTINATIONS } from './trip-details';

export interface NewTripInput {
  title: string;
  destinations: DestinationSelection[];
  startDate: string;
  endDate: string;
  accountingCurrency: string;
  intent?: TripIntent;
  pace?: TripPace;
}

export interface NewTripIdentityFactory {
  tripId(): string;
  destinationId(): string;
}

const TRIP_INTENTS: TripIntent[] = [
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

const TRIP_PACES: TripPace[] = [
  'slow',
  'balanced',
  'full',
];

export function buildNewTrip(
  input: NewTripInput,
  identities: NewTripIdentityFactory,
  timestamp: string,
): Trip {
  const title = input.title.trim();

  const accountingCurrency =
    input.accountingCurrency
      .trim()
      .toUpperCase();

  if (!title) {
    throw new Error(
      'Trip name is required',
    );
  }

  validateCalendarDateRange(
    input.startDate,
    input.endDate,
  );

  if (
    !/^[A-Z]{3}$/.test(accountingCurrency)
  ) {
    throw new Error(
      'Accounting currency must be a three-letter code',
    );
  }

  if (
    input.intent !== undefined &&
    !TRIP_INTENTS.includes(input.intent)
  ) {
    throw new Error(
      'Trip intent is not supported',
    );
  }

  if (
    input.pace !== undefined &&
    !TRIP_PACES.includes(input.pace)
  ) {
    throw new Error(
      'Trip pace is not supported',
    );
  }

  if (input.destinations.length === 0) {
    throw new Error(
      'Choose a destination from the map',
    );
  }

  if (input.destinations.length > MAX_TRIP_DESTINATIONS) {
    throw new Error(
      `A trip can have at most ${MAX_TRIP_DESTINATIONS} destinations`,
    );
  }

  return {
    id: identities.tripId(),
    title,
    status: 'planned',
    intent: input.intent,
    pace: input.pace,
    destinations: input.destinations.map((destination) =>
      applyDestinationSelection(
        identities.destinationId(),
        destination,
      ),
    ),
    startDate: input.startDate,
    endDate: input.endDate,
    travelerIds: [],
    accountingCurrency,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
