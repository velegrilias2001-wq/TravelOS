import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  CalendarDateField,
  LocalTimeField,
} from '@/components/ui/native-date-time-fields';
import {
  type BookingTimeDraft,
  bookingTimeDraft,
} from '@/features/trip-bookings/booking-form-model';
import { styles } from '@/features/trip-bookings/bookings-styles';
import { colors } from '@/theme';
import { strings } from '@/i18n';

/**
 * Booking start/end editor. Preserves an absolute or unparseable stored value
 * instead of rewriting it as a local date/time. Extracted verbatim from
 * bookings.tsx.
 */
export function BookingTimeEditor({
  label,
  draft,
  fallbackDate,
  onChange,
}: {
  label: string;
  draft: BookingTimeDraft;
  fallbackDate: string;
  onChange(value: BookingTimeDraft): void;
}) {
  if (draft.mode === 'preserved') {
    return (
      <View style={styles.temporalField}>
        <Text style={styles.temporalSectionLabel}>{label}</Text>
        <View style={styles.preservedTimeCard}>
          <View style={styles.preservedTimeHeader}>
            <Ionicons
              name={
                draft.kind === 'absolute-instant'
                  ? 'globe-outline'
                  : 'warning-outline'
              }
              size={20}
              color={
                draft.kind === 'absolute-instant'
                  ? colors.teal
                  : colors.warning
              }
            />
            <Text style={styles.preservedTimeTitle}>
              {draft.kind === 'absolute-instant'
                ? strings.bookings.savedAbsolute
                : strings.bookings.savedNeedsReview}
            </Text>
          </View>
          <Text style={styles.preservedTimeValue}>
            {draft.original}
          </Text>
          <Text style={styles.preservedTimeBody}>
            {draft.kind === 'absolute-instant'
              ? strings.bookings.savedOtherFormat
              : strings.bookings.savedNotEditable}
          </Text>
          <View style={styles.preservedTimeActions}>
            <Pressable
              accessibilityRole="button"
              style={styles.timeActionPrimary}
              onPress={() =>
                onChange({
                  mode: 'local',
                  date: '',
                  time: '',
                  edited: true,
                })
              }
            >
              <Text style={styles.timeActionPrimaryText}>
                Replace with local time
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.timeActionSecondary}
              onPress={() =>
                onChange({
                  mode: 'local',
                  date: '',
                  time: '',
                  edited: true,
                })
              }
            >
              <Text style={styles.timeActionSecondaryText}>
                Clear
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.temporalField}>
      <Text style={styles.temporalSectionLabel}>{label}</Text>

      <View style={styles.temporalRow}>
        <View style={styles.temporalHalf}>
          <CalendarDateField
            label="DATE"
            value={draft.date}
            fallbackDate={fallbackDate}
            compact
            onChange={(date) =>
              onChange({ ...draft, date, edited: true })
            }
          />
        </View>

        <View style={styles.temporalHalf}>
          <LocalTimeField
            label="TIME"
            value={draft.time}
            compact
            onChange={(time) =>
              onChange({ ...draft, time, edited: true })
            }
            onClear={() =>
              onChange({ ...draft, time: '', edited: true })
            }
          />
        </View>
      </View>

      {(draft.date || draft.time) && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            onChange(bookingTimeDraft())
          }
        >
          <Text style={styles.clearTemporalValue}>
            CLEAR DATE AND TIME
          </Text>
        </Pressable>
      )}
    </View>
  );
}
