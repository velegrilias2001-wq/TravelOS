import type {
  Budget,
  BudgetCategory,
  BudgetItem,
  TripFxRate,
} from '@/domain/entities';
import {
  convertWithTripFxRate,
  findTripFxRate,
} from './fx-rates';

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

export interface ConvertedExpenseTotal {
  currencyCode: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  asOf: string;
  source: TripFxRate['source'];
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
  convertedCurrencyTotals: ConvertedExpenseTotal[];
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
  fxRates: readonly TripFxRate[] = [],
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

  const convertedExpenses: Array<{
    item: BudgetItem;
    convertedAmount: number;
    rate: TripFxRate;
  }> = [];
  const unconvertedForeign: BudgetItem[] = [];

  for (const item of foreignCurrencyExpenses) {
    const rate = findTripFxRate(
      fxRates,
      item.currencyCode,
      normalizedAccountingCurrency,
    );

    if (!rate) {
      unconvertedForeign.push(item);
      continue;
    }

    convertedExpenses.push({
      item,
      convertedAmount: convertWithTripFxRate(
        item.amount,
        rate,
      ),
      rate,
    });
  }

  const convertedSpend = convertedExpenses.reduce(
    (total, entry) => total + entry.convertedAmount,
    0,
  );

  const spentAmount =
    includedExpenses.reduce(
      (total, item) => total + item.amount,
      0,
    ) + convertedSpend;

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
      amount:
        includedExpenses
          .filter(
            (item) =>
              item.category === category,
          )
          .reduce(
            (total, item) =>
              total + item.amount,
            0,
          ) +
        convertedExpenses
          .filter(
            (entry) =>
              entry.item.category === category,
          )
          .reduce(
            (total, entry) =>
              total + entry.convertedAmount,
            0,
          ),
    }))
    .filter((entry) => entry.amount > 0);

  const foreignByCurrency = new Map<
    string,
    ForeignCurrencyTotal
  >();

  for (const item of unconvertedForeign) {
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

  const convertedByCurrency = new Map<
    string,
    ConvertedExpenseTotal
  >();

  for (const entry of convertedExpenses) {
    const currencyCode = normalizeCurrencyCode(
      entry.item.currencyCode,
    );
    const current = convertedByCurrency.get(
      currencyCode,
    );

    convertedByCurrency.set(currencyCode, {
      currencyCode,
      originalAmount:
        (current?.originalAmount ?? 0) +
        entry.item.amount,
      convertedAmount:
        (current?.convertedAmount ?? 0) +
        entry.convertedAmount,
      rate: entry.rate.rate,
      asOf: entry.rate.asOf,
      source: entry.rate.source,
      itemCount: (current?.itemCount ?? 0) + 1,
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
    foreignCurrencyExpenses: unconvertedForeign,
    foreignCurrencyTotals: [
      ...foreignByCurrency.values(),
    ].sort((a, b) =>
      a.currencyCode.localeCompare(
        b.currencyCode,
      ),
    ),
    convertedCurrencyTotals: [
      ...convertedByCurrency.values(),
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
