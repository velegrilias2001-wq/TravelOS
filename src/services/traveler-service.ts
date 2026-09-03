import * as Crypto from 'expo-crypto';

import type {
  Traveler,
  TravelerId,
  TripId,
} from '@/domain/entities';

import {
  cleanTravelerInput,
  type TravelerInput,
} from './traveler-details';
import {
  repositories,
  type RepositoryRegistry,
} from './repository-registry';

export class TravelerService {
  constructor(
    private readonly repo:
      RepositoryRegistry = repositories,
    private readonly createId: () => string =
      () => Crypto.randomUUID(),
    private readonly now: () => string =
      () => new Date().toISOString(),
  ) {}

  async listTravelers(): Promise<Traveler[]> {
    return this.repo.traveler.getAll();
  }

  async createTraveler(
    tripId: TripId,
    input: TravelerInput,
  ): Promise<void> {
    const cleanInput = cleanTravelerInput(input);
    const timestamp = this.now();

    await this.repo.traveler.createForTrip(
      tripId,
      {
        id: this.createId(),
        ...cleanInput,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    );
  }

  async addExistingTraveler(
    tripId: TripId,
    travelerId: TravelerId,
  ): Promise<void> {
    await this.repo.traveler.addToTrip(
      tripId,
      travelerId,
    );
  }

  async updateTraveler(
    tripId: TripId,
    travelerId: TravelerId,
    input: TravelerInput,
  ): Promise<void> {
    const existing =
      await this.repo.traveler.getById(
        travelerId,
      );

    if (!existing) {
      throw new Error('Traveler was not found');
    }

    const cleanInput = cleanTravelerInput(input);

    await this.repo.traveler.updateForTrip(
      tripId,
      {
        ...existing,
        ...cleanInput,
        updatedAt: this.now(),
      },
    );
  }

  async removeTraveler(
    tripId: TripId,
    travelerId: TravelerId,
  ): Promise<void> {
    await this.repo.traveler.removeFromTrip(
      tripId,
      travelerId,
    );
  }

  async setTripOwner(
    tripId: TripId,
    travelerId: TravelerId | null,
  ): Promise<void> {
    await this.repo.traveler.setTripOwner(
      tripId,
      travelerId,
    );
  }
}

export const travelerService =
  new TravelerService();
