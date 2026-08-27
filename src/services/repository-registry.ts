import {
  accommodationRepository,
  bookingRepository,
  budgetRepository,
  memoryRepository,
  travelBookRepository,
  travelDNARepository,
  travelerRepository,
  tripRepository,
  tripRuntimeStateRepository,
} from '@/data/repositories';

export const repositories = {
  trip: tripRepository,
  booking: bookingRepository,
  accommodation: accommodationRepository,
  budget: budgetRepository,
  traveler: travelerRepository,
  memory: memoryRepository,
  travelBook: travelBookRepository,
  travelDNA: travelDNARepository,
  runtimeState: tripRuntimeStateRepository,
} as const;

export type RepositoryRegistry = typeof repositories;
