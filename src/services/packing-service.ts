import * as Crypto from 'expo-crypto';

import type {
  PackingItem,
  PackingItemId,
} from '@/domain/entities/packing-item';
import type { TripId } from '@/domain/entities/trip';

import {
  packingProgress,
  type PackingProgress,
} from './packing-progress';
import {
  repositories,
  type RepositoryRegistry,
} from './repository-registry';

export type { PackingProgress };
export { packingProgress };

export class PackingService {
  constructor(
    private readonly repos: RepositoryRegistry =
      repositories,
    private readonly createId: () => string = () =>
      Crypto.randomUUID(),
    private readonly now: () => string = () =>
      new Date().toISOString(),
  ) {}

  async list(tripId: TripId): Promise<PackingItem[]> {
    const trip = await this.repos.trip.getById(tripId);

    if (!trip) {
      throw new Error('Trip was not found.');
    }

    return this.repos.packing.listByTripId(tripId);
  }

  async addItem(
    tripId: TripId,
    title: string,
  ): Promise<PackingItem> {
    const cleanTitle = title.trim();

    if (cleanTitle.length < 1) {
      throw new Error('Packing item needs a name.');
    }

    if (cleanTitle.length > 120) {
      throw new Error(
        'Packing item name must be 120 characters or fewer.',
      );
    }

    const trip = await this.repos.trip.getById(tripId);

    if (!trip) {
      throw new Error('Trip was not found.');
    }

    const existing =
      await this.repos.packing.listByTripId(tripId);
    const timestamp = this.now();

    const item: PackingItem = {
      id: this.createId(),
      tripId,
      title: cleanTitle,
      packed: false,
      position: existing.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.repos.packing.save(item);

    return item;
  }

  async setPacked(
    id: PackingItemId,
    packed: boolean,
  ): Promise<PackingItem> {
    const item = await this.repos.packing.getById(id);

    if (!item) {
      throw new Error('Packing item was not found.');
    }

    const updated: PackingItem = {
      ...item,
      packed,
      updatedAt: this.now(),
    };

    await this.repos.packing.save(updated);

    return updated;
  }

  async deleteItem(id: PackingItemId): Promise<void> {
    const item = await this.repos.packing.getById(id);

    if (!item) {
      return;
    }

    await this.repos.packing.delete(id);
  }
}

export const packingService = new PackingService();
