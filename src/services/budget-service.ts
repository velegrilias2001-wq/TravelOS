import * as Crypto from 'expo-crypto';

import type {
  BookingId,
  Budget,
  BudgetCategory,
  BudgetItem,
  BudgetItemId,
  Trip,
  TripFxRate,
  TripId,
  TripStopId,
} from '@/domain/entities';

import {
  repositories,
  type RepositoryRegistry,
} from './repository-registry';
import { validateTripFxRate } from './fx-rates';
import {
  BUDGET_CATEGORIES,
  normalizeCurrencyCode,
} from './budget-calculations';

export interface BudgetExpenseInput {
  title: string;
  amount: number;
  currencyCode: string;
  category: BudgetCategory;
  date: string;
  notes?: string;
  bookingId?: BookingId;
  stopId?: TripStopId;
}

interface BudgetContext {
  trip: Trip;
  budget: Budget;
}

function isCalendarDateKey(
  value: string,
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validatePlannedAmount(
  amount: number,
): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      'Planned budget must be a non-negative amount',
    );
  }
}

function cleanExpenseInput(
  input: BudgetExpenseInput,
): BudgetExpenseInput {
  const title = input.title.trim();
  const currencyCode = normalizeCurrencyCode(
    input.currencyCode,
  );
  const date = input.date.trim();

  if (!title) {
    throw new Error(
      'Expense title is required',
    );
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error(
      'Expense amount must be greater than zero',
    );
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(
      'Expense currency must be a three-letter code',
    );
  }

  if (!BUDGET_CATEGORIES.includes(input.category)) {
    throw new Error(
      'Expense category is not supported',
    );
  }

  if (!isCalendarDateKey(date)) {
    throw new Error(
      'Expense date must be a valid calendar date',
    );
  }

  return {
    ...input,
    title,
    currencyCode,
    date,
    notes: input.notes?.trim() || undefined,
  };
}

export class BudgetService {
  constructor(
    private readonly repo:
      RepositoryRegistry = repositories,
    private readonly createId: () => string =
      () => Crypto.randomUUID(),
    private readonly now: () => string =
      () => new Date().toISOString(),
  ) {}

  async setPlannedBudget(
    tripId: TripId,
    plannedAmount: number,
  ): Promise<void> {
    validatePlannedAmount(plannedAmount);

    const trip = await this.requireTrip(tripId);
    const existing =
      await this.repo.budget.getByTripId(
        tripId,
      );

    this.assertBudgetCurrency(
      trip,
      existing,
    );

    const timestamp = this.now();
    const budget: Budget = existing
      ? {
          ...existing,
          currencyCode:
            normalizeCurrencyCode(
              trip.accountingCurrency,
            ),
          plannedAmount,
          updatedAt: timestamp,
        }
      : {
          id: this.createId(),
          tripId,
          currencyCode:
            normalizeCurrencyCode(
              trip.accountingCurrency,
            ),
          plannedAmount,
          items: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    await this.repo.budget.savePlan(budget);
  }

  async addExpense(
    tripId: TripId,
    input: BudgetExpenseInput,
  ): Promise<void> {
    const context =
      await this.requireBudgetContext(
        tripId,
      );
    const cleanInput =
      cleanExpenseInput(input);

    await this.validateLinks(
      tripId,
      cleanInput,
    );

    const timestamp = this.now();
    const item: BudgetItem = {
      id: this.createId(),
      budgetId: context.budget.id,
      tripId,
      bookingId: cleanInput.bookingId,
      stopId: cleanInput.stopId,
      title: cleanInput.title,
      category: cleanInput.category,
      status: 'paid',
      amount: cleanInput.amount,
      currencyCode:
        cleanInput.currencyCode,
      date: cleanInput.date,
      notes: cleanInput.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.repo.budget.saveItem(item);
  }

  async updateExpense(
    tripId: TripId,
    expenseId: BudgetItemId,
    input: BudgetExpenseInput,
  ): Promise<void> {
    const context =
      await this.requireBudgetContext(
        tripId,
      );
    const existing =
      context.budget.items.find(
        (item) => item.id === expenseId,
      );

    if (!existing) {
      throw new Error(
        'Expense was not found in this trip',
      );
    }

    const cleanInput =
      cleanExpenseInput(input);

    await this.validateLinks(
      tripId,
      cleanInput,
    );

    await this.repo.budget.saveItem({
      ...existing,
      bookingId: cleanInput.bookingId,
      stopId: cleanInput.stopId,
      title: cleanInput.title,
      category: cleanInput.category,
      amount: cleanInput.amount,
      currencyCode:
        cleanInput.currencyCode,
      date: cleanInput.date,
      notes: cleanInput.notes,
      updatedAt: this.now(),
    });
  }

  async deleteExpense(
    tripId: TripId,
    expenseId: BudgetItemId,
  ): Promise<void> {
    const context =
      await this.requireBudgetContext(
        tripId,
      );

    if (
      !context.budget.items.some(
        (item) => item.id === expenseId,
      )
    ) {
      throw new Error(
        'Expense was not found in this trip',
      );
    }

    await this.repo.budget.deleteItem(
      expenseId,
    );
  }

  async saveFxRate(
    tripId: TripId,
    input: {
      fromCurrency: string;
      rate: number;
      asOf: string;
    },
  ): Promise<void> {
    const trip = await this.requireTrip(tripId);
    const validated = validateTripFxRate({
      fromCurrency: input.fromCurrency,
      toCurrency: trip.accountingCurrency,
      rate: input.rate,
      asOf: input.asOf,
      source: 'traveler',
    });
    const timestamp = this.now();
    const existing =
      (await this.repo.fxRates.getByTripId(tripId)).find(
        (rate) =>
          normalizeCurrencyCode(rate.fromCurrency) ===
            validated.fromCurrency &&
          normalizeCurrencyCode(rate.toCurrency) ===
            validated.toCurrency,
      );

    const rate: TripFxRate = existing
      ? {
          ...existing,
          ...validated,
          updatedAt: timestamp,
        }
      : {
          id: this.createId(),
          tripId,
          ...validated,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    await this.repo.fxRates.save(rate);
  }

  async deleteFxRate(
    tripId: TripId,
    rateId: string,
  ): Promise<void> {
    const rates = await this.repo.fxRates.getByTripId(
      tripId,
    );

    if (!rates.some((rate) => rate.id === rateId)) {
      throw new Error(
        'FX rate was not found in this trip',
      );
    }

    await this.repo.fxRates.delete(rateId);
  }

  private async requireTrip(
    tripId: TripId,
  ): Promise<Trip> {
    const trip =
      await this.repo.trip.getById(tripId);

    if (!trip) {
      throw new Error('Trip was not found');
    }

    return trip;
  }

  private async requireBudgetContext(
    tripId: TripId,
  ): Promise<BudgetContext> {
    const trip = await this.requireTrip(tripId);
    const budget =
      await this.repo.budget.getByTripId(
        tripId,
      );

    if (!budget) {
      throw new Error(
        'Set a planned budget before adding expenses',
      );
    }

    this.assertBudgetCurrency(trip, budget);

    return { trip, budget };
  }

  private assertBudgetCurrency(
    trip: Trip,
    budget: Budget | null,
  ): void {
    if (
      budget &&
      normalizeCurrencyCode(
        budget.currencyCode,
      ) !==
        normalizeCurrencyCode(
          trip.accountingCurrency,
        )
    ) {
      throw new Error(
        'Budget currency does not match the trip accounting currency',
      );
    }
  }

  private async validateLinks(
    tripId: TripId,
    input: BudgetExpenseInput,
  ): Promise<void> {
    if (input.bookingId) {
      const booking =
        await this.repo.booking.getById(
          input.bookingId,
        );

      if (!booking || booking.tripId !== tripId) {
        throw new Error(
          'Linked booking does not belong to this trip',
        );
      }
    }

    if (input.stopId) {
      const stops =
        await this.repo.trip.getStops(tripId);

      if (
        !stops.some(
          (stop) => stop.id === input.stopId,
        )
      ) {
        throw new Error(
          'Linked itinerary stop does not belong to this trip',
        );
      }
    }
  }
}

export const budgetService =
  new BudgetService();
