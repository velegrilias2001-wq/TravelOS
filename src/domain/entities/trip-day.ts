import type { TripId } from './trip';

export type TripDayId = string;

export interface TripDay {
  id: TripDayId;

  /**
   * Canonical link to the parent trip.
   */
  tripId: TripId;

  /**
   * ISO date format:
   * YYYY-MM-DD
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
   * ISO timestamps.
   */
  createdAt: string;
  updatedAt: string;
}