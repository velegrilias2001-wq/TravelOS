export type TripId = string;

export type TripStatus =
  | 'draft'
  | 'planned'
  | 'active'
  | 'completed'
  | 'archived';

export type TripIntent =
  | 'relax'
  | 'explore'
  | 'food'
  | 'nature'
  | 'event'
  | 'social'
  | 'romantic'
  | 'family'
  | 'work_leisure'
  | 'other';

export type TripPace =
  | 'slow'
  | 'balanced'
  | 'full';

/**
 * Planning context for who is traveling.
 * Does not create Traveler rows by itself.
 */
export type TripPartyType =
  | 'solo'
  | 'couple'
  | 'friends'
  | 'family';

export type DestinationTimezoneSource =
  | 'provider'
  | 'catalogue'
  | 'traveler';

export interface TripDestination {
  id: string;
  name: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;

  /**
   * How the destination timezone was obtained.
   * Unknown stays unknown. Never inferred from
   * coordinates, currency, or destination order.
   */
  timezoneSource?: DestinationTimezoneSource;

  /**
   * Stable identifier from the location provider
   * when that provider actually returns one.
   */
  placeId?: string;

  /**
   * Local currency of the destination.
   * Example: JPY for Japan.
   *
   * This is NOT necessarily the currency used
   * for the trip's accounting/budget.
   */
  currencyCode?: string;
}

/**
 * Optional departure / home place from picker facts.
 * Not a TripDestination — never used as day clock
 * and never listed in destinations.
 */
export interface TripOrigin {
  name: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  timezoneSource?: DestinationTimezoneSource;
  placeId?: string;
  currencyCode?: string;
}

export interface Trip {
  id: TripId;

  title: string;
  /**
   * Durable organizational status. Live journey phase is derived from
   * calendar dates and explicit timezone truth, never from this field.
   */
  status: TripStatus;

  /**
   * Primary purpose for this specific trip.
   *
   * Trip Intent is explicit and trip-specific.
   * It is not inferred from the traveller's global Travel DNA.
   */
  intent?: TripIntent;

  /**
   * Preferred pace for this specific trip.
   *
   * This is intentionally separate from the traveller's
   * global Travel DNA pace.
   */
  pace?: TripPace;

  /**
   * Optional planning party type. Explicit only.
   * Never auto-creates Traveler memberships.
   */
  partyType?: TripPartyType;

  /**
   * Optional headcount for planning context.
   * Explicit positive integer only when set.
   */
  partySize?: number;

  /**
   * Optional origin place (picker facts only).
   * Not a competing destination for clocks or World.
   */
  origin?: TripOrigin;

  destinations: TripDestination[];

  /**
   * Calendar dates in YYYY-MM-DD. These are not instants and must not be
   * shifted through UTC or a device timezone.
   */
  startDate: string;
  endDate: string;

  /**
   * Canonical Traveler IDs joined through
   * trip_travelers. Traveler identity is reusable
   * across Trips and is never copied into the Trip.
   */
  travelerIds: string[];

  /**
   * Optional canonical Traveler who owns this trip
   * locally. Planning trips may have no owner.
   * Invitations and cloud permissions are not
   * represented here.
   */
  ownerTravelerId?: string;

  /**
   * Currency used for the trip's financial accounting.
   * Example: EUR.
   *
   * Kept separate from destination currency by design.
   */
  accountingCurrency: string;

  /**
   * Optional curated visual pack for this trip.
   * Cosmetic only — never invents destinations.
   */
  themePackId?: string;

  /**
   * True ISO instants used only for persistence metadata.
   */
  createdAt: string;
  updatedAt: string;
}
