import type {
  DatabaseConnection,
} from '../database/database';

import type { TripRuntimeState } from '../../domain/entities/trip-runtime-state';
import type { TripId } from '../../domain/entities/trip';
import type { TripStopId } from '../../domain/entities/trip-stop';
import type {
  TripStopLivedPhase,
  TripStopLivedState,
} from '../../domain/entities/trip-stop-lived-state';

interface LivedStateRow {
  stop_id: string;
  trip_id: string;
  phase: string;
  recorded_at: string;
}

function mapLivedState(
  row: LivedStateRow,
): TripStopLivedState {
  return {
    stopId: row.stop_id,
    tripId: row.trip_id,
    phase: row.phase as TripStopLivedPhase,
    recordedAt: row.recorded_at,
  };
}

export async function loadTripStopLivedStates(
  database: DatabaseConnection,
  tripId: TripId,
): Promise<TripStopLivedState[]> {
  const rows = await database.query<LivedStateRow>(
    `
      SELECT *
      FROM trip_stop_lived_states
      WHERE trip_id = ?
      ORDER BY
        recorded_at ASC,
        stop_id ASC;
    `,
    [tripId],
  );

  return rows.map(mapLivedState);
}

export async function upsertTripStopLivedState(
  database: DatabaseConnection,
  state: TripStopLivedState,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO trip_stop_lived_states (
        stop_id,
        trip_id,
        phase,
        recorded_at
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(stop_id) DO UPDATE SET
        trip_id = excluded.trip_id,
        phase = excluded.phase,
        recorded_at = excluded.recorded_at
      WHERE
        trip_stop_lived_states.trip_id =
          excluded.trip_id;
    `,
    [
      state.stopId,
      state.tripId,
      state.phase,
      state.recordedAt,
    ],
  );
}

export async function deleteTripStopLivedState(
  database: DatabaseConnection,
  stopId: TripStopId,
): Promise<void> {
  await database.execute(
    `
      DELETE FROM trip_stop_lived_states
      WHERE stop_id = ?;
    `,
    [stopId],
  );
}

export async function upsertLivedRuntimePointer(
  database: DatabaseConnection,
  state: TripRuntimeState,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO trip_runtime_states (
        trip_id,
        phase,
        current_day_id,
        current_stop_id,
        last_activity_at,
        is_companion_active,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(trip_id) DO UPDATE SET
        phase = excluded.phase,
        current_day_id = excluded.current_day_id,
        current_stop_id = excluded.current_stop_id,
        last_activity_at = excluded.last_activity_at,
        is_companion_active =
          excluded.is_companion_active,
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

export async function deleteTripRuntimeState(
  database: DatabaseConnection,
  tripId: TripId,
): Promise<void> {
  await database.execute(
    `
      DELETE FROM trip_runtime_states
      WHERE trip_id = ?;
    `,
    [tripId],
  );
}

export function latestLivedState(
  states: readonly TripStopLivedState[],
): TripStopLivedState | null {
  if (states.length === 0) {
    return null;
  }

  return [...states].sort(
    (left, right) =>
      right.recordedAt.localeCompare(
        left.recordedAt,
      ) ||
      right.stopId.localeCompare(left.stopId),
  )[0];
}
