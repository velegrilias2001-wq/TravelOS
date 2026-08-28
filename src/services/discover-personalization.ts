import type {
    BudgetStyle,
    DailyRhythm,
    DiscoverBrief,
    TravelDNA,
    TravelInterest,
    TravelStyle,
    TripPace,
    TypicalTravelParty,
} from '@/domain/entities';

import {
    normalizeDiscoverBrief,
} from './discover-brief';

export type DiscoverPreferenceSource =
  | 'discover_brief'
  | 'travel_dna'
  | 'unspecified';

export interface ResolvedDiscoverPreference<Value> {
  value?: Value;
  source: DiscoverPreferenceSource;
}

/**
 * Effective personalization context for one Discover session.
 *
 * Trip-specific Discover choices always take priority over
 * global Travel DNA when both describe the same preference.
 *
 * No values are inferred.
 */
export interface DiscoverPersonalization {
  brief: DiscoverBrief;

  pace: ResolvedDiscoverPreference<TripPace>;

  interests: {
    values: TravelInterest[];
    source: DiscoverPreferenceSource;
  };

  party:
    ResolvedDiscoverPreference<TypicalTravelParty>;

  /**
   * These preferences currently exist only in Travel DNA.
   * They remain explicit global context rather than inferred
   * trip-specific choices.
   */
  travelStyle:
    ResolvedDiscoverPreference<TravelStyle>;

  budgetStyle:
    ResolvedDiscoverPreference<BudgetStyle>;

  dailyRhythm:
    ResolvedDiscoverPreference<DailyRhythm>;
}

function resolveOptionalPreference<Value>(
  tripSpecific: Value | undefined,
  global: Value | undefined,
): ResolvedDiscoverPreference<Value> {
  if (tripSpecific !== undefined) {
    return {
      value: tripSpecific,
      source: 'discover_brief',
    };
  }

  if (global !== undefined) {
    return {
      value: global,
      source: 'travel_dna',
    };
  }

  return {
    source: 'unspecified',
  };
}

function resolveInterests(
  briefInterests: TravelInterest[],
  travelDNA: TravelDNA | null,
): DiscoverPersonalization['interests'] {
  if (briefInterests.length > 0) {
    return {
      values: [...briefInterests],
      source: 'discover_brief',
    };
  }

  if (
    travelDNA &&
    travelDNA.interests.length > 0
  ) {
    return {
      values: [...travelDNA.interests],
      source: 'travel_dna',
    };
  }

  return {
    values: [],
    source: 'unspecified',
  };
}

export function resolveDiscoverPersonalization(
  rawBrief: DiscoverBrief,
  travelDNA: TravelDNA | null,
): DiscoverPersonalization {
  const brief =
    normalizeDiscoverBrief(rawBrief);

  return {
    brief,

    pace: resolveOptionalPreference(
      brief.pace,
      travelDNA?.pace,
    ),

    interests: resolveInterests(
      brief.interests,
      travelDNA,
    ),

    party: resolveOptionalPreference(
      brief.party,
      travelDNA?.typicalParty,
    ),

    travelStyle: resolveOptionalPreference(
      undefined,
      travelDNA?.travelStyle,
    ),

    budgetStyle: resolveOptionalPreference(
      undefined,
      travelDNA?.budgetStyle,
    ),

    dailyRhythm: resolveOptionalPreference(
      undefined,
      travelDNA?.dailyRhythm,
    ),
  };
}