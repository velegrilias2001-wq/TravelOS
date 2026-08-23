import type { BookingId } from './booking';
import type { TripId } from './trip';
import type { TripStopId } from './trip-stop';

export type AccommodationId = string;

export type AccommodationType =
  | 'hotel'
  | 'apartment'
  | 'hostel'
  | 'villa'
  | 'resort'
  | 'camping'
  | 'other';

export interface Accommodation {
  id: AccommodationId;
  tripId: TripId;
  stopId?: TripStopId;
  bookingId?: BookingId;

  name: string;
  type: AccommodationType;

  address?: string;
  latitude?: number;
  longitude?: number;

  /** Local wall-clock date-times; untouched legacy suffixes are preserved. */
  checkInAt?: string;
  checkOutAt?: string;

  phone?: string;
  website?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}
