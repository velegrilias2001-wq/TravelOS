import type { TripId } from './trip';

export type TripDayId = string;

export interface TripDay {
  id: TripDayId;

  /**
   * Canonical link to the parent trip.
   */
  tripId: TripId;

  /**
   * Calendar date in YYYY-MM-DD. This is not an instant.
   */
  date: string;

  /**
   * Position of the day inside the trip.
   * Starts from 1.
   */
  dayNumber: number;

  /**
   * Optional user-facing title.
   * Example: "Arrival in Tokyo"
   */
  title?: string;

  /**
   * Optional free-form notes for the day.
   */
  notes?: string;

  /**
   * Optional canonical link to one destination on
   * this trip. Never inferred from destination order
   * or display names. Unassigned is a valid state.
   */
  destinationId?: string;

  /**
   * True ISO instants used only for persistence metadata.
   */
  createdAt: string;
  updatedAt: string;
}
