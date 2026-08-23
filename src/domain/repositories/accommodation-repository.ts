import type {
    Accommodation,
    AccommodationId,
} from '../entities/accommodation';

import type { TripId } from '../entities/trip';
import type { BookingId } from '../entities/booking';
import type { TripStopId } from '../entities/trip-stop';

export interface AccommodationRepository {
  getById(
    id: AccommodationId,
  ): Promise<Accommodation | null>;

  getByTripId(
    tripId: TripId,
  ): Promise<Accommodation[]>;

  getByBookingId(
    bookingId: BookingId,
  ): Promise<Accommodation[]>;

  getByStopId(
    stopId: TripStopId,
  ): Promise<Accommodation[]>;

  save(accommodation: Accommodation): Promise<void>;

  delete(id: AccommodationId): Promise<void>;
}
