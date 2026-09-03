import type { TripId } from './trip';

export type TripFxRateId = string;

export type TripFxRateSource = 'traveler';

/**
 * Explicit conversion rate for one currency pair on one trip.
 *
 * Foreign amounts enter accounting-currency totals only through
 * a matching rate. There is no live market feed in V1.
 */
export interface TripFxRate {
  id: TripFxRateId;
  tripId: TripId;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  asOf: string;
  source: TripFxRateSource;
  createdAt: string;
  updatedAt: string;
}
