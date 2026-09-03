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
  TripDayId,
  TripFxRate,
  TripId,
  TripRuntimeState,
  TripStop,
  TripStopId,
  TripStopLivedPhase,
  TripStopLivedState,
} from '@/domain/entities';

import {
  repositories,
  type RepositoryRegistry,
} from './repository-registry';
import { buildCanonicalTripDays } from './trip-day-generation';
import {
  buildUpdatedTrip,
  type TripDetailsInput,
} from './trip-details';
import {
  validateBookingStopRelationship,
} from './booking-stop-relationship';
import {
  validateBookingTimeUpdate,
  validateNewBookingTimes,
} from './booking-time';
import {
  validateBookingFinance,
} from './booking-finance';
import {
  validateNewStopTimes,
  validateStopTimeUpdate,
} from './stop-time';
import { applyTripDayDestination } from './trip-day-destination';
import { createStopLivedState } from './stop-lived-progress';
import {
  discardOwnedMemoryMedia,
} from './memory-media';

export interface TripWorkspace {
  trip: Trip;

  days: TripDay[];
  stops: TripStop[];

  bookings: Booking[];
  accommodations: Accommodation[];

  travelers: Traveler[];

  budget: Budget | null;
  fxRates: TripFxRate[];

  runtimeState: TripRuntimeState | null;

  stopLivedStates: TripStopLivedState[];

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

  async listDaysForTrips(
    tripIds: readonly TripId[],
  ): Promise<TripDay[]> {
    return this.repo.trip.getDaysForTrips(tripIds);
  }

  async listWorldPlaceContext(
    tripIds: readonly TripId[],
  ): Promise<{
    days: TripDay[];
    stops: TripStop[];
    livedStates: TripStopLivedState[];
    memories: Memory[];
  }> {
    const [days, stops, livedStates, memories] =
      await Promise.all([
        this.repo.trip.getDaysForTrips(tripIds),
        this.repo.trip.getStopsForTrips(tripIds),
        this.repo.stopLivedStates.getByTripIds(
          tripIds,
        ),
        this.repo.memory.getByTripIds(tripIds),
      ]);

    return { days, stops, livedStates, memories };
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
      fxRates,
      runtimeState,
      stopLivedStates,
      memories,
      travelBook,
    ] = await Promise.all([
      this.repo.trip.getDays(id),
      this.repo.trip.getStops(id),
      this.repo.booking.getByTripId(id),
      this.repo.accommodation.getByTripId(id),
      this.repo.traveler.getByTripId(id),
      this.repo.budget.getByTripId(id),
      this.repo.fxRates.getByTripId(id),
      this.repo.runtimeState.getByTripId(id),
      this.repo.stopLivedStates.getByTripId(id),
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
      fxRates,
      runtimeState,
      stopLivedStates,
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
    validateNewStopTimes(stop);
    await this.repo.trip.saveStop(stop);
  }

  async updateStop(
    stop: TripStop,
  ): Promise<void> {
    const existing =
      await this.repo.trip.getStopById(stop.id);

    if (!existing) {
      throw new Error('Itinerary stop was not found');
    }

    validateStopTimeUpdate(existing, stop);

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
    validateNewBookingTimes(booking);
    validateBookingFinance(booking);
    await this.validateBookingStop(booking);

    await this.repo.booking.save(
      booking,
    );
  }

  async updateBooking(
    booking: Booking,
  ): Promise<void> {
    const existing =
      await this.repo.booking.getById(booking.id);

    if (!existing) {
      throw new Error('Booking was not found');
    }

    validateBookingTimeUpdate(existing, booking);
    validateBookingFinance(booking);
    await this.validateBookingStop(booking);

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

  private async validateBookingStop(
    booking: Booking,
  ): Promise<void> {
    const stop = booking.stopId
      ? await this.repo.trip.getStopById(
          booking.stopId,
        )
      : null;

    validateBookingStopRelationship(
      booking,
      stop,
    );
  }

  async saveTrip(
    trip: Trip,
  ): Promise<void> {
    await this.repo.trip.save(trip);
  }

  async updateTrip(
    id: TripId,
    input: TripDetailsInput,
  ): Promise<Trip> {
    const trip =
      await this.repo.trip.getById(id);

    if (!trip) {
      throw new Error('Trip was not found');
    }

    const budget =
      await this.repo.budget.getByTripId(id);

    const updated = buildUpdatedTrip(
      trip,
      input,
      budget !== null,
      new Date().toISOString(),
    );

    await this.repo.trip.save(updated);

    return updated;
  }

  async deleteTrip(
    id: TripId,
  ): Promise<void> {
    const memories =
      await this.repo.memory.getByTripId(id);

    await this.repo.trip.delete(id);
    await discardOwnedMemoryMedia(
      memories.map((memory) => memory.mediaUri),
    );
  }

  async assignDayDestination(
    tripId: TripId,
    dayId: TripDayId,
    destinationId: string | null,
  ): Promise<void> {
    const trip =
      await this.repo.trip.getById(tripId);

    if (!trip) {
      throw new Error('Trip was not found');
    }

    const days =
      await this.repo.trip.getDays(tripId);

    const day = days.find(
      (item) => item.id === dayId,
    );

    if (!day) {
      throw new Error('That day was not found');
    }

    const updated = applyTripDayDestination(
      day,
      trip,
      destinationId,
      new Date().toISOString(),
    );

    await this.repo.trip.saveDay(updated);
  }

  async recordStopLivedPhase(
    tripId: TripId,
    stopId: TripStopId,
    phase: TripStopLivedPhase,
  ): Promise<void> {
    const stop =
      await this.repo.trip.getStopById(stopId);

    if (!stop) {
      throw new Error('That stop was not found');
    }

    const now = new Date().toISOString();
    const state = createStopLivedState(
      stop,
      tripId,
      phase,
      now,
    );

    await this.repo.stopLivedStates.saveProgress(
      state,
      stop,
      now,
    );
  }

  async clearStopLivedPhase(
    tripId: TripId,
    stopId: TripStopId,
  ): Promise<void> {
    const stop =
      await this.repo.trip.getStopById(stopId);

    if (!stop || stop.tripId !== tripId) {
      throw new Error('That stop was not found');
    }

    await this.repo.stopLivedStates.clearProgress(
      tripId,
      stopId,
      new Date().toISOString(),
    );
  }
}

export const tripService =
  new TripService();
