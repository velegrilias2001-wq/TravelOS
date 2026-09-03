import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type { TripId } from '../../domain/entities/trip';
import type { TripStop } from '../../domain/entities/trip-stop';
import type { TripStopId } from '../../domain/entities/trip-stop';
import type { TripStopLivedState } from '../../domain/entities/trip-stop-lived-state';
import type { TripStopLivedStateRepository } from '../../domain/repositories/trip-stop-lived-state-repository';

import {
  deleteTripRuntimeState,
  deleteTripStopLivedState,
  latestLivedState,
  loadTripStopLivedStates,
  loadTripStopLivedStatesForTrips,
  upsertLivedRuntimePointer,
  upsertTripStopLivedState,
} from './stop-lived-persistence-operations';

function runtimePointerFromLived(
  state: TripStopLivedState,
  dayId: string,
  updatedAt: string,
) {
  return {
    tripId: state.tripId,
    phase: 'active' as const,
    currentDayId: dayId,
    currentStopId: state.stopId,
    lastActivityAt: state.recordedAt,
    isCompanionActive: true,
    updatedAt,
  };
}

export class SQLiteTripStopLivedStateRepository
  implements TripStopLivedStateRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getByTripId(
    tripId: TripId,
  ): Promise<TripStopLivedState[]> {
    return loadTripStopLivedStates(
      this.database,
      tripId,
    );
  }

  async getByTripIds(
    tripIds: readonly TripId[],
  ): Promise<TripStopLivedState[]> {
    return loadTripStopLivedStatesForTrips(
      this.database,
      tripIds,
    );
  }

  async saveProgress(
    state: TripStopLivedState,
    stop: TripStop,
    updatedAt: string,
  ): Promise<void> {
    await this.database.transaction(
      async (transaction) => {
        await upsertTripStopLivedState(
          transaction,
          state,
        );
        await upsertLivedRuntimePointer(
          transaction,
          runtimePointerFromLived(
            state,
            stop.dayId,
            updatedAt,
          ),
        );
      },
    );
  }

  async clearProgress(
    tripId: TripId,
    stopId: TripStopId,
    updatedAt: string,
  ): Promise<void> {
    await this.database.transaction(
      async (transaction) => {
        await deleteTripStopLivedState(
          transaction,
          stopId,
        );

        const remaining =
          await loadTripStopLivedStates(
            transaction,
            tripId,
          );
        const latest =
          latestLivedState(remaining);

        if (!latest) {
          await deleteTripRuntimeState(
            transaction,
            tripId,
          );
          return;
        }

        const stop =
          await transaction.queryFirst<{
            day_id: string;
          }>(
            `
              SELECT day_id
              FROM trip_stops
              WHERE id = ? AND trip_id = ?;
            `,
            [latest.stopId, tripId],
          );

        if (!stop) {
          await deleteTripRuntimeState(
            transaction,
            tripId,
          );
          return;
        }

        await upsertLivedRuntimePointer(
          transaction,
          runtimePointerFromLived(
            latest,
            stop.day_id,
            updatedAt,
          ),
        );
      },
    );
  }
}

export const tripStopLivedStateRepository =
  new SQLiteTripStopLivedStateRepository();
