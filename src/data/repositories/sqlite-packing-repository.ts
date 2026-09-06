import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
  PackingItem,
  PackingItemId,
} from '../../domain/entities/packing-item';
import type { TripId } from '../../domain/entities/trip';
import type { PackingRepository } from '../../domain/repositories/packing-repository';

import {
  deletePackingItem,
  getPackingItem,
  listPackingItemsByTripId,
  savePackingItem,
} from './packing-persistence-operations';

export class SQLitePackingRepository
  implements PackingRepository
{
  constructor(
    private readonly database: Database =
      travelOSDatabase,
  ) {}

  async listByTripId(
    tripId: TripId,
  ): Promise<PackingItem[]> {
    return listPackingItemsByTripId(
      this.database,
      tripId,
    );
  }

  async getById(
    id: PackingItemId,
  ): Promise<PackingItem | null> {
    return getPackingItem(this.database, id);
  }

  async save(item: PackingItem): Promise<void> {
    await savePackingItem(this.database, item);
  }

  async delete(id: PackingItemId): Promise<void> {
    await deletePackingItem(this.database, id);
  }
}

export const packingRepository =
  new SQLitePackingRepository();
