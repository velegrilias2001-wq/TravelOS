import type { TripWorkspace } from './trip-service';

export type CompanionPlanChangeKind =
  | 'dates'
  | 'day-assignment'
  | 'stops'
  | 'bookings'
  | 'stays'
  | 'plan';

export interface CompanionPlanSnapshot {
  tripId: string;
  startDate: string;
  endDate: string;
  days: CompanionPlanDayFact[];
  stops: CompanionPlanStopFact[];
  bookings: CompanionPlanBookingFact[];
  stays: CompanionPlanStayFact[];
}

export interface CompanionPlanChange {
  kind: CompanionPlanChangeKind;
  body: string;
}

interface CompanionPlanDayFact {
  id: string;
  date: string;
  dayNumber: number;
  destinationId: string | null;
}

interface CompanionPlanStopFact {
  id: string;
  dayId: string;
  title: string;
  type: string;
  order: number;
  startTime: string | null;
  endTime: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CompanionPlanBookingFact {
  id: string;
  stopId: string | null;
  status: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
}

interface CompanionPlanStayFact {
  id: string;
  stopId: string | null;
  name: string;
  checkInAt: string | null;
  checkOutAt: string | null;
}

const PLAN_CHANGE_COPY: Record<
  CompanionPlanChangeKind,
  string
> = {
  dates:
    'Trip dates were updated. Companion follows the saved dates, not a live override.',
  'day-assignment':
    'A day\'s city assignment was updated. Companion follows the saved plan.',
  stops:
    'The saved itinerary was updated. NOW and NEXT follow the plan, including any done or skipped marks.',
  bookings:
    'A booking was updated. Companion follows the saved reservation.',
  stays:
    'A stay was updated. Companion follows the saved accommodation.',
  plan:
    'The saved trip was updated. Companion follows SQLite, not a live override.',
};

function optionalText(
  value: string | undefined,
): string | null {
  return value ?? null;
}

function optionalCoordinate(
  value: number | undefined,
): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function byId<T extends { id: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function companionPlanSnapshot(
  workspace: TripWorkspace,
): CompanionPlanSnapshot {
  return {
    tripId: workspace.trip.id,
    startDate: workspace.trip.startDate,
    endDate: workspace.trip.endDate,
    days: byId(
      workspace.days.map((day) => ({
        id: day.id,
        date: day.date,
        dayNumber: day.dayNumber,
        destinationId: day.destinationId ?? null,
      })),
    ),
    stops: byId(
      workspace.stops.map((stop) => ({
        id: stop.id,
        dayId: stop.dayId,
        title: stop.title,
        type: stop.type,
        order: stop.order,
        startTime: optionalText(stop.startTime),
        endTime: optionalText(stop.endTime),
        latitude: optionalCoordinate(
          stop.location?.latitude,
        ),
        longitude: optionalCoordinate(
          stop.location?.longitude,
        ),
      })),
    ),
    bookings: byId(
      workspace.bookings.map((booking) => ({
        id: booking.id,
        stopId: booking.stopId ?? null,
        status: booking.status,
        title: booking.title,
        startAt: optionalText(booking.startAt),
        endAt: optionalText(booking.endAt),
      })),
    ),
    stays: byId(
      workspace.accommodations.map((stay) => ({
        id: stay.id,
        stopId: stay.stopId ?? null,
        name: stay.name,
        checkInAt: optionalText(stay.checkInAt),
        checkOutAt: optionalText(stay.checkOutAt),
      })),
    ),
  };
}

export function describeCompanionPlanChange(
  previous: CompanionPlanSnapshot | null,
  next: CompanionPlanSnapshot,
): CompanionPlanChange | null {
  if (
    previous === null ||
    previous.tripId !== next.tripId
  ) {
    return null;
  }

  const kinds: CompanionPlanChangeKind[] = [];

  if (
    previous.startDate !== next.startDate ||
    previous.endDate !== next.endDate
  ) {
    kinds.push('dates');
  }

  if (!sameJson(previous.days, next.days)) {
    kinds.push('day-assignment');
  }

  if (!sameJson(previous.stops, next.stops)) {
    kinds.push('stops');
  }

  if (!sameJson(previous.bookings, next.bookings)) {
    kinds.push('bookings');
  }

  if (!sameJson(previous.stays, next.stays)) {
    kinds.push('stays');
  }

  if (kinds.length === 0) {
    return null;
  }

  const kind =
    kinds.length === 1 ? kinds[0] : 'plan';

  return {
    kind,
    body: PLAN_CHANGE_COPY[kind],
  };
}
