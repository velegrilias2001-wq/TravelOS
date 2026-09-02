import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
  SavedPlace,
  SavedPlaceId,
} from '../../domain/entities';
import type {
  SavedPlaceRepository,
} from '../../domain/repositories/saved-place-repository';

import {
  deleteSavedPlace,
  getSavedPlaceByIdentity,
  listSavedPlaces,
  saveSavedPlace,
} from './saved-place-persistence-operations';

export class SQLiteSavedPlaceRepository
  implements SavedPlaceRepository
{
  constructor(
    private readonly database: Database =
      travelOSDatabase,
  ) {}

  async list(): Promise<SavedPlace[]> {
    return listSavedPlaces(this.database);
  }

  async getByIdentity(
    groundedIdentity: string,
  ): Promise<SavedPlace | null> {
    return getSavedPlaceByIdentity(
      this.database,
      groundedIdentity,
    );
  }

  async save(place: SavedPlace): Promise<void> {
    await saveSavedPlace(this.database, place);
  }

  async delete(id: SavedPlaceId): Promise<void> {
    await deleteSavedPlace(this.database, id);
  }
}

export const savedPlaceRepository =
  new SQLiteSavedPlaceRepository();
