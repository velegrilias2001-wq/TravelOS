import type { TripDay } from '@/domain/entities';
import type { TripWorkspace } from './trip-service';
import { isCanonicalDateKey } from './time-truth';

export interface TripReadinessSnapshot {
  accommodationCount: number;
  bookingCount: number;
  populatedDayCount: number;
  totalDayCount: number;
  travelerCount: number;
  budgetConfigured: boolean;
}

export interface TripReadinessSelection {
  canonicalDays: TripDay[];
  readiness: TripReadinessSnapshot;
}

function canonicalTripDays(
  workspace: TripWorkspace,
): TripDay[] {
  return workspace.days
    .filter(
      (day) =>
        day.tripId === workspace.trip.id &&
        isCanonicalDateKey(day.date) &&
        day.date >= workspace.trip.startDate &&
        day.date <= workspace.trip.endDate,
    )
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.dayNumber - right.dayNumber ||
        left.id.localeCompare(right.id),
    );
}

export function selectTripReadiness(
  workspace: TripWorkspace,
): TripReadinessSelection {
  const canonicalDays =
    canonicalTripDays(workspace);

  const canonicalDayIds =
    new Set(canonicalDays.map((day) => day.id));

  const populatedDayIds = new Set(
    workspace.stops
      .filter(
        (stop) =>
          stop.tripId === workspace.trip.id &&
          canonicalDayIds.has(stop.dayId),
      )
      .map((stop) => stop.dayId),
  );

  return {
    canonicalDays,
    readiness: {
      accommodationCount:
        workspace.accommodations.filter(
          (accommodation) =>
            accommodation.tripId === workspace.trip.id,
        ).length,
      bookingCount:
        workspace.bookings.filter(
          (booking) =>
            booking.tripId === workspace.trip.id &&
            booking.status !== 'cancelled',
        ).length,
      populatedDayCount:
        canonicalDays.filter((day) =>
          populatedDayIds.has(day.id),
        ).length,
      totalDayCount: canonicalDays.length,
      travelerCount: workspace.travelers.length,
      budgetConfigured:
        workspace.budget !== null &&
        workspace.budget.tripId === workspace.trip.id &&
        typeof workspace.budget.plannedAmount === 'number',
    },
  };
}
