import type {
    TravelBook,
    TravelBookId,
} from '../entities/travel-book';

import type { TripId } from '../entities/trip';

export interface TravelBookRepository {
  getById(
    id: TravelBookId,
  ): Promise<TravelBook | null>;

  getByTripId(
    tripId: TripId,
  ): Promise<TravelBook | null>;

  save(book: TravelBook): Promise<void>;

  delete(id: TravelBookId): Promise<void>;
}