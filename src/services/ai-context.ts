import type {
  Accommodation,
  Booking,
  TravelDNA,
  TripDay,
  TripStop,
} from '@/domain/entities';

import {
  selectCompanion,
  type CompanionSelection,
} from './companion';
import {
  deriveDayFreeTimeGaps,
  deriveDayTimeConflicts,
  type FreeTimeGap,
  type ItineraryTimeConflict,
} from './itinerary-flexibility';
import type {
  TripWorkspace,
} from './trip-service';
import {
  systemRuntimeClock,
  type RuntimeClock,
  type TripRuntimeResolution,
} from './time-truth';

export interface AIContextDestination {
  id: string;
  name: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  currencyCode?: string;
}

export interface AIContextTrip {
  id: string;
  title: string;
  intent?: TripWorkspace['trip']['intent'];
  pace?: TripWorkspace['trip']['pace'];
  destinations: AIContextDestination[];
  startDate: string;
  endDate: string;
  accountingCurrency: string;
}

export interface AIContextTravelDNA {
  pace?: TravelDNA['pace'];
  interests: TravelDNA['interests'];
  travelStyle?: TravelDNA['travelStyle'];
  budgetStyle?: TravelDNA['budgetStyle'];
  dailyRhythm?: TravelDNA['dailyRhythm'];
  typicalParty?: TravelDNA['typicalParty'];
}

export interface AIContextTravelerSummary {
  total: number;
  adults: number;
  children: number;
  infants: number;
}

export interface AIContextStopLocation {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

export interface AIContextStop {
  id: TripStop['id'];
  dayId: TripStop['dayId'];
  title: string;
  type: TripStop['type'];
  order: number;
  location?: AIContextStopLocation;
  startTime?: string;
  endTime?: string;
}

export interface AIContextDay {
  id: TripDay['id'];
  date: string;
  dayNumber: number;
  stops: AIContextStop[];
  freeTime: FreeTimeGap[];
  timeConflicts: ItineraryTimeConflict[];
}

export interface AIContextBooking {
  id: Booking['id'];
  stopId?: Booking['stopId'];
  type: Booking['type'];
  status: Booking['status'];
  title: string;
  provider?: string;
  startAt?: string;
  endAt?: string;
  amount?: number;
  currencyCode?: string;
  isPaid?: boolean;
}

export interface AIContextAccommodation {
  id: Accommodation['id'];
  stopId?: Accommodation['stopId'];
  bookingId?: Accommodation['bookingId'];
  name: string;
  type: Accommodation['type'];
  address?: string;
  latitude?: number;
  longitude?: number;
  checkInAt?: string;
  checkOutAt?: string;
}

export interface AIContextBudgetCurrencySummary {
  currencyCode: string;
  plannedItemsAmount: number;
  committedItemsAmount: number;
  paidItemsAmount: number;
}

export interface AIContextBudget {
  currencyCode: string;
  plannedAmount?: number;
  itemCount: number;
  itemTotalsByCurrency: AIContextBudgetCurrencySummary[];
}

export interface AIContextRuntime {
  mode: CompanionSelection['mode'];
  currentDate: string;
  localTime: string | null;
  timingReliable: boolean;
  timeZone: string | null;
  timeZoneCertainty:
    TripRuntimeResolution['timeZone']['certainty'];
  timeZoneReason:
    TripRuntimeResolution['timeZone']['reason'];
  displayDayId: TripDay['id'] | null;
  dayIndex: number | null;
  totalDays: number;
  countdownDays: number | null;
  currentStopId: TripStop['id'] | null;
  nextStopId: TripStop['id'] | null;
  remainingStopIds: TripStop['id'][];
  untimedStopIds: TripStop['id'][];
  currentAccommodationId: Accommodation['id'] | null;
  nextAccommodationId: Accommodation['id'] | null;
  relevantUnlinkedBookingIds: Booking['id'][];
}

export interface AIContextSnapshot {
  /**
   * Explicit schema version for future provider adapters and migrations.
   */
  version: 1;

  trip: AIContextTrip;

  /**
   * Global traveller preferences are optional and remain explicitly
   * separate from trip-specific intent and pace.
   */
  travelDNA: AIContextTravelDNA | null;

  travelers: AIContextTravelerSummary;

  /**
   * Full-trip itinerary truth, ordered by canonical TripDay and stop order.
   * Free time and conflicts are deterministic derivations from saved times.
   */
  itinerary: AIContextDay[];

  /**
   * Safe projections only.
   *
   * Booking confirmation codes, free-form notes, external URLs,
   * traveller contact details and accommodation contact details are
   * deliberately excluded from the general AI context.
   */
  bookings: AIContextBooking[];
  accommodations: AIContextAccommodation[];

  /**
   * Currency values remain explicit. No conversion or destination-currency
   * inference happens while building AI context.
   */
  budget: AIContextBudget | null;

  /**
   * Runtime relevance is selected by the existing deterministic Companion.
   */
  runtime: AIContextRuntime;

  readiness: CompanionSelection['readiness'];
  summary: CompanionSelection['summary'];
}

function safeStop(
  stop: TripStop,
): AIContextStop {
  return {
    id: stop.id,
    dayId: stop.dayId,
    title: stop.title,
    type: stop.type,
    order: stop.order,
    location: stop.location
      ? {
          name: stop.location.name,
          address: stop.location.address,
          latitude: stop.location.latitude,
          longitude: stop.location.longitude,
          placeId: stop.location.placeId,
        }
      : undefined,
    startTime: stop.startTime,
    endTime: stop.endTime,
  };
}

function safeBooking(
  booking: Booking,
): AIContextBooking {
  return {
    id: booking.id,
    stopId: booking.stopId,
    type: booking.type,
    status: booking.status,
    title: booking.title,
    provider: booking.provider,
    startAt: booking.startAt,
    endAt: booking.endAt,
    amount: booking.amount,
    currencyCode: booking.currencyCode,
    isPaid: booking.isPaid,
  };
}

function safeAccommodation(
  accommodation: Accommodation,
): AIContextAccommodation {
  return {
    id: accommodation.id,
    stopId: accommodation.stopId,
    bookingId: accommodation.bookingId,
    name: accommodation.name,
    type: accommodation.type,
    address: accommodation.address,
    latitude: accommodation.latitude,
    longitude: accommodation.longitude,
    checkInAt: accommodation.checkInAt,
    checkOutAt: accommodation.checkOutAt,
  };
}

function buildTravelerSummary(
  workspace: TripWorkspace,
): AIContextTravelerSummary {
  return workspace.travelers.reduce<AIContextTravelerSummary>(
    (summary, traveler) => {
      summary.total += 1;

      if (traveler.type === 'adult') {
        summary.adults += 1;
      } else if (traveler.type === 'child') {
        summary.children += 1;
      } else {
        summary.infants += 1;
      }

      return summary;
    },
    {
      total: 0,
      adults: 0,
      children: 0,
      infants: 0,
    },
  );
}

function buildBudgetContext(
  workspace: TripWorkspace,
): AIContextBudget | null {
  const budget = workspace.budget;

  if (!budget) {
    return null;
  }

  const byCurrency = new Map<
    string,
    AIContextBudgetCurrencySummary
  >();

  for (const item of budget.items) {
    const summary =
      byCurrency.get(item.currencyCode) ?? {
        currencyCode: item.currencyCode,
        plannedItemsAmount: 0,
        committedItemsAmount: 0,
        paidItemsAmount: 0,
      };

    if (item.status === 'planned') {
      summary.plannedItemsAmount += item.amount;
    } else if (item.status === 'committed') {
      summary.committedItemsAmount += item.amount;
    } else {
      summary.paidItemsAmount += item.amount;
    }

    byCurrency.set(
      item.currencyCode,
      summary,
    );
  }

  return {
    currencyCode: budget.currencyCode,
    plannedAmount: budget.plannedAmount,
    itemCount: budget.items.length,
    itemTotalsByCurrency: [...byCurrency.values()]
      .sort(
        (left, right) =>
          left.currencyCode.localeCompare(
            right.currencyCode,
          ),
      ),
  };
}

function buildTravelDNAContext(
  travelDNA: TravelDNA | null,
): AIContextTravelDNA | null {
  if (!travelDNA) {
    return null;
  }

  return {
    pace: travelDNA.pace,
    interests: [...travelDNA.interests],
    travelStyle: travelDNA.travelStyle,
    budgetStyle: travelDNA.budgetStyle,
    dailyRhythm: travelDNA.dailyRhythm,
    typicalParty: travelDNA.typicalParty,
  };
}

function buildItinerary(
  workspace: TripWorkspace,
  companion: CompanionSelection,
): AIContextDay[] {
  return companion.canonicalDays.map(
    (day) => {
      const dayStops = workspace.stops
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

      return {
        id: day.id,
        date: day.date,
        dayNumber: day.dayNumber,
        stops: dayStops.map(safeStop),
        freeTime:
          deriveDayFreeTimeGaps(
            day,
            dayStops,
          ),
        timeConflicts:
          deriveDayTimeConflicts(
            day,
            dayStops,
          ),
      };
    },
  );
}

function buildRuntimeContext(
  companion: CompanionSelection,
): AIContextRuntime {
  return {
    mode: companion.mode,
    currentDate:
      companion.runtime.currentDate,
    localTime: companion.localTime,
    timingReliable:
      companion.timingReliable,
    timeZone:
      companion.runtime.timeZone.timeZone ??
      null,
    timeZoneCertainty:
      companion.runtime.timeZone.certainty,
    timeZoneReason:
      companion.runtime.timeZone.reason,
    displayDayId:
      companion.displayDay?.id ?? null,
    dayIndex: companion.dayIndex,
    totalDays: companion.totalDays,
    countdownDays:
      companion.countdownDays,
    currentStopId:
      companion.currentStop?.stop.id ??
      null,
    nextStopId:
      companion.nextStop?.stop.id ??
      null,
    remainingStopIds:
      companion.remainingStops.map(
        (context) => context.stop.id,
      ),
    untimedStopIds:
      companion.untimedStops.map(
        (context) => context.stop.id,
      ),
    currentAccommodationId:
      companion.currentAccommodation?.id ??
      null,
    nextAccommodationId:
      companion.nextAccommodation?.id ??
      null,
    relevantUnlinkedBookingIds:
      companion.relevantUnlinkedBookings.map(
        (booking) => booking.id,
      ),
  };
}

/**
 * Builds the provider-agnostic deterministic context that future AI
 * features can consume.
 *
 * This function does not call an AI model, infer missing preferences,
 * mutate trip data, convert currencies or expose general-purpose
 * sensitive fields.
 */
export function buildAIContextSnapshot(
  workspace: TripWorkspace,
  travelDNA: TravelDNA | null,
  clock: RuntimeClock = systemRuntimeClock,
): AIContextSnapshot {
  const companion =
    selectCompanion(workspace, clock);

  return {
    version: 1,

    trip: {
      id: workspace.trip.id,
      title: workspace.trip.title,
      intent: workspace.trip.intent,
      pace: workspace.trip.pace,
      destinations:
        workspace.trip.destinations.map(
          (destination) => ({
            id: destination.id,
            name: destination.name,
            countryCode:
              destination.countryCode,
            latitude:
              destination.latitude,
            longitude:
              destination.longitude,
            timezone:
              destination.timezone,
            currencyCode:
              destination.currencyCode,
          }),
        ),
      startDate:
        workspace.trip.startDate,
      endDate: workspace.trip.endDate,
      accountingCurrency:
        workspace.trip.accountingCurrency,
    },

    travelDNA:
      buildTravelDNAContext(travelDNA),

    travelers:
      buildTravelerSummary(workspace),

    itinerary:
      buildItinerary(
        workspace,
        companion,
      ),

    bookings: workspace.bookings
      .filter(
        (booking) =>
          booking.tripId ===
          workspace.trip.id,
      )
      .map(safeBooking),

    accommodations:
      workspace.accommodations
        .filter(
          (accommodation) =>
            accommodation.tripId ===
            workspace.trip.id,
        )
        .map(safeAccommodation),

    budget:
      buildBudgetContext(workspace),

    runtime:
      buildRuntimeContext(companion),

    readiness: companion.readiness,
    summary: companion.summary,
  };
}
