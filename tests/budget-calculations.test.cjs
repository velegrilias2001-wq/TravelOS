const assert =
  require('node:assert/strict');
const test = require('node:test');

const {
  calculateBudgetSummary,
} = require(
  '../.test-build/src/services/budget-calculations.js',
);

const TIMESTAMP =
  '2026-08-23T12:00:00.000Z';

function expense(
  id,
  amount,
  currencyCode,
  category,
  status = 'paid',
) {
  return {
    id,
    budgetId: 'budget-1',
    tripId: 'trip-1',
    title: id,
    category,
    status,
    amount,
    currencyCode,
    date: '2026-09-01',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}

test(
  'budget summary aggregates only paid accounting-currency expenses',
  () => {
    const budget = {
      id: 'budget-1',
      tripId: 'trip-1',
      currencyCode: 'EUR',
      plannedAmount: 1000,
      items: [
        expense(
          'hotel',
          300,
          'EUR',
          'accommodation',
        ),
        expense(
          'dinner',
          75,
          'eur',
          'food',
        ),
        expense(
          'train',
          50,
          'EUR',
          'transport',
          'committed',
        ),
        expense(
          'museum-yen',
          12000,
          'JPY',
          'activities',
        ),
        expense(
          'lunch-yen',
          2500,
          'JPY',
          'food',
        ),
        expense(
          'taxi-usd',
          40,
          'USD',
          'transport',
        ),
      ],
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    };

    const summary = calculateBudgetSummary(
      budget,
      'eur',
    );

    assert.equal(
      summary.accountingCurrency,
      'EUR',
    );
    assert.equal(summary.spentAmount, 375);
    assert.equal(
      summary.remainingAmount,
      625,
    );
    assert.equal(summary.progress, 0.375);

    assert.deepEqual(
      summary.categoryTotals,
      [
        {
          category: 'accommodation',
          amount: 300,
        },
        {
          category: 'food',
          amount: 75,
        },
      ],
    );

    assert.deepEqual(
      summary.foreignCurrencyTotals,
      [
        {
          currencyCode: 'JPY',
          amount: 14500,
          itemCount: 2,
        },
        {
          currencyCode: 'USD',
          amount: 40,
          itemCount: 1,
        },
      ],
    );
    assert.equal(
      summary.foreignCurrencyExpenses.length,
      3,
    );
    assert.equal(summary.notPaidItems.length, 1);
    assert.equal(
      summary.hasBudgetCurrencyConflict,
      false,
    );
  },
);

test(
  'budget summary identifies a budget currency conflict without converting it',
  () => {
    const summary = calculateBudgetSummary(
      {
        id: 'budget-1',
        tripId: 'trip-1',
        currencyCode: 'USD',
        plannedAmount: 500,
        items: [],
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      'EUR',
    );

    assert.equal(
      summary.hasBudgetCurrencyConflict,
      true,
    );
    assert.equal(summary.spentAmount, 0);
    assert.deepEqual(
      summary.foreignCurrencyTotals,
      [],
    );
  },
);
