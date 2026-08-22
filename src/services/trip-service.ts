import type {
    Accommodation,
    Booking,
    Budget,
    Memory,
    TravelBook,
    Traveler,
    Trip,
    TripDay,
    TripId,
    TripRuntimeState,
    TripStop,
} from '@/domain/entities';

import {
    repositories,
    type RepositoryRegistry,
} from './repository-registry';

export interface TripWorkspace {
  trip: Trip;
  days: TripDay[];
  stops: TripStop[];
  bookings: Booking[];
  accommodations: Accommodation[];
  travelers: Traveler[];
  budget: Budget | null;
  runtimeState: TripRuntimeState | null;
  memories: Memory[];
  travelBook: TravelBook | null;
}

export class TripService {
  constructor(
    private readonly repo: RepositoryRegistry = repositories,
  ) {}

  async listTrips(): Promise<Trip[]> {
    return this.repo.trip.getAll();
  }

  async getTrip(id: TripId): Promise<Trip | null> {
    return this.repo.trip.getById(id);
  }

  async getWorkspace(
    id: TripId,
  ): Promise<TripWorkspace | null> {
    const trip = await this.repo.trip.getById(id);

    if (!trip) {
      return null;
    }

    const [
      days,
      stops,
      bookings,
      accommodations,
      travelers,
      budget,
      runtimeState,
      memories,
      travelBook,
    ] = await Promise.all([
      this.repo.trip.getDays(id),
      this.repo.trip.getStops(id),
      this.repo.booking.getByTripId(id),
      this.repo.accommodation.getByTripId(id),
      this.repo.traveler.getByTripId(id),
      this.repo.budget.getByTripId(id),
      this.repo.runtimeState.getByTripId(id),
      this.repo.memory.getByTripId(id),
      this.repo.travelBook.getByTripId(id),
    ]);

    return {
      trip,
      days,
      stops,
      bookings,
      accommodations,
      travelers,
      budget,
      runtimeState,
      memories,
      travelBook,
    };
  }

  async saveTrip(trip: Trip): Promise<void> {
    await this.repo.trip.save(trip);
  }

  async deleteTrip(id: TripId): Promise<void> {
    await this.repo.trip.delete(id);
  }
}

export const tripService = new TripService();