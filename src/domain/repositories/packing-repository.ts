import type {
  PackingItem,
  PackingItemId,
} from '../entities/packing-item';
import type { TripId } from '../entities/trip';

export interface PackingRepository {
  listByTripId(tripId: TripId): Promise<PackingItem[]>;

  getById(id: PackingItemId): Promise<PackingItem | null>;

  save(item: PackingItem): Promise<void>;

  delete(id: PackingItemId): Promise<void>;
}
