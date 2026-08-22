import type {
    Accommodation,
    AccommodationId,
} from '../entities/accommodation';

import type { TripId } from '../entities/trip';

export interface AccommodationRepository {
  getById(
    id: AccommodationId,
  ): Promise<Accommodation | null>;

  getByTripId(
    tripId: TripId,
  ): Promise<Accommodation[]>;

  save(accommodation: Accommodation): Promise<void>;

  delete(id: AccommodationId): Promise<void>;
}