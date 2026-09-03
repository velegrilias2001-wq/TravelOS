import type { TripId } from './trip';
import type { TripStopId } from './trip-stop';

export type TripStopLivedPhase = 'done' | 'skipped';

/**
 * Explicit traveler progress for one planned stop.
 * Delayed is not stored here; Companion derives it.
 * Plan stop times are never rewritten.
 */
export interface TripStopLivedState {
  stopId: TripStopId;
  tripId: TripId;
  phase: TripStopLivedPhase;
  recordedAt: string;
}
