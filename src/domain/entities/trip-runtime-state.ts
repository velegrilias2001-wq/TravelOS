import type { TripId } from './trip';
import type { TripDayId } from './trip-day';
import type { TripStopId } from './trip-stop';

export type TripRuntimePhase =
  | 'upcoming'
  | 'active'
  | 'completed';

export interface TripRuntimeState {
  tripId: TripId;

  phase: TripRuntimePhase;

  currentDayId?: TripDayId;
  currentStopId?: TripStopId;

  /**
   * Last known progress timestamp.
   */
  lastActivityAt?: string;

  /**
   * Companion / live-trip state.
   */
  isCompanionActive: boolean;

  updatedAt: string;
}