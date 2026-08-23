import type { TripId } from './trip';
import type { TripDayId } from './trip-day';

export type TripStopId = string;

export type TripStopType =
  | 'place'
  | 'activity'
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'other';

export interface TripStopLocation {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

export interface TripStop {
  id: TripStopId;

  /**
   * Canonical links.
   */
  tripId: TripId;
  dayId: TripDayId;

  title: string;
  type: TripStopType;

  /**
   * Position inside the day itinerary.
   */
  order: number;

  location?: TripStopLocation;

  /**
   * Local wall-clock time in HH:mm. No timezone conversion is applied.
   */
  startTime?: string;
  endTime?: string;

  notes?: string;

  /**
   * True ISO instants used only for persistence metadata.
   */
  createdAt: string;
  updatedAt: string;
}
