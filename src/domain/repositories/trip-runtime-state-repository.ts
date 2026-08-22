import type { TripId } from '../entities/trip';

import type { TripRuntimeState } from '../entities/trip-runtime-state';

export interface TripRuntimeStateRepository {
  getByTripId(
    tripId: TripId,
  ): Promise<TripRuntimeState | null>;

  save(state: TripRuntimeState): Promise<void>;

  delete(tripId: TripId): Promise<void>;
}