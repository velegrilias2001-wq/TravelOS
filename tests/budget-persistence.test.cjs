const assert =
  require('node:assert/strict');
const test = require('node:test');

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  deleteBudgetItem,
  upsertBudgetItem,
  upsertBudgetPlan,
} = require(
  '../.test-build/src/data/repositories/budget-persistence-operations.js',
);
const {
  NodeSQLiteDatabase,
} = require(
  './support/node-sqlite-database.cjs',
);

const TIMESTAMP =
  '2026-08-23T12:00:00.000Z';

async function createBudgetDatabase() {
  const database =
    new NodeSQLiteDatabase();

  await migrateDatabase(database);

  await database.execute(
    `
      INSERT INTO trips (
        id,
        title,
        status,
        start_date,
        end_date,
        accounting_currency,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      'trip-1',
      'Budget Persistence',
      'planned',
      '2026-09-01',
      '2026-09-03',
      'EUR',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  await database.execute(
    `
      INSERT INTO trip_days (
        id,
        trip_id,
        date,
        day_number,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?);
    `,
    [
      'day-1',
      'trip-1',
      '2026-09-01',
      1,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  await database.execute(
    `
      INSERT INTO trip_stops (
        id,
        trip_id,
        day_id,
        title,
        type,
        position,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      'stop-1',
      'trip-1',
      'day-1',
      'Museum',
      'activity',
      1,
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  await database.execute(
    `
      INSERT INTO bookings (
        id,
        trip_id,
        type,
        status,
        title,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    [
      'booking-1',
      'trip-1',
      'activity',
      'confirmed',
      'Museum ticket',
      TIMESTAMP,
      TIMESTAMP,
    ],
  );

  return database;
}

function makeBudget(overrides = {}) {
  return {
    id: 'budget-1',
    tripId: 'trip-1',
    currencyCode: 'EUR',
    plannedAmount: 1500,
    items: [],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeExpense(overrides = {}) {
  return {
    id: 'expense-1',
    budgetId: 'budget-1',
    tripId: 'trip-1',
    title: 'Museum entry',
    category: 'activities',
    status: 'paid',
    amount: 35,
    currencyCode: 'EUR',
    date: '2026-09-01',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

test(
  'budget persistence saves a plan without replacing expenses and preserves expense fields through edits',
  async () => {
    const database =
      await createBudgetDatabase();

    try {
      await upsertBudgetPlan(
        database,
        makeBudget(),
      );

      await upsertBudgetItem(
        database,
        makeExpense({
          id: 'expense-eur',
          bookingId: 'booking-1',
          stopId: 'stop-1',
          notes: 'Original note',
        }),
      );

      await upsertBudgetItem(
        database,
        makeExpense({
          id: 'expense-usd',
          title: 'Airport snack',
          category: 'food',
          amount: 18.5,
          currencyCode: 'USD',
          date: '2026-09-02',
        }),
      );

      await upsertBudgetPlan(
        database,
        makeBudget({
          id: 'concurrent-budget-id',
          plannedAmount: 1800,
          updatedAt:
            '2026-08-23T13:00:00.000Z',
        }),
      );

      const budget =
        await database.queryFirst(
          `
            SELECT id, planned_amount
            FROM budgets
            WHERE trip_id = ?;
          `,
          ['trip-1'],
        );

      assert.deepEqual({ ...budget }, {
        id: 'budget-1',
        planned_amount: 1800,
      });

      const itemCount =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM budget_items
            WHERE budget_id = ?;
          `,
          ['budget-1'],
        );

      assert.equal(itemCount.count, 2);

      await upsertBudgetItem(
        database,
        makeExpense({
          id: 'expense-usd',
          title: 'Airport breakfast',
          category: 'food',
          amount: 22.75,
          currencyCode: 'USD',
          date: '2026-09-03',
          bookingId: 'booking-1',
          stopId: 'stop-1',
          notes: 'Edited note',
          createdAt: TIMESTAMP,
          updatedAt:
            '2026-08-23T14:00:00.000Z',
        }),
      );

      const edited =
        await database.queryFirst(
          `
            SELECT
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
            FROM budget_items
            WHERE id = ?;
          `,
          ['expense-usd'],
        );

      assert.deepEqual({ ...edited }, {
        id: 'expense-usd',
        budget_id: 'budget-1',
        trip_id: 'trip-1',
        booking_id: 'booking-1',
        stop_id: 'stop-1',
        title: 'Airport breakfast',
        category: 'food',
        status: 'paid',
        amount: 22.75,
        currency_code: 'USD',
        expense_date: '2026-09-03',
        notes: 'Edited note',
        created_at: TIMESTAMP,
        updated_at:
          '2026-08-23T14:00:00.000Z',
      });

      await deleteBudgetItem(
        database,
        'expense-eur',
      );

      const remaining = await database.query(
        `
          SELECT id
          FROM budget_items
          ORDER BY id ASC;
        `,
      );

      assert.deepEqual(
        remaining.map((row) => ({ ...row })),
        [
        { id: 'expense-usd' },
        ],
      );
    } finally {
      database.close();
    }
  },
);
