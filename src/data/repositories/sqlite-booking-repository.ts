import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
    Booking,
    BookingId,
} from '../../domain/entities/booking';

import type { TripId } from '../../domain/entities/trip';
import type { TripStopId } from '../../domain/entities/trip-stop';

import type { BookingRepository } from '../../domain/repositories/booking-repository';

import {
  deleteCanonicalBooking,
  getBookingById,
  getBookingsByStopId,
  getBookingsByTripId,
  saveCanonicalBooking,
} from './booking-persistence-operations';

export class SQLiteBookingRepository
  implements BookingRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getById(
    id: BookingId,
  ): Promise<Booking | null> {
    return getBookingById(
      this.database,
      id,
    );
  }

  async getByTripId(
    tripId: TripId,
  ): Promise<Booking[]> {
    return getBookingsByTripId(
      this.database,
      tripId,
    );
  }

  async getByStopId(
    stopId: TripStopId,
  ): Promise<Booking[]> {
    return getBookingsByStopId(
      this.database,
      stopId,
    );
  }

  async save(booking: Booking): Promise<void> {
    await saveCanonicalBooking(
      this.database,
      booking,
    );
  }

  async delete(id: BookingId): Promise<void> {
    await deleteCanonicalBooking(
      this.database,
      id,
    );
  }
}

export const bookingRepository =
  new SQLiteBookingRepository();
