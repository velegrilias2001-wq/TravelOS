import type {
  Accommodation,
  Booking,
  TripDay,
  TripStop,
} from '@/domain/entities';
import type {
  TripWorkspace,
} from './trip-service';

import {
  accommodationContextsForDay,
  splitAccommodationDateTime,
  type AccommodationDayContext,
} from './accommodation-details';
import {
  parseBookingTemporalValue,
} from './booking-time';
import {
  bookingsLinkedToStop,
} from './booking-stop-relationship';
import {
  calendarDayDistance,
  isCanonicalDateKey,
  isCanonicalLocalTime,
  localTimeAtInstant,
  parseCompatibleLocalDateTime,
  resolveTripRuntime,
  systemRuntimeClock,
  type RuntimeClock,
  type TripRuntimeResolution,
} from './time-truth';

export type CompanionMode =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'date-review';

export type CompanionStopPhase =
  | 'previous'
  | 'current'
  | 'next'
  | 'later'
  | 'untimed'
  | 'ordered'
  | 'history';

export interface CompanionStopContext {
  stop: TripStop;
  phase: CompanionStopPhase;
  bookings: Booking[];
  isMapped: boolean;
}

export interface CompanionReadiness {
  accommodationCount: number;
  bookingCount: number;
  populatedDayCount: number;
  totalDayCount: number;
  travelerCount: number;
  budgetConfigured: boolean;
}

export interface CompanionSummary {
  dayCount: number;
  stopCount: number;
  bookingCount: number;
  accommodationCount: number;
  travelerCount: number;
}

export interface CompanionSelection {
  mode: CompanionMode;
  runtime: TripRuntimeResolution;
  canonicalDays: TripDay[];
  displayDay: TripDay | null;
  dayIndex: number | null;
  totalDays: number;
  countdownDays: number | null;
  localTime: string | null;
  timingReliable: boolean;
  stopContexts: CompanionStopContext[];
  previousStops: CompanionStopContext[];
  currentStop: CompanionStopContext | null;
  nextStop: CompanionStopContext | null;
  remainingStops: CompanionStopContext[];
  untimedStops: CompanionStopContext[];
  relevantAccommodations: AccommodationDayContext[];
  currentAccommodation: Accommodation | null;
  nextAccommodation: Accommodation | null;
  relevantUnlinkedBookings: Booking[];
  readiness: CompanionReadiness;
  summary: CompanionSummary;
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

function stopsForDay(
  workspace: TripWorkspace,
  day: TripDay | null,
): TripStop[] {
  if (!day) {
    return [];
  }

  return workspace.stops
    .filter(
      (stop) =>
        stop.tripId === workspace.trip.id &&
        stop.dayId === day.id,
    )
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.id.localeCompare(right.id),
    );
}

function usefulBookingsForStop(
  bookings: Booking[],
  stop: TripStop,
): Booking[] {
  return bookingsLinkedToStop(bookings, stop.id)
    .filter((booking) => booking.status !== 'cancelled')
    .sort(
      (left, right) =>
        (left.startAt ?? '').localeCompare(
          right.startAt ?? '',
        ) || left.id.localeCompare(right.id),
    );
}

function stopContext(
  workspace: TripWorkspace,
  stop: TripStop,
  phase: CompanionStopPhase,
): CompanionStopContext {
  return {
    stop,
    phase,
    bookings: usefulBookingsForStop(
      workspace.bookings,
      stop,
    ),
    isMapped:
      typeof stop.location?.latitude === 'number' &&
      typeof stop.location?.longitude === 'number',
  };
}

function activeStopContexts(
  workspace: TripWorkspace,
  stops: TripStop[],
  localTime: string | null,
  timingReliable: boolean,
): CompanionStopContext[] {
  if (!timingReliable || !localTime) {
    return stops.map((stop) =>
      stopContext(workspace, stop, 'ordered'),
    );
  }

  const currentCandidates = stops.filter(
    (stop) =>
      Boolean(
        stop.startTime &&
          stop.endTime &&
          isCanonicalLocalTime(stop.startTime) &&
          isCanonicalLocalTime(stop.endTime) &&
          stop.startTime <= localTime &&
          localTime < stop.endTime,
      ),
  );
  const safeCurrentId =
    currentCandidates.length === 1
      ? currentCandidates[0].id
      : null;
  const firstFutureId = stops.find(
    (stop) =>
      stop.startTime &&
      isCanonicalLocalTime(stop.startTime) &&
      stop.startTime >= localTime &&
      stop.id !== safeCurrentId,
  )?.id;

  return stops.map((stop) => {
    if (
      !stop.startTime ||
      !isCanonicalLocalTime(stop.startTime)
    ) {
      return stopContext(workspace, stop, 'untimed');
    }

    if (stop.id === safeCurrentId) {
      return stopContext(workspace, stop, 'current');
    }

    if (stop.id === firstFutureId) {
      return stopContext(workspace, stop, 'next');
    }

    return stopContext(
      workspace,
      stop,
      stop.startTime < localTime ? 'previous' : 'later',
    );
  });
}

function nextCheckIn(
  accommodations: Accommodation[],
  currentDate: string,
  tripEndDate: string,
): Accommodation | null {
  return accommodations
    .map((accommodation) => ({
      accommodation,
      checkIn: accommodation.checkInAt
        ? parseCompatibleLocalDateTime(
            accommodation.checkInAt,
          )
        : null,
    }))
    .filter(
      (item) =>
        item.checkIn &&
        !item.checkIn.zoneSuffix &&
        item.checkIn.date >= currentDate &&
        item.checkIn.date <= tripEndDate,
    )
    .sort(
      (left, right) =>
        `${left.checkIn?.date}T${left.checkIn?.time}`.localeCompare(
          `${right.checkIn?.date}T${right.checkIn?.time}`,
        ) ||
        left.accommodation.id.localeCompare(
          right.accommodation.id,
        ),
    )[0]?.accommodation ?? null;
}

function currentStay(
  accommodations: Accommodation[],
  currentDate: string,
  localTime: string | null,
  timingReliable: boolean,
): Accommodation | null {
  if (!timingReliable || !localTime) {
    return null;
  }

  const currentLocalDateTime = `${currentDate}T${localTime}`;
  const candidates = accommodations.filter((accommodation) => {
    const checkIn = accommodation.checkInAt
      ? parseCompatibleLocalDateTime(
          accommodation.checkInAt,
        )
      : null;
    const checkOut = accommodation.checkOutAt
      ? parseCompatibleLocalDateTime(
          accommodation.checkOutAt,
        )
      : null;

    return Boolean(
      checkIn &&
        checkOut &&
        !checkIn.zoneSuffix &&
        !checkOut.zoneSuffix &&
        `${checkIn.date}T${checkIn.time}` <=
          currentLocalDateTime &&
        currentLocalDateTime <
          `${checkOut.date}T${checkOut.time}`,
    );
  });

  return candidates.length === 1 ? candidates[0] : null;
}

function truthfulAccommodationContexts(
  accommodations: Accommodation[],
  date: string,
): AccommodationDayContext[] {
  return accommodationContextsForDay(
    accommodations,
    date,
  ).filter((context) => {
    const checkIn = context.accommodation.checkInAt
      ? parseCompatibleLocalDateTime(
          context.accommodation.checkInAt,
        )
      : null;
    const checkOut = context.accommodation.checkOutAt
      ? parseCompatibleLocalDateTime(
          context.accommodation.checkOutAt,
        )
      : null;

    if (context.phase === 'check-in') {
      return Boolean(checkIn && !checkIn.zoneSuffix);
    }

    if (context.phase === 'check-out') {
      return Boolean(checkOut && !checkOut.zoneSuffix);
    }

    return Boolean(
      checkIn &&
        checkOut &&
        !checkIn.zoneSuffix &&
        !checkOut.zoneSuffix,
    );
  });
}

function relevantUnlinkedBookings(
  bookings: Booking[],
  mode: CompanionMode,
  currentDate: string,
  tripEndDate: string,
  timingReliable: boolean,
): Booking[] {
  const candidates = bookings
    .filter(
      (booking) =>
        !booking.stopId &&
        booking.status !== 'cancelled' &&
        booking.startAt,
    )
    .map((booking) => ({
      booking,
      temporal: parseBookingTemporalValue(
        booking.startAt as string,
      ),
    }))
    .filter(
      (item) =>
        item.temporal.kind === 'local-wall-time' &&
        item.temporal.date,
    )
    .sort(
      (left, right) =>
        (left.booking.startAt ?? '').localeCompare(
          right.booking.startAt ?? '',
        ) || left.booking.id.localeCompare(right.booking.id),
    );

  if (mode === 'active') {
    if (!timingReliable) {
      return [];
    }

    return candidates
      .filter(
        (item) => item.temporal.date === currentDate,
      )
      .map((item) => item.booking);
  }

  if (mode === 'upcoming') {
    const first = candidates.find(
      (item) =>
        (item.temporal.date as string) >= currentDate &&
        (item.temporal.date as string) <= tripEndDate,
    );

    return first ? [first.booking] : [];
  }

  return [];
}

export function selectCompanion(
  workspace: TripWorkspace,
  clock: RuntimeClock = systemRuntimeClock,
): CompanionSelection {
  const runtime = resolveTripRuntime(
    workspace.trip,
    workspace.days,
    clock,
  );
  const canonicalDays = canonicalTripDays(workspace);
  const mode: CompanionMode =
    runtime.phase === 'unknown'
      ? 'date-review'
      : runtime.phase;
  const displayDay =
    mode === 'upcoming'
      ? canonicalDays[0] ?? null
      : mode === 'completed'
        ? canonicalDays[canonicalDays.length - 1] ?? null
        : mode === 'active'
          ? runtime.currentDay
          : null;
  const dayPosition = displayDay
    ? canonicalDays.findIndex(
        (day) => day.id === displayDay.id,
      )
    : -1;
  const dayIndex = dayPosition >= 0 ? dayPosition + 1 : null;
  const timingReliable =
    mode === 'active' &&
    runtime.timeZone.certainty === 'canonical' &&
    Boolean(runtime.timeZone.timeZone);
  const localTime = timingReliable
    ? localTimeAtInstant(clock.now(), runtime.timeZone)
    : null;
  const stops = stopsForDay(workspace, displayDay);
  const stopContexts =
    mode === 'active'
      ? activeStopContexts(
          workspace,
          stops,
          localTime,
          timingReliable,
        )
      : stops.map((stop) =>
          stopContext(
            workspace,
            stop,
            mode === 'completed' ? 'history' : 'ordered',
          ),
        );
  const previousStops = stopContexts.filter(
    (context) => context.phase === 'previous',
  );
  const currentStop =
    stopContexts.find(
      (context) => context.phase === 'current',
    ) ?? null;
  const nextStop =
    stopContexts.find(
      (context) => context.phase === 'next',
    ) ?? null;
  const untimedStops = stopContexts.filter(
    (context) => context.phase === 'untimed',
  );
  const remainingStops = stopContexts.filter(
    (context) =>
      context.phase === 'current' ||
      context.phase === 'next' ||
      context.phase === 'later',
  );
  const relevantAccommodations = displayDay
    ? truthfulAccommodationContexts(
        workspace.accommodations,
        displayDay.date,
      )
    : [];
  const populatedDayIds = new Set(
    workspace.stops
      .filter((stop) => stop.tripId === workspace.trip.id)
      .map((stop) => stop.dayId),
  );

  return {
    mode,
    runtime,
    canonicalDays,
    displayDay,
    dayIndex,
    totalDays: canonicalDays.length,
    countdownDays:
      mode === 'upcoming' &&
      isCanonicalDateKey(workspace.trip.startDate)
        ? calendarDayDistance(
            runtime.currentDate,
            workspace.trip.startDate,
          )
        : null,
    localTime,
    timingReliable,
    stopContexts,
    previousStops,
    currentStop,
    nextStop,
    remainingStops,
    untimedStops,
    relevantAccommodations,
    currentAccommodation: currentStay(
      workspace.accommodations,
      runtime.currentDate,
      localTime,
      timingReliable,
    ),
    nextAccommodation:
      mode === 'upcoming'
        ? nextCheckIn(
            workspace.accommodations,
            runtime.currentDate,
            workspace.trip.endDate,
          )
        : null,
    relevantUnlinkedBookings: relevantUnlinkedBookings(
      workspace.bookings,
      mode,
      runtime.currentDate,
      workspace.trip.endDate,
      timingReliable,
    ),
    readiness: {
      accommodationCount: workspace.accommodations.length,
      bookingCount: workspace.bookings.filter(
        (booking) => booking.status !== 'cancelled',
      ).length,
      populatedDayCount: canonicalDays.filter((day) =>
        populatedDayIds.has(day.id),
      ).length,
      totalDayCount: canonicalDays.length,
      travelerCount: workspace.travelers.length,
      budgetConfigured:
        workspace.budget !== null &&
        typeof workspace.budget.plannedAmount === 'number',
    },
    summary: {
      dayCount: canonicalDays.length,
      stopCount: workspace.stops.length,
      bookingCount: workspace.bookings.length,
      accommodationCount: workspace.accommodations.length,
      travelerCount: workspace.travelers.length,
    },
  };
}
