import type { BookingId } from './booking';
import type { TripId } from './trip';
import type { TripStopId } from './trip-stop';

export type BudgetId = string;
export type BudgetItemId = string;

export type BudgetCategory =
  | 'transport'
  | 'accommodation'
  | 'food'
  | 'activities'
  | 'shopping'
  | 'insurance'
  | 'other';

export type BudgetItemStatus =
  | 'planned'
  | 'committed'
  | 'paid';

export interface BudgetItem {
  id: BudgetItemId;
  budgetId: BudgetId;
  
  tripId: TripId;
  bookingId?: BookingId;
  stopId?: TripStopId;

  title: string;
  category: BudgetCategory;
  status: BudgetItemStatus;

  amount: number;

  /**
   * Currency is explicit.
   * Never infer it from destination currency.
   */
  currencyCode: string;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: BudgetId;
  tripId: TripId;

  /**
   * Main accounting currency of the trip.
   */
  currencyCode: string;

  plannedAmount?: number;

  items: BudgetItem[];

  createdAt: string;
  updatedAt: string;
}