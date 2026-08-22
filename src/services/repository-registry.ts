import {
    accommodationRepository,
    bookingRepository,
    budgetRepository,
    memoryRepository,
    travelBookRepository,
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
  runtimeState: tripRuntimeStateRepository,
  travelBook: travelBookRepository,
} as const;

export type RepositoryRegistry = typeof repositories;