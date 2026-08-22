import type { BookingId } from './booking';
import type { TripId } from './trip';

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
  bookingId?: BookingId;

  name: string;
  type: AccommodationType;

  address?: string;
  latitude?: number;
  longitude?: number;

  checkInAt?: string;
  checkOutAt?: string;

  phone?: string;
  website?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}