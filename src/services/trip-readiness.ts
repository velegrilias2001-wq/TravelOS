import type { TripDay } from '@/domain/entities';
import type { TripWorkspace } from './trip-service';
import { isCanonicalDateKey } from './time-truth';
import { strings } from '../i18n';

export type TripReadinessRoute =
  | '/trip/[tripId]/plan'
  | '/trip/[tripId]/accommodation'
  | '/trip/[tripId]/bookings'
  | '/trip/[tripId]/travelers'
  | '/trip/[tripId]/budget';

export interface TripReadinessSnapshot {
  accommodationCount: number;
  bookingCount: number;
  populatedDayCount: number;
  totalDayCount: number;
  travelerCount: number;
  budgetConfigured: boolean;
}

export interface TripReadinessChecklistItem {
  id: string;
  title: string;
  body: string;
  ready: boolean;
  route: TripReadinessRoute;
  actionLabel: 'Add' | 'Continue' | 'View';
}

export interface TripReadinessSelection {
  canonicalDays: TripDay[];
  readiness: TripReadinessSnapshot;
  checklist: TripReadinessChecklistItem[];
  readyCount: number;
  totalCheckCount: number;
  /**
   * Integer 0–100 from countable checklist rows only.
   * Never invents tasks beyond Plan / stays / bookings / travelers / budget.
   */
  percentReady: number;
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

  const readiness: TripReadinessSnapshot = {
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
  };

  const checklist = buildTripReadinessChecklist(readiness);
  const readyCount = checklist.filter((item) => item.ready).length;
  const totalCheckCount = checklist.length;

  return {
    canonicalDays,
    readiness,
    checklist,
    readyCount,
    totalCheckCount,
    percentReady:
      totalCheckCount === 0
        ? 0
        : Math.round((readyCount / totalCheckCount) * 100),
  };
}

export function buildTripReadinessChecklist(
  readiness: TripReadinessSnapshot,
): TripReadinessChecklistItem[] {
  const planReady =
    readiness.totalDayCount > 0 &&
    readiness.populatedDayCount === readiness.totalDayCount;

  const items: TripReadinessChecklistItem[] = [
    {
      id: 'plan',
      title: strings.readiness.plan,
      body:
        readiness.totalDayCount === 0
          ? strings.readiness.planNotReady
          : strings.readiness.planDays(
              readiness.populatedDayCount,
              readiness.totalDayCount,
            ),
      ready: planReady,
      route: '/trip/[tripId]/plan',
      actionLabel: planReady
        ? 'View'
        : readiness.populatedDayCount > 0
          ? 'Continue'
          : 'Add',
    },
    {
      id: 'accommodation',
      title: strings.readiness.accommodation,
      body:
        readiness.accommodationCount > 0
          ? strings.readiness.staysSaved(readiness.accommodationCount)
          : strings.readiness.noStay,
      ready: readiness.accommodationCount > 0,
      route: '/trip/[tripId]/accommodation',
      actionLabel:
        readiness.accommodationCount > 0 ? 'View' : 'Add',
    },
    {
      id: 'bookings',
      title: strings.readiness.bookings,
      body:
        readiness.bookingCount > 0
          ? strings.readiness.activeBookings(readiness.bookingCount)
          : strings.readiness.noBookings,
      ready: readiness.bookingCount > 0,
      route: '/trip/[tripId]/bookings',
      actionLabel: readiness.bookingCount > 0 ? 'View' : 'Add',
    },
    {
      id: 'travelers',
      title: strings.readiness.travelers,
      body:
        readiness.travelerCount > 0
          ? strings.readiness.travelersAdded(readiness.travelerCount)
          : strings.readiness.noTravelers,
      ready: readiness.travelerCount > 0,
      route: '/trip/[tripId]/travelers',
      actionLabel: readiness.travelerCount > 0 ? 'View' : 'Add',
    },
    {
      id: 'budget',
      title: strings.readiness.budget,
      body: readiness.budgetConfigured
        ? strings.readiness.budgetSet
        : strings.readiness.noBudget,
      ready: readiness.budgetConfigured,
      route: '/trip/[tripId]/budget',
      actionLabel: readiness.budgetConfigured ? 'View' : 'Add',
    },
  ];

  return [...items].sort(
    (left, right) => Number(left.ready) - Number(right.ready),
  );
}
