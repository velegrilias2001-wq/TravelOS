import type { Booking } from '@/domain/entities';

export interface BookingQuickAction {
  id: 'open_url' | 'copy_code';
  label: string;
  accessibilityLabel: string;
  /** Value to open or copy — never invented. */
  value: string;
}

/**
 * External actions derived only from saved booking fields.
 * Missing fields yield no action.
 */
export function listBookingQuickActions(
  booking: Pick<Booking, 'externalUrl' | 'confirmationCode' | 'title'>,
): BookingQuickAction[] {
  const actions: BookingQuickAction[] = [];
  const url = normalizeHttpUrl(booking.externalUrl);
  const code = booking.confirmationCode?.trim();

  if (url) {
    actions.push({
      id: 'open_url',
      label: 'Open link',
      accessibilityLabel: `Open booking link for ${booking.title}`,
      value: url,
    });
  }

  if (code) {
    actions.push({
      id: 'copy_code',
      label: 'Copy code',
      accessibilityLabel: `Copy confirmation code ${code}`,
      value: code,
    });
  }

  return actions;
}

export function normalizeHttpUrl(
  value: string | undefined,
): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withScheme);

    if (
      parsed.protocol !== 'http:' &&
      parsed.protocol !== 'https:'
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
