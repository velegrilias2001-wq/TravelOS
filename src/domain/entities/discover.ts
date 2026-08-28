import type {
    TripIntent,
    TripPace,
} from './trip';

import type {
    TravelInterest,
    TypicalTravelParty,
} from './travel-dna';

/**
 * The main reason the user entered Discover.
 *
 * These are product flows, not persisted Trip states.
 */
export type DiscoverMode =
  | 'find_destination'
  | 'best_time'
  | 'journey_ideas';

/**
 * Exact travel dates already chosen by the user.
 *
 * Calendar dates use YYYY-MM-DD and are not instants.
 */
export interface DiscoverExactTiming {
  kind: 'exact';
  startDate: string;
  endDate: string;
}

/**
 * Flexible timing constraints.
 *
 * V1 keeps every constraint explicit.
 * Missing values stay unknown rather than being inferred.
 */
export interface DiscoverFlexibleTiming {
  kind: 'flexible';

  earliestStartDate?: string;
  latestEndDate?: string;

  /**
   * Desired trip duration.
   * Example: 4 means a four-day trip.
   */
  tripLengthDays?: number;
}

export type DiscoverTiming =
  | DiscoverExactTiming
  | DiscoverFlexibleTiming;

/**
 * Explicit budget ceiling supplied for this discovery request.
 *
 * The currency is the currency in which the user expressed
 * the budget. TravelOS must never silently convert this into
 * destination currency.
 */
export interface DiscoverBudget {
  maximumAmount: number;
  currency: string;
}

/**
 * Grounded destination truth used inside Discover.
 *
 * Discover AI may rank or explain destinations, but must not
 * invent these fields. A real provider or curated source must
 * supply the destination itself.
 */
export interface DiscoverDestination {
  name: string;

  countryCode?: string;

  latitude: number;
  longitude: number;

  timezone?: string;

  /**
   * Local destination currency when explicitly known.
   * This is separate from DiscoverBudget.currency.
   */
  currencyCode?: string;
}

/**
 * What the user explicitly wants from this specific
 * discovery session.
 *
 * These values are trip-specific and therefore take priority
 * over global Travel DNA when both exist.
 */
export interface DiscoverBrief {
  mode: DiscoverMode;

  /**
   * Used when the user already knows the destination,
   * for example in the Best time flow.
   */
  destination?: DiscoverDestination;

  timing?: DiscoverTiming;

  budget?: DiscoverBudget;

  intent?: TripIntent;
  pace?: TripPace;

  /**
   * Explicit interests for this particular trip.
   * Empty means no trip-specific interest override.
   */
  interests: TravelInterest[];

  /**
   * Who the user expects to travel with for this trip.
   * Uses the same canonical categories as Travel DNA,
   * but remains specific to this discovery request.
   */
  party?: TypicalTravelParty;
}

/**
 * Where a Discover candidate came from.
 *
 * AI is intentionally not a destination source.
 */
export type DiscoverCandidateSource =
  | 'provider'
  | 'curated';

/**
 * A real destination that Discover is allowed to evaluate.
 *
 * AI may later rank candidates using the Discover Brief and
 * Travel DNA, but it cannot create a candidate from nothing.
 */
export interface DiscoverCandidate {
  id: string;

  destination: DiscoverDestination;

  source: DiscoverCandidateSource;

  /**
   * Optional stable identifier from the underlying provider
   * or curated catalogue.
   */
  sourceId?: string;
}