import type { TripId } from './trip';

export type PackingItemId = string;

/**
 * Traveler-authored packing checklist row.
 * Never AI-invented as truth.
 */
export interface PackingItem {
  id: PackingItemId;
  tripId: TripId;
  title: string;
  packed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}
