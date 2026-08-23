import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
  Traveler,
  TravelerId,
} from '../../domain/entities/traveler';

import type { TripId } from '../../domain/entities/trip';
import type { TravelerRepository } from '../../domain/repositories/traveler-repository';

import {
  addTravelerToTrip,
  createTravelerForTrip,
  deleteCanonicalTraveler,
  getAllTravelers,
  getTravelerById,
  getTravelersByTripId,
  removeTravelerFromTrip,
  saveCanonicalTraveler,
  updateTravelerForTrip,
} from './traveler-persistence-operations';

export class SQLiteTravelerRepository
  implements TravelerRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getById(id: TravelerId): Promise<Traveler | null> {
    return getTravelerById(
      this.database,
      id,
    );
  }

  async getAll(): Promise<Traveler[]> {
    return getAllTravelers(this.database);
  }

  async getByTripId(tripId: TripId): Promise<Traveler[]> {
    return getTravelersByTripId(
      this.database,
      tripId,
    );
  }

  async save(traveler: Traveler): Promise<void> {
    await saveCanonicalTraveler(
      this.database,
      traveler,
    );
  }

  async createForTrip(
    tripId: TripId,
    traveler: Traveler,
  ): Promise<void> {
    await createTravelerForTrip(
      this.database,
      tripId,
      traveler,
    );
  }

  async addToTrip(
    tripId: TripId,
    travelerId: TravelerId,
  ): Promise<void> {
    await addTravelerToTrip(
      this.database,
      tripId,
      travelerId,
    );
  }

  async updateForTrip(
    tripId: TripId,
    traveler: Traveler,
  ): Promise<void> {
    await updateTravelerForTrip(
      this.database,
      tripId,
      traveler,
    );
  }

  async removeFromTrip(
    tripId: TripId,
    travelerId: TravelerId,
  ): Promise<void> {
    await removeTravelerFromTrip(
      this.database,
      tripId,
      travelerId,
    );
  }

  async delete(id: TravelerId): Promise<void> {
    await deleteCanonicalTraveler(
      this.database,
      id,
    );
  }
}

export const travelerRepository =
  new SQLiteTravelerRepository();
