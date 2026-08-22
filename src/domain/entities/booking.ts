import type { TripId } from './trip';
import type { TripStopId } from './trip-stop';

export type BookingId = string;

export type BookingType =
  | 'flight'
  | 'train'
  | 'bus'
  | 'ferry'
  | 'car'
  | 'accommodation'
  | 'activity'
  | 'restaurant'
  | 'ticket'
  | 'other';

export type BookingStatus =
  | 'planned'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

export interface Booking {
  id: BookingId;

  /**
   * Canonical link to the parent trip.
   */
  tripId: TripId;

  /**
   * Optional link to a specific itinerary stop.
   */
  stopId?: TripStopId;

  type: BookingType;
  status: BookingStatus;

  title: string;

  provider?: string;

  /**
   * Booking / reservation / confirmation code.
   */
  confirmationCode?: string;

  /**
   * ISO date-time strings when available.
   */
  startAt?: string;
  endAt?: string;

  /**
   * Financial truth for this booking.
   * Currency is stored explicitly and must not
   * be inferred from the destination.
   */
  amount?: number;
  currencyCode?: string;

  isPaid?: boolean;

  notes?: string;

  /**
   * Optional external reference.
   * Example: airline or hotel booking page.
   */
  externalUrl?: string;

  createdAt: string;
  updatedAt: string;
}