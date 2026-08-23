import type {
  Database,
  DatabaseConnection,
} from '../database/database';
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
      await transaction.execute(
        `
          INSERT INTO budgets (
            id, trip_id, currency_code,
            planned_amount, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            trip_id = excluded.trip_id,
            currency_code = excluded.currency_code,
            planned_amount = excluded.planned_amount,
            updated_at = excluded.updated_at;
        `,
        [
          budget.id,
          budget.tripId,
          budget.currencyCode,
          budget.plannedAmount ?? null,
          budget.createdAt,
          budget.updatedAt,
        ],
      );

      await transaction.execute(
        `DELETE FROM budget_items WHERE budget_id = ?;`,
        [budget.id],
      );

      for (const item of budget.items) {
        await this.insertItem(
          transaction,
          item,
        );
      }
    });
  }

  async saveItem(item: BudgetItem): Promise<void> {
    await this.insertItem(
      this.database,
      item,
    );
  }

  private async insertItem(
    connection: DatabaseConnection,
    item: BudgetItem,
  ): Promise<void> {
    await connection.execute(
      `
        INSERT INTO budget_items (
          id, budget_id, trip_id, booking_id, stop_id,
          title, category, status, amount, currency_code,
          notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          budget_id = excluded.budget_id,
          trip_id = excluded.trip_id,
          booking_id = excluded.booking_id,
          stop_id = excluded.stop_id,
          title = excluded.title,
          category = excluded.category,
          status = excluded.status,
          amount = excluded.amount,
          currency_code = excluded.currency_code,
          notes = excluded.notes,
          updated_at = excluded.updated_at;
      `,
      [
        item.id,
        item.budgetId,
        item.tripId,
        item.bookingId ?? null,
        item.stopId ?? null,
        item.title,
        item.category,
        item.status,
        item.amount,
        item.currencyCode,
        item.notes ?? null,
        item.createdAt,
        item.updatedAt,
      ],
    );
  }

  async deleteItem(id: BudgetItemId): Promise<void> {
    await this.database.execute(
      `DELETE FROM budget_items WHERE id = ?;`,
      [id],
    );
  }
}

export const budgetRepository =
  new SQLiteBudgetRepository();
