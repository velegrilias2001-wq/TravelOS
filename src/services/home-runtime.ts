import type {
  Trip,
  TripDay,
  TripId,
} from '@/domain/entities';
import {
  tripDestinationLabel,
} from './destination-authoring';
import {
  selectTripReadiness,
} from './trip-readiness';
import { tripDayDestination } from './trip-day-destination';
import type { TripWorkspace } from './trip-service';
import {
  resolveTripRuntime,
  systemRuntimeClock,
  type RuntimeClock,
  type TripRuntimeResolution,
} from './time-truth';

export interface HomeFeaturedTrip {
  trip: Trip;
  runtime: TripRuntimeResolution;
}

export interface HomeRuntimeSummary {
  featured: HomeFeaturedTrip | undefined;
  completedCount: number;
  upcomingTrips: Trip[];
}

export interface HomeReadinessGlance {
  tripId: TripId;
  title: string;
  readyCount: number;
  totalCheckCount: number;
  percentReady: number;
}

export function selectHomeRuntimeSummary(
  trips: readonly Trip[],
  days: readonly TripDay[],
  clock: RuntimeClock = systemRuntimeClock,
): HomeRuntimeSummary {
  const daysByTrip = groupTripDays(days);
  const records = trips
    .filter((trip) => trip.status !== 'archived')
    .map((trip) => ({
      trip,
      runtime: resolveTripRuntime(
        trip,
        daysByTrip.get(trip.id) ?? [],
        clock,
      ),
    }));

  const featured =
    records.find(
      ({ runtime }) => runtime.phase === 'active',
    ) ??
    records
      .filter(
        ({ runtime }) => runtime.phase === 'upcoming',
      )
      .sort((a, b) =>
        a.trip.startDate.localeCompare(
          b.trip.startDate,
        ),
      )[0];

  const upcomingTrips = records
    .filter(
      ({ runtime }) => runtime.phase === 'upcoming',
    )
    .sort((a, b) =>
      a.trip.startDate.localeCompare(
        b.trip.startDate,
      ),
    )
    .map(({ trip }) => trip);

  return {
    featured,
    completedCount: trips.filter(
      (trip) => trip.status === 'completed',
    ).length,
    upcomingTrips,
  };
}

/**
 * Readiness glance chips from countable checklist facts only.
 */
export function selectHomeReadinessGlances(
  workspaces: readonly TripWorkspace[],
): HomeReadinessGlance[] {
  return workspaces.map((workspace) => {
    const selection = selectTripReadiness(workspace);

    return {
      tripId: workspace.trip.id,
      title: workspace.trip.title,
      readyCount: selection.readyCount,
      totalCheckCount: selection.totalCheckCount,
      percentReady: selection.percentReady,
    };
  });
}

export function homeFeaturedPlaceLabel(
  trip: Trip,
  runtime: TripRuntimeResolution,
): string {
  if (
    runtime.phase === 'active' &&
    runtime.currentDay
  ) {
    const destination = tripDayDestination(
      runtime.currentDay,
      trip.destinations,
    );

    if (destination) {
      return destination.name;
    }
  }

  if (trip.destinations.length === 0) {
    return 'Destination not set';
  }

  return tripDestinationLabel(trip.destinations);
}

function groupTripDays(
  days: readonly TripDay[],
): Map<TripId, TripDay[]> {
  const grouped = new Map<TripId, TripDay[]>();

  for (const day of days) {
    const current = grouped.get(day.tripId);

    if (current) {
      current.push(day);
    } else {
      grouped.set(day.tripId, [day]);
    }
  }

  return grouped;
}
