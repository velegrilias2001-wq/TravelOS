import type {
  Budget,
  BudgetCategory,
  BudgetItem,
} from '@/domain/entities';

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  'accommodation',
  'transport',
  'food',
  'activities',
  'shopping',
  'insurance',
  'other',
];

export interface BudgetCategoryTotal {
  category: BudgetCategory;
  amount: number;
}

export interface ForeignCurrencyTotal {
  currencyCode: string;
  amount: number;
  itemCount: number;
}

export interface BudgetSummary {
  accountingCurrency: string;
  plannedAmount: number | null;
  spentAmount: number;
  remainingAmount: number | null;
  progress: number | null;
  categoryTotals: BudgetCategoryTotal[];
  includedExpenses: BudgetItem[];
  foreignCurrencyExpenses: BudgetItem[];
  foreignCurrencyTotals: ForeignCurrencyTotal[];
  notPaidItems: BudgetItem[];
  hasBudgetCurrencyConflict: boolean;
}

export function normalizeCurrencyCode(
  currencyCode: string,
): string {
  return currencyCode.trim().toUpperCase();
}

export function calculateBudgetSummary(
  budget: Budget | null,
  accountingCurrency: string,
): BudgetSummary {
  const normalizedAccountingCurrency =
    normalizeCurrencyCode(accountingCurrency);

  const items = budget?.items ?? [];

  const paidItems = items.filter(
    (item) => item.status === 'paid',
  );

  const includedExpenses = paidItems.filter(
    (item) =>
      normalizeCurrencyCode(
        item.currencyCode,
      ) === normalizedAccountingCurrency,
  );

  const foreignCurrencyExpenses =
    paidItems.filter(
      (item) =>
        normalizeCurrencyCode(
          item.currencyCode,
        ) !== normalizedAccountingCurrency,
    );

  const spentAmount = includedExpenses.reduce(
    (total, item) => total + item.amount,
    0,
  );

  const plannedAmount =
    budget?.plannedAmount ?? null;

  const remainingAmount =
    plannedAmount === null
      ? null
      : plannedAmount - spentAmount;

  const progress =
    plannedAmount !== null &&
    plannedAmount > 0
      ? spentAmount / plannedAmount
      : null;

  const categoryTotals = BUDGET_CATEGORIES
    .map((category) => ({
      category,
      amount: includedExpenses
        .filter(
          (item) =>
            item.category === category,
        )
        .reduce(
          (total, item) =>
            total + item.amount,
          0,
        ),
    }))
    .filter((entry) => entry.amount > 0);

  const foreignByCurrency = new Map<
    string,
    ForeignCurrencyTotal
  >();

  for (const item of foreignCurrencyExpenses) {
    const currencyCode = normalizeCurrencyCode(
      item.currencyCode,
    );

    const current = foreignByCurrency.get(
      currencyCode,
    );

    foreignByCurrency.set(currencyCode, {
      currencyCode,
      amount:
        (current?.amount ?? 0) + item.amount,
      itemCount:
        (current?.itemCount ?? 0) + 1,
    });
  }

  return {
    accountingCurrency:
      normalizedAccountingCurrency,
    plannedAmount,
    spentAmount,
    remainingAmount,
    progress,
    categoryTotals,
    includedExpenses,
    foreignCurrencyExpenses,
    foreignCurrencyTotals: [
      ...foreignByCurrency.values(),
    ].sort((a, b) =>
      a.currencyCode.localeCompare(
        b.currencyCode,
      ),
    ),
    notPaidItems: items.filter(
      (item) => item.status !== 'paid',
    ),
    hasBudgetCurrencyConflict:
      budget !== null &&
      normalizeCurrencyCode(
        budget.currencyCode,
      ) !== normalizedAccountingCurrency,
  };
}
