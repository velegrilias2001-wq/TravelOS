import type {
  Traveler,
  TravelerId,
} from '../entities/traveler';

import type { TripId } from '../entities/trip';

export interface TravelerRepository {
  getById(
    id: TravelerId,
  ): Promise<Traveler | null>;

  getAll(): Promise<Traveler[]>;

  getByTripId(
    tripId: TripId,
  ): Promise<Traveler[]>;

  save(traveler: Traveler): Promise<void>;

  createForTrip(
    tripId: TripId,
    traveler: Traveler,
  ): Promise<void>;

  addToTrip(
    tripId: TripId,
    travelerId: TravelerId,
  ): Promise<void>;

  updateForTrip(
    tripId: TripId,
    traveler: Traveler,
  ): Promise<void>;

  removeFromTrip(
    tripId: TripId,
    travelerId: TravelerId,
  ): Promise<void>;

  delete(id: TravelerId): Promise<void>;
}
