import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
  Accommodation,
  AccommodationId,
} from '../../domain/entities/accommodation';

import type { BookingId } from '../../domain/entities/booking';
import type { TripId } from '../../domain/entities/trip';
import type { TripStopId } from '../../domain/entities/trip-stop';
import type { AccommodationRepository } from '../../domain/repositories/accommodation-repository';

import {
  deleteCanonicalAccommodation,
  getAccommodationById,
  getAccommodationsByBookingId,
  getAccommodationsByStopId,
  getAccommodationsByTripId,
  saveCanonicalAccommodation,
} from './accommodation-persistence-operations';

export class SQLiteAccommodationRepository
  implements AccommodationRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getById(
    id: AccommodationId,
  ): Promise<Accommodation | null> {
    return getAccommodationById(
      this.database,
      id,
    );
  }

  async getByTripId(
    tripId: TripId,
  ): Promise<Accommodation[]> {
    return getAccommodationsByTripId(
      this.database,
      tripId,
    );
  }

  async getByBookingId(
    bookingId: BookingId,
  ): Promise<Accommodation[]> {
    return getAccommodationsByBookingId(
      this.database,
      bookingId,
    );
  }

  async getByStopId(
    stopId: TripStopId,
  ): Promise<Accommodation[]> {
    return getAccommodationsByStopId(
      this.database,
      stopId,
    );
  }

  async save(accommodation: Accommodation): Promise<void> {
    await saveCanonicalAccommodation(
      this.database,
      accommodation,
    );
  }

  async delete(id: AccommodationId): Promise<void> {
    await deleteCanonicalAccommodation(
      this.database,
      id,
    );
  }
}

export const accommodationRepository =
  new SQLiteAccommodationRepository();
