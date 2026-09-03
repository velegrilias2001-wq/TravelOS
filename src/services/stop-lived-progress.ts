import type { TripId } from '@/domain/entities/trip';
import type { TripStop } from '@/domain/entities/trip-stop';
import type {
  TripStopLivedPhase,
  TripStopLivedState,
} from '@/domain/entities/trip-stop-lived-state';

export function isTripStopLivedPhase(
  value: string,
): value is TripStopLivedPhase {
  return value === 'done' || value === 'skipped';
}

export function createStopLivedState(
  stop: TripStop,
  tripId: TripId,
  phase: TripStopLivedPhase,
  recordedAt: string,
): TripStopLivedState {
  if (stop.tripId !== tripId) {
    throw new Error(
      'Lived stop progress must belong to the same trip',
    );
  }

  if (!isTripStopLivedPhase(phase)) {
    throw new Error(
      'Lived stop phase must be done or skipped',
    );
  }

  return {
    stopId: stop.id,
    tripId,
    phase,
    recordedAt,
  };
}

export function livedPhaseByStopId(
  states: readonly TripStopLivedState[] | undefined,
): ReadonlyMap<string, TripStopLivedPhase> {
  const phases = new Map<string, TripStopLivedPhase>();

  for (const state of states ?? []) {
    phases.set(state.stopId, state.phase);
  }

  return phases;
}

export function planStopLivedBadge(
  stopId: string,
  states: readonly TripStopLivedState[] | undefined,
): TripStopLivedPhase | undefined {
  const phase = livedPhaseByStopId(states).get(stopId);

  if (phase === 'done' || phase === 'skipped') {
    return phase;
  }

  return undefined;
}
