import type {
  SavedPlace,
  SavedPlaceId,
} from '../entities/saved-place';

export interface SavedPlaceRepository {
  list(): Promise<SavedPlace[]>;

  getByIdentity(
    groundedIdentity: string,
  ): Promise<SavedPlace | null>;

  save(place: SavedPlace): Promise<void>;

  delete(id: SavedPlaceId): Promise<void>;
}
