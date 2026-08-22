import type { TripId } from './trip';
import type { TripDayId } from './trip-day';
import type { TripStopId } from './trip-stop';

export type MemoryId = string;

export type MemoryType =
  | 'photo'
  | 'video'
  | 'note';

export interface Memory {
  id: MemoryId;

  tripId: TripId;
  dayId?: TripDayId;
  stopId?: TripStopId;

  type: MemoryType;

  title?: string;
  caption?: string;

  mediaUri?: string;

  /**
   * ISO timestamp representing when
   * the memory actually happened.
   */
  capturedAt: string;

  createdAt: string;
  updatedAt: string;
}