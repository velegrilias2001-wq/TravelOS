import type { Booking } from '@/domain/entities';

function normalizeCurrencyCode(
  value: string | undefined,
): string | undefined {
  const clean = value?.trim().toUpperCase();
  return clean || undefined;
}

export function validateBookingFinance(
  booking: Booking,
): void {
  const amount = booking.amount;
  const currencyCode = normalizeCurrencyCode(
    booking.currencyCode,
  );
  const hasAmount = amount !== undefined;
  const hasCurrency = currencyCode !== undefined;

  if (hasAmount !== hasCurrency) {
    throw new Error(
      'Booking amount and currency must be saved together',
    );
  }

  if (
    hasAmount &&
    (!Number.isFinite(amount) || amount < 0)
  ) {
    throw new Error(
      'Booking amount must be a non-negative number',
    );
  }

  if (hasCurrency && !/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(
      'Booking currency must use a three-letter code',
    );
  }

  if (booking.isPaid && booking.status === 'cancelled') {
    throw new Error(
      'A cancelled booking cannot be marked paid',
    );
  }
}
