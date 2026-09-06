import type {
  TravelInterest,
  TripDay,
} from '@/domain/entities';

import {
  deriveDayFreeTimeGaps,
  type FreeTimeGap,
} from './itinerary-flexibility';
import {
  buildPlanAssistCandidates,
  type PlanAssistCandidate,
} from './plan-assist';
import { tripDayDestination } from './trip-day-destination';
import {
  selectTripReadiness,
  type TripReadinessRoute,
} from './trip-readiness';
import type { TripWorkspace } from './trip-service';
import { isCanonicalDateKey } from './time-truth';

export type TripCopilotProposal =
  | {
      kind: 'readiness';
      id: string;
      title: string;
      body: string;
      route: TripReadinessRoute;
      actionLabel: 'Add' | 'Continue' | 'View';
    }
  | {
      kind: 'packing';
      id: string;
      title: string;
      body: string;
      packingTotal: number;
      packingPacked: number;
    }
  | {
      kind: 'plan_assist';
      id: string;
      dayId: string;
      dayDate: string;
      dayLabel: string;
      candidates: PlanAssistCandidate[];
    }
  | {
      kind: 'free_time';
      id: string;
      dayId: string;
      dayDate: string;
      dayLabel: string;
      gap: FreeTimeGap;
    }
  | {
      kind: 'import_review';
      id: string;
      title: string;
      body: string;
      pendingCount: number;
    };

function canonicalDays(workspace: TripWorkspace): TripDay[] {
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

function dayLabel(day: TripDay): string {
  return `Day ${day.dayNumber}`;
}

/**
 * Trip-scoped copilot proposals from saved workspace truth.
 * Never invents stops, bookings, or destinations.
 * Every write still requires an existing editor/accept path.
 */
export function selectTripCopilotProposals(
  workspace: TripWorkspace,
  options?: {
    interests?: readonly TravelInterest[];
    pendingImportClaimCount?: number;
    packingTotal?: number;
    packingPacked?: number;
  },
): TripCopilotProposal[] {
  const proposals: TripCopilotProposal[] = [];
  const readiness = selectTripReadiness(workspace);

  for (const item of readiness.checklist) {
    if (item.ready) {
      continue;
    }

    proposals.push({
      kind: 'readiness',
      id: `readiness:${item.id}`,
      title: item.title,
      body: item.body,
      route: item.route,
      actionLabel: item.actionLabel,
    });
  }

  const packingTotal = options?.packingTotal ?? 0;
  const packingPacked = options?.packingPacked ?? 0;

  if (packingTotal === 0) {
    proposals.push({
      kind: 'packing',
      id: 'packing:empty',
      title: 'Packing',
      body: 'Add traveler-authored packing items when you are ready. Nothing is invented for you.',
      packingTotal: 0,
      packingPacked: 0,
    });
  } else if (packingPacked < packingTotal) {
    proposals.push({
      kind: 'packing',
      id: 'packing:progress',
      title: 'Packing',
      body: `${packingPacked} of ${packingTotal} packed`,
      packingTotal,
      packingPacked,
    });
  }

  const days = canonicalDays(workspace);
  let emptyDayCount = 0;

  for (const day of days) {
    const dayStops = workspace.stops.filter(
      (stop) =>
        stop.tripId === workspace.trip.id &&
        stop.dayId === day.id,
    );

    if (dayStops.length === 0) {
      if (emptyDayCount >= 2) {
        continue;
      }

      const destination = tripDayDestination(
        day,
        workspace.trip.destinations,
      );

      const candidates = buildPlanAssistCandidates({
        dayDestination: destination,
        preferences: {
          tripIntent: workspace.trip.intent,
          tripPace: workspace.trip.pace,
          interests: options?.interests,
        },
        limit: 3,
      });

      if (candidates.length === 0) {
        continue;
      }

      emptyDayCount += 1;
      proposals.push({
        kind: 'plan_assist',
        id: `plan_assist:${day.id}`,
        dayId: day.id,
        dayDate: day.date,
        dayLabel: dayLabel(day),
        candidates,
      });
      continue;
    }

    const gaps = deriveDayFreeTimeGaps(day, dayStops).slice(
      0,
      2,
    );

    for (const gap of gaps) {
      proposals.push({
        kind: 'free_time',
        id: `free_time:${gap.afterStopId}:${gap.beforeStopId}`,
        dayId: day.id,
        dayDate: day.date,
        dayLabel: dayLabel(day),
        gap,
      });
    }
  }

  const pending = options?.pendingImportClaimCount ?? 0;

  if (pending > 0) {
    proposals.push({
      kind: 'import_review',
      id: 'import_review',
      title: 'Import review',
      body:
        pending === 1
          ? '1 claim is waiting for your review'
          : `${pending} claims are waiting for your review`,
      pendingCount: pending,
    });
  }

  return proposals;
}
