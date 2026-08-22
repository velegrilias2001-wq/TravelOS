import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type { TripId } from '../../domain/entities/trip';

import type {
    TripRuntimePhase,
    TripRuntimeState,
} from '../../domain/entities/trip-runtime-state';

import type { TripRuntimeStateRepository } from '../../domain/repositories/trip-runtime-state-repository';

interface RuntimeStateRow {
  trip_id: string;
  phase: string;
  current_day_id: string | null;
  current_stop_id: string | null;
  last_activity_at: string | null;
  is_companion_active: number;
  updated_at: string;
}

export class SQLiteTripRuntimeStateRepository
  implements TripRuntimeStateRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getByTripId(
    tripId: TripId,
  ): Promise<TripRuntimeState | null> {
    const row =
      await this.database.queryFirst<RuntimeStateRow>(
        `
          SELECT *
          FROM trip_runtime_states
          WHERE trip_id = ?;
        `,
        [tripId],
      );

    if (!row) {
      return null;
    }

    return {
      tripId: row.trip_id,
      phase: row.phase as TripRuntimePhase,
      currentDayId: row.current_day_id ?? undefined,
      currentStopId: row.current_stop_id ?? undefined,
      lastActivityAt: row.last_activity_at ?? undefined,
      isCompanionActive: row.is_companion_active === 1,
      updatedAt: row.updated_at,
    };
  }

  async save(state: TripRuntimeState): Promise<void> {
    await this.database.execute(
      `
        INSERT INTO trip_runtime_states (
          trip_id, phase, current_day_id,
          current_stop_id, last_activity_at,
          is_companion_active, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(trip_id) DO UPDATE SET
          phase = excluded.phase,
          current_day_id = excluded.current_day_id,
          current_stop_id = excluded.current_stop_id,
          last_activity_at = excluded.last_activity_at,
          is_companion_active = excluded.is_companion_active,
          updated_at = excluded.updated_at;
      `,
      [
        state.tripId,
        state.phase,
        state.currentDayId ?? null,
        state.currentStopId ?? null,
        state.lastActivityAt ?? null,
        state.isCompanionActive ? 1 : 0,
        state.updatedAt,
      ],
    );
  }

  async delete(tripId: TripId): Promise<void> {
    await this.database.execute(
      `DELETE FROM trip_runtime_states WHERE trip_id = ?;`,
      [tripId],
    );
  }
}

export const tripRuntimeStateRepository =
  new SQLiteTripRuntimeStateRepository();