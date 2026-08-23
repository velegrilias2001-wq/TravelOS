import * as Crypto from 'expo-crypto';

import type {
  Accommodation,
  Booking,
  BookingId,
  Budget,
  Memory,
  TravelBook,
  Traveler,
  Trip,
  TripDay,
  TripId,
  TripRuntimeState,
  TripStop,
  TripStopId,
} from '@/domain/entities';

import {
  repositories,
  type RepositoryRegistry,
} from './repository-registry';
import { buildCanonicalTripDays } from './trip-day-generation';

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
    private readonly repo:
      RepositoryRegistry = repositories,
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
    const trip =
      await this.repo.trip.getById(id);

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
    const now =
      new Date().toISOString();

    const days =
      buildCanonicalTripDays(
        trip,
        () => Crypto.randomUUID(),
        now,
      );

    await this.repo.trip.ensureDays(
      days,
    );
  }

  async addStop(
    stop: TripStop,
  ): Promise<void> {
    await this.repo.trip.saveStop(stop);
  }

  async updateStop(
    stop: TripStop,
  ): Promise<void> {
    await this.repo.trip.saveStop({
      ...stop,
      updatedAt:
        new Date().toISOString(),
    });
  }

  async deleteStop(
    stopId: TripStopId,
  ): Promise<void> {
    await this.repo.trip.deleteStop(
      stopId,
    );
  }

  async reorderStops(
    stops: TripStop[],
  ): Promise<void> {
    const now =
      new Date().toISOString();

    await this.repo.trip.reorderStops(
      stops.map(
        (stop, index) => ({
          ...stop,
          order: index + 1,
          updatedAt: now,
        }),
      ),
    );
  }

  async addBooking(
    booking: Booking,
  ): Promise<void> {
    await this.repo.booking.save(
      booking,
    );
  }

  async updateBooking(
    booking: Booking,
  ): Promise<void> {
    await this.repo.booking.save({
      ...booking,

      updatedAt:
        new Date().toISOString(),
    });
  }

  async deleteBooking(
    bookingId: BookingId,
  ): Promise<void> {
    await this.repo.booking.delete(
      bookingId,
    );
  }

  async getBooking(
    bookingId: BookingId,
  ): Promise<Booking | null> {
    return this.repo.booking.getById(
      bookingId,
    );
  }

  async saveTrip(
    trip: Trip,
  ): Promise<void> {
    await this.repo.trip.save(trip);
  }

  async deleteTrip(
    id: TripId,
  ): Promise<void> {
    await this.repo.trip.delete(id);
  }
}

export const tripService =
  new TripService();
