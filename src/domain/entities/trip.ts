export type TripId = string;

export type TripStatus =
  | 'draft'
  | 'planned'
  | 'active'
  | 'completed'
  | 'archived';

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
  status: TripStatus;

  destinations: TripDestination[];

  /**
   * ISO date format:
   * YYYY-MM-DD
   */
  startDate: string;
  endDate: string;

  /**
   * IDs will later point to Traveler entities.
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
   * ISO timestamps.
   */
  createdAt: string;
  updatedAt: string;
}