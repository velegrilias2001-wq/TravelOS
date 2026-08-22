import type {
    Booking,
    BookingId,
} from '../entities/booking';

import type { TripId } from '../entities/trip';

export interface BookingRepository {
  getById(id: BookingId): Promise<Booking | null>;

  getByTripId(tripId: TripId): Promise<Booking[]>;

  save(booking: Booking): Promise<void>;

  delete(id: BookingId): Promise<void>;
}