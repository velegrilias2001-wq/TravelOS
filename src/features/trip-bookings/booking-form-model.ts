import { Ionicons } from '@expo/vector-icons';

import type {
  BookingStatus,
  BookingType,
} from '@/domain/entities';
import {
  combineBookingLocalDateTime,
  formatBookingTemporalValue,
  parseBookingTemporalValue,
} from '@/services/booking-time';
import { formatCalendarDateForDisplay } from '@/services/time-truth';
import { strings } from '@/i18n';

/**
 * Booking type/status catalogues and the local draft model used by the
 * Bookings editor. Extracted verbatim from bookings.tsx.
 */
export const BOOKING_TYPES: {
  label: string;
  value: BookingType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: strings.bookingType.flight,
    value: 'flight',
    icon: 'airplane-outline',
  },
  {
    label: strings.bookingType.train,
    value: 'train',
    icon: 'train-outline',
  },
  {
    label: strings.bookingType.bus,
    value: 'bus',
    icon: 'bus-outline',
  },
  {
    label: strings.bookingType.ferry,
    value: 'ferry',
    icon: 'boat-outline',
  },
  {
    label: strings.bookingType.car,
    value: 'car',
    icon: 'car-outline',
  },
  {
    label: strings.bookingType.hotel,
    value: 'accommodation',
    icon: 'bed-outline',
  },
  {
    label: strings.bookingType.activity,
    value: 'activity',
    icon: 'sparkles-outline',
  },
  {
    label: strings.bookingType.restaurant,
    value: 'restaurant',
    icon: 'restaurant-outline',
  },
  {
    label: strings.bookingType.ticket,
    value: 'ticket',
    icon: 'ticket-outline',
  },
  {
    label: strings.bookingType.other,
    value: 'other',
    icon: 'briefcase-outline',
  },
];

export const BOOKING_STATUSES: {
  label: string;
  value: BookingStatus;
}[] = [
  {
    label: strings.bookingStatus.planned,
    value: 'planned',
  },
  {
    label: strings.bookingStatus.confirmed,
    value: 'confirmed',
  },
  {
    label: strings.bookingStatus.completed,
    value: 'completed',
  },
  {
    label: strings.bookingStatus.cancelled,
    value: 'cancelled',
  },
];

export function getBookingIcon(
  type: BookingType,
): keyof typeof Ionicons.glyphMap {
  return (
    BOOKING_TYPES.find(
      (item) => item.value === type,
    )?.icon ?? 'briefcase-outline'
  );
}

export function formatDateTime(
  value?: string,
): string | null {
  return formatBookingTemporalValue(value);
}

export interface BookingTimeDraft {
  mode: 'local' | 'preserved';
  original?: string;
  date: string;
  time: string;
  edited: boolean;
  kind?: 'absolute-instant' | 'invalid';
}

export function bookingTimeDraft(
  value?: string,
): BookingTimeDraft {
  if (!value) {
    return {
      mode: 'local',
      date: '',
      time: '',
      edited: false,
    };
  }

  const parsed = parseBookingTemporalValue(value);

  if (
    parsed.kind === 'local-wall-time' &&
    parsed.date &&
    parsed.time
  ) {
    return {
      mode: 'local',
      original: value,
      date: parsed.date,
      time: parsed.time,
      edited: false,
    };
  }

  return {
    mode: 'preserved',
    original: value,
    date: '',
    time: '',
    edited: false,
    kind:
      parsed.kind === 'absolute-instant'
        ? 'absolute-instant'
        : 'invalid',
  };
}

export function bookingValueFromDraft(
  draft: BookingTimeDraft,
  label: string,
): string | undefined {
  if (draft.mode === 'preserved') {
    return draft.original;
  }

  if (!draft.edited && draft.original) {
    return draft.original;
  }

  if (!draft.date && !draft.time) {
    return undefined;
  }

  if (!draft.date || !draft.time) {
    throw new Error(
      `Choose both a ${label.toLowerCase()} date and time, or clear both`,
    );
  }

  return combineBookingLocalDateTime(
    draft.date,
    draft.time,
  );
}

export function formatStopDate(
  value: string,
): string {
  return formatCalendarDateForDisplay(value, {
    day: 'numeric',
    month: 'short',
  });
}
