import type {
    DiscoverBrief,
    DiscoverBudget,
    DiscoverDestination,
    DiscoverFlexibleTiming,
    DiscoverMode,
    DiscoverTiming,
    TravelInterest,
    TripIntent,
    TripPace,
    TypicalTravelParty,
} from '@/domain/entities';

import {
    normalizeDestinationSelection,
} from './destination-authoring';

import {
    isCanonicalDateKey,
    validateCalendarDateRange,
} from './time-truth';

const DISCOVER_MODES: DiscoverMode[] = [
  'find_destination',
  'best_time',
  'journey_ideas',
];

const TRIP_INTENTS: TripIntent[] = [
  'relax',
  'explore',
  'food',
  'nature',
  'event',
  'social',
  'romantic',
  'family',
  'work_leisure',
  'other',
];

const TRIP_PACES: TripPace[] = [
  'slow',
  'balanced',
  'full',
];

const TRAVEL_INTERESTS: TravelInterest[] = [
  'food',
  'culture',
  'nature',
  'beaches',
  'nightlife',
  'shopping',
  'wellness',
  'adventure',
];

const TRAVEL_PARTIES: TypicalTravelParty[] = [
  'solo',
  'couple',
  'friends',
  'family',
];

function normalizeCurrency(
  value: string,
): string {
  const currency =
    value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      'Discover budget currency must be a three-letter code',
    );
  }

  return currency;
}

function normalizeBudget(
  budget: DiscoverBudget | undefined,
): DiscoverBudget | undefined {
  if (!budget) {
    return undefined;
  }

  if (
    !Number.isFinite(budget.maximumAmount) ||
    budget.maximumAmount <= 0
  ) {
    throw new Error(
      'Discover budget must be greater than zero',
    );
  }

  return {
    maximumAmount: budget.maximumAmount,
    currency: normalizeCurrency(
      budget.currency,
    ),
  };
}

function normalizeDestination(
  destination:
    | DiscoverDestination
    | undefined,
): DiscoverDestination | undefined {
  if (!destination) {
    return undefined;
  }

  const normalized =
    normalizeDestinationSelection(
      destination,
    );

  return {
    name: normalized.name,
    countryCode:
      normalized.countryCode,
    latitude:
      normalized.latitude,
    longitude:
      normalized.longitude,
    timezone:
      normalized.timezone,
    currencyCode:
      normalized.currencyCode,
  };
}

function normalizeFlexibleTiming(
  timing: DiscoverFlexibleTiming,
): DiscoverFlexibleTiming {
  const earliest =
    timing.earliestStartDate;
  const latest =
    timing.latestEndDate;

  if (
    earliest !== undefined &&
    !isCanonicalDateKey(earliest)
  ) {
    throw new Error(
      'Discover earliest start date must be a valid calendar date',
    );
  }

  if (
    latest !== undefined &&
    !isCanonicalDateKey(latest)
  ) {
    throw new Error(
      'Discover latest end date must be a valid calendar date',
    );
  }

  if (
    earliest !== undefined &&
    latest !== undefined
  ) {
    validateCalendarDateRange(
      earliest,
      latest,
    );
  }

  if (
    timing.tripLengthDays !== undefined &&
    (
      !Number.isInteger(
        timing.tripLengthDays,
      ) ||
      timing.tripLengthDays <= 0
    )
  ) {
    throw new Error(
      'Discover trip length must be a positive whole number of days',
    );
  }

  return {
    kind: 'flexible',
    earliestStartDate: earliest,
    latestEndDate: latest,
    tripLengthDays:
      timing.tripLengthDays,
  };
}

function normalizeTiming(
  timing:
    | DiscoverTiming
    | undefined,
): DiscoverTiming | undefined {
  if (!timing) {
    return undefined;
  }

  if (timing.kind === 'exact') {
    validateCalendarDateRange(
      timing.startDate,
      timing.endDate,
    );

    return {
      kind: 'exact',
      startDate: timing.startDate,
      endDate: timing.endDate,
    };
  }

  if (timing.kind === 'flexible') {
    return normalizeFlexibleTiming(
      timing,
    );
  }

  throw new Error(
    'Discover timing kind is not supported',
  );
}

function normalizeInterests(
  interests: TravelInterest[],
): TravelInterest[] {
  for (const interest of interests) {
    if (
      !TRAVEL_INTERESTS.includes(
        interest,
      )
    ) {
      throw new Error(
        'Discover interest is not supported',
      );
    }
  }

  return [...new Set(interests)];
}

export function normalizeDiscoverBrief(
  brief: DiscoverBrief,
): DiscoverBrief {
  if (
    !DISCOVER_MODES.includes(
      brief.mode,
    )
  ) {
    throw new Error(
      'Discover mode is not supported',
    );
  }

  if (
    brief.intent !== undefined &&
    !TRIP_INTENTS.includes(
      brief.intent,
    )
  ) {
    throw new Error(
      'Discover trip intent is not supported',
    );
  }

  if (
    brief.pace !== undefined &&
    !TRIP_PACES.includes(
      brief.pace,
    )
  ) {
    throw new Error(
      'Discover trip pace is not supported',
    );
  }

  if (
    brief.party !== undefined &&
    !TRAVEL_PARTIES.includes(
      brief.party,
    )
  ) {
    throw new Error(
      'Discover travel party is not supported',
    );
  }

  const destination =
    normalizeDestination(
      brief.destination,
    );

  if (
    brief.mode === 'best_time' &&
    !destination
  ) {
    throw new Error(
      'Best time discovery requires a destination',
    );
  }

  return {
    mode: brief.mode,
    destination,
    timing: normalizeTiming(
      brief.timing,
    ),
    budget: normalizeBudget(
      brief.budget,
    ),
    intent: brief.intent,
    pace: brief.pace,
    interests: normalizeInterests(
      brief.interests,
    ),
    party: brief.party,
  };
}