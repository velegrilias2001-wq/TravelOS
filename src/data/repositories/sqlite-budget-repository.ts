import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
  Budget,
  BudgetCategory,
  BudgetItem,
  BudgetItemId,
  BudgetItemStatus,
} from '../../domain/entities/budget';

import type { TripId } from '../../domain/entities/trip';
import type { BudgetRepository } from '../../domain/repositories/budget-repository';

import {
  deleteBudgetItem,
  upsertBudgetItem,
  upsertBudgetPlan,
} from './budget-persistence-operations';

interface BudgetRow {
  id: string;
  trip_id: string;
  currency_code: string;
  planned_amount: number | null;
  created_at: string;
  updated_at: string;
}

interface BudgetItemRow {
  id: string;
  budget_id: string;
  trip_id: string;
  booking_id: string | null;
  stop_id: string | null;
  title: string;
  category: string;
  status: string;
  amount: number;
  currency_code: string;
  expense_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapItem(row: BudgetItemRow): BudgetItem {
  return {
    id: row.id,
    budgetId: row.budget_id,
    tripId: row.trip_id,
    bookingId: row.booking_id ?? undefined,
    stopId: row.stop_id ?? undefined,
    title: row.title,
    category: row.category as BudgetCategory,
    status: row.status as BudgetItemStatus,
    amount: row.amount,
    currencyCode: row.currency_code,
    date: row.expense_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteBudgetRepository implements BudgetRepository {
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getByTripId(tripId: TripId): Promise<Budget | null> {
    const budget = await this.database.queryFirst<BudgetRow>(
      `SELECT * FROM budgets WHERE trip_id = ?;`,
      [tripId],
    );

    if (!budget) {
      return null;
    }

    const items = await this.database.query<BudgetItemRow>(
      `
        SELECT *
        FROM budget_items
        WHERE budget_id = ?
        ORDER BY created_at ASC;
      `,
      [budget.id],
    );

    return {
      id: budget.id,
      tripId: budget.trip_id,
      currencyCode: budget.currency_code,
      plannedAmount: budget.planned_amount ?? undefined,
      items: items.map(mapItem),
      createdAt: budget.created_at,
      updatedAt: budget.updated_at,
    };
  }

  async save(budget: Budget): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await upsertBudgetPlan(
        transaction,
        budget,
      );

      const persistedBudget =
        await transaction.queryFirst<{
          id: string;
        }>(
          `SELECT id FROM budgets WHERE trip_id = ?;`,
          [budget.tripId],
        );

      if (!persistedBudget) {
        throw new Error(
          'Budget could not be persisted',
        );
      }

      await transaction.execute(
        `DELETE FROM budget_items WHERE budget_id = ?;`,
        [persistedBudget.id],
      );

      for (const item of budget.items) {
        await upsertBudgetItem(
          transaction,
          {
            ...item,
            budgetId: persistedBudget.id,
            tripId: budget.tripId,
          },
        );
      }
    });
  }

  async savePlan(budget: Budget): Promise<void> {
    await upsertBudgetPlan(
      this.database,
      budget,
    );
  }

  async saveItem(item: BudgetItem): Promise<void> {
    await upsertBudgetItem(
      this.database,
      item,
    );
  }

  async deleteItem(id: BudgetItemId): Promise<void> {
    await deleteBudgetItem(
      this.database,
      id,
    );
  }
}

export const budgetRepository =
  new SQLiteBudgetRepository();
