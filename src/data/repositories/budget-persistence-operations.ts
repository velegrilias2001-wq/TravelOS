import type {
  DatabaseConnection,
} from '../database/database';

import type {
  Budget,
  BudgetItem,
  BudgetItemId,
} from '../../domain/entities/budget';

export async function upsertBudgetPlan(
  connection: DatabaseConnection,
  budget: Budget,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO budgets (
        id,
        trip_id,
        currency_code,
        planned_amount,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(trip_id) DO UPDATE SET
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
}

export async function upsertBudgetItem(
  connection: DatabaseConnection,
  item: BudgetItem,
): Promise<void> {
  await connection.execute(
    `
      INSERT INTO budget_items (
        id,
        budget_id,
        trip_id,
        booking_id,
        stop_id,
        title,
        category,
        status,
        amount,
        currency_code,
        expense_date,
        notes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        expense_date = excluded.expense_date,
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
      item.date ?? null,
      item.notes ?? null,
      item.createdAt,
      item.updatedAt,
    ],
  );
}

export async function deleteBudgetItem(
  connection: DatabaseConnection,
  id: BudgetItemId,
): Promise<void> {
  await connection.execute(
    `DELETE FROM budget_items WHERE id = ?;`,
    [id],
  );
}
