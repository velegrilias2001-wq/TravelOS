import {
  accommodationRepository,
  bookingRepository,
  budgetRepository,
  fxRateRepository,
  memoryRepository,
  travelBookRepository,
  travelDNARepository,
  importRepository,
  savedPlaceRepository,
  travelerRepository,
  tripRepository,
  tripRuntimeStateRepository,
} from '@/data/repositories';

export const repositories = {
  trip: tripRepository,
  booking: bookingRepository,
  accommodation: accommodationRepository,
  budget: budgetRepository,
  fxRates: fxRateRepository,
  traveler: travelerRepository,
  memory: memoryRepository,
  travelBook: travelBookRepository,
  travelDNA: travelDNARepository,
  imports: importRepository,
  savedPlaces: savedPlaceRepository,
  runtimeState: tripRuntimeStateRepository,
} as const;

export type RepositoryRegistry = typeof repositories;
