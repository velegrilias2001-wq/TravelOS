import type { TripFxRate } from '@/domain/entities';
import { isCanonicalDateKey } from './time-truth';

function normalizeCurrencyCode(
  currencyCode: string,
): string {
  return currencyCode.trim().toUpperCase();
}

export function validateTripFxRate(
  rate: Pick<
    TripFxRate,
    | 'fromCurrency'
    | 'toCurrency'
    | 'rate'
    | 'asOf'
    | 'source'
  >,
): {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  asOf: string;
  source: TripFxRate['source'];
} {
  const fromCurrency = normalizeCurrencyCode(
    rate.fromCurrency,
  );
  const toCurrency = normalizeCurrencyCode(
    rate.toCurrency,
  );

  if (
    !/^[A-Z]{3}$/.test(fromCurrency) ||
    !/^[A-Z]{3}$/.test(toCurrency)
  ) {
    throw new Error(
      'FX currencies must use three-letter codes',
    );
  }

  if (fromCurrency === toCurrency) {
    throw new Error(
      'An FX rate needs two different currencies',
    );
  }

  if (!Number.isFinite(rate.rate) || rate.rate <= 0) {
    throw new Error(
      'An FX rate must be a positive number',
    );
  }

  if (!isCanonicalDateKey(rate.asOf)) {
    throw new Error(
      'An FX rate needs an explicit as-of date',
    );
  }

  if (rate.source !== 'traveler') {
    throw new Error(
      'Only an explicit traveler FX rate can be saved',
    );
  }

  return {
    fromCurrency,
    toCurrency,
    rate: rate.rate,
    asOf: rate.asOf,
    source: rate.source,
  };
}

export function findTripFxRate(
  rates: readonly TripFxRate[],
  fromCurrency: string,
  toCurrency: string,
): TripFxRate | undefined {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  return rates.find(
    (rate) =>
      normalizeCurrencyCode(rate.fromCurrency) ===
        from &&
      normalizeCurrencyCode(rate.toCurrency) === to,
  );
}

export function convertWithTripFxRate(
  amount: number,
  rate: TripFxRate,
): number {
  if (!Number.isFinite(amount)) {
    throw new Error(
      'Converted amounts must be finite numbers',
    );
  }

  return amount * rate.rate;
}
