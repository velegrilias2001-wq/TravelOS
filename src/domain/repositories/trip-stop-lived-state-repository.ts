import type { TripId } from '../entities/trip';
import type { TripStop, TripStopId } from '../entities/trip-stop';
import type { TripStopLivedState } from '../entities/trip-stop-lived-state';

export interface TripStopLivedStateRepository {
  getByTripId(
    tripId: TripId,
  ): Promise<TripStopLivedState[]>;

  saveProgress(
    state: TripStopLivedState,
    stop: TripStop,
    updatedAt: string,
  ): Promise<void>;

  clearProgress(
    tripId: TripId,
    stopId: TripStopId,
    updatedAt: string,
  ): Promise<void>;
}
