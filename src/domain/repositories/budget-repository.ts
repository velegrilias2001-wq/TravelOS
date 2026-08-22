import type {
    Budget,
    BudgetItem,
    BudgetItemId,
} from '../entities/budget';

import type { TripId } from '../entities/trip';

export interface BudgetRepository {
  getByTripId(tripId: TripId): Promise<Budget | null>;

  save(budget: Budget): Promise<void>;

  saveItem(item: BudgetItem): Promise<void>;

  deleteItem(id: BudgetItemId): Promise<void>;
}