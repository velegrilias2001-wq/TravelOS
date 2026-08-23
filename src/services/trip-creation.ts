import type { Trip } from '@/domain/entities';

import {
  applyDestinationSelection,
  type DestinationSelection,
} from './destination-authoring';
import { validateCalendarDateRange } from './time-truth';

export interface NewTripInput {
  title: string;
  destination: DestinationSelection;
  startDate: string;
  endDate: string;
  accountingCurrency: string;
}

export interface NewTripIdentityFactory {
  tripId(): string;
  destinationId(): string;
}

export function buildNewTrip(
  input: NewTripInput,
  identities: NewTripIdentityFactory,
  timestamp: string,
): Trip {
  const title = input.title.trim();
  const accountingCurrency =
    input.accountingCurrency.trim().toUpperCase();

  if (!title) {
    throw new Error(
      'Trip name is required',
    );
  }

  validateCalendarDateRange(
    input.startDate,
    input.endDate,
  );

  if (!/^[A-Z]{3}$/.test(accountingCurrency)) {
    throw new Error(
      'Accounting currency must be a three-letter code',
    );
  }

  return {
    id: identities.tripId(),
    title,
    status: 'planned',
    destinations: [
      applyDestinationSelection(
        identities.destinationId(),
        input.destination,
      ),
    ],
    startDate: input.startDate,
    endDate: input.endDate,
    travelerIds: [],
    accountingCurrency,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
