import type { MemoryId } from './memory';
import type { TripId } from './trip';

export type TravelBookId = string;

export interface TravelBook {
  id: TravelBookId;
  tripId: TripId;

  title: string;

  coverImageUri?: string;

  /**
   * Ordered memories shown in the travel story.
   */
  memoryIds: MemoryId[];

  summary?: string;

  isPublished: boolean;

  createdAt: string;
  updatedAt: string;
}