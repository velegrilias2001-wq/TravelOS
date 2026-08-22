import type {
    Traveler,
    TravelerId,
} from '../entities/traveler';

import type { TripId } from '../entities/trip';

export interface TravelerRepository {
  getById(
    id: TravelerId,
  ): Promise<Traveler | null>;

  getByTripId(
    tripId: TripId,
  ): Promise<Traveler[]>;

  save(traveler: Traveler): Promise<void>;

  delete(id: TravelerId): Promise<void>;
}