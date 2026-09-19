/**
 * Display locale for dates and numbers.
 *
 * Copy is Greek and comes from the catalogue in `src/i18n`. This resolves a
 * separate thing: the locale `Intl` uses to format dates, times and numbers,
 * which follows the device and falls back to `en-GB`.
 *
 * Those two can disagree. On a device set to English the app renders Greek
 * copy next to English-formatted dates such as "Sep 20, 2026". Whether
 * formatting should be pinned to `el-GR` alongside the copy is an open
 * product decision, recorded in the roadmap; nothing here assumes it.
 *
 * RTL remains deferred.
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
