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

export interface TripDestination {
  id: string;
  name: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;

  /**
   * Local currency of the destination.
   * Example: JPY for Japan.
   *
   * This is NOT necessarily the currency used
   * for the trip's accounting/budget.
   */
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
   * Currency used for the trip's financial accounting.
   * Example: EUR.
   *
   * Kept separate from destination currency by design.
   */
  accountingCurrency: string;

  /**
   * True ISO instants used only for persistence metadata.
   */
  createdAt: string;
  updatedAt: string;
}
