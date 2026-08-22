import * as Crypto from 'expo-crypto';

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

function addDays(
  date: string,
  amount: number,
): string {
  const [year, month, day] = date
    .split('-')
    .map(Number);

  const value = new Date(
    Date.UTC(year, month - 1, day + amount),
  );

  return value.toISOString().slice(0, 10);
}

function daysBetweenInclusive(
  startDate: string,
  endDate: string,
): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  const milliseconds =
    end.getTime() - start.getTime();

  return Math.floor(
    milliseconds / 86_400_000,
  ) + 1;
}

export class TripService {
  constructor(
    private readonly repo: RepositoryRegistry = repositories,
  ) {}

  async listTrips(): Promise<Trip[]> {
    return this.repo.trip.getAll();
  }

  async getTrip(
    id: TripId,
  ): Promise<Trip | null> {
    return this.repo.trip.getById(id);
  }

  async getWorkspace(
    id: TripId,
  ): Promise<TripWorkspace | null> {
    const trip = await this.repo.trip.getById(id);

    if (!trip) {
      return null;
    }

    await this.ensureTripDays(trip);

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

  async ensureTripDays(
    trip: Trip,
  ): Promise<void> {
    const existing =
      await this.repo.trip.getDays(trip.id);

    if (existing.length > 0) {
      return;
    }

    const count = daysBetweenInclusive(
      trip.startDate,
      trip.endDate,
    );

    const now = new Date().toISOString();

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const day: TripDay = {
        id: Crypto.randomUUID(),
        tripId: trip.id,
        date: addDays(trip.startDate, index),
        dayNumber: index + 1,
        createdAt: now,
        updatedAt: now,
      };

      await this.repo.trip.saveDay(day);
    }
  }

  async addStop(
    stop: TripStop,
  ): Promise<void> {
    await this.repo.trip.saveStop(stop);
  }

  async saveTrip(trip: Trip): Promise<void> {
    await this.repo.trip.save(trip);
  }

  async deleteTrip(id: TripId): Promise<void> {
    await this.repo.trip.delete(id);
  }
}

export const tripService = new TripService();