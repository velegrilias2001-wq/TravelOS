/**
 * Display locale for dates and numbers.
 * Copy stays English in V1; only formatting follows the device.
 * RTL / string catalogs are deferred.
 */
export function resolveDisplayLocale(): string {
  try {
    const resolved = Intl.DateTimeFormat()
      .resolvedOptions()
      .locale;
    if (resolved && resolved.trim()) {
      return resolved;
    }
  } catch {
    // Fall through.
  }

  return 'en-GB';
}

export function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
): string {
  try {
    return new Intl.NumberFormat(resolveDisplayLocale(), {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

export function formatPlainNumber(value: number): string {
  return new Intl.NumberFormat(resolveDisplayLocale()).format(
    value,
  );
}
