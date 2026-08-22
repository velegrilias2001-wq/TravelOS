import type {
    Memory,
    MemoryId,
} from '../entities/memory';

import type { TripId } from '../entities/trip';

export interface MemoryRepository {
  getByTripId(tripId: TripId): Promise<Memory[]>;

  getById(id: MemoryId): Promise<Memory | null>;

  save(memory: Memory): Promise<void>;

  delete(id: MemoryId): Promise<void>;
}