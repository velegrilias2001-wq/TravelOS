import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  calendarDateFromPickerValue,
  formatCalendarDateForDisplay,
  isCanonicalDateKey,
  isCanonicalLocalTime,
  localTimeFromPickerValue,
  pickerValueFromCalendarDate,
  pickerValueFromLocalTime,
} from '@/services/time-truth';
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  shadows,
  spacing,
} from '@/theme';

interface SharedFieldProps {
  label: string;
  value: string;
  disabled?: boolean;
}

interface CalendarDateFieldProps
  extends SharedFieldProps {
  onChange(value: string): void;
  fallbackDate?: string;
}

export function CalendarDateField({
  label,
  value,
  onChange,
  fallbackDate,
  disabled = false,
}: CalendarDateFieldProps) {
  const [isIOSPickerOpen, setIOSPickerOpen] =
    useState(false);
  const fallback = pickerValueFromCalendarDate(
    fallbackDate ?? '',
  );
  const pickerValue = pickerValueFromCalendarDate(
    value,
    fallback,
  );

  const select = (selected: Date) => {
    onChange(calendarDateFromPickerValue(selected));
  };

  const open = () => {
    if (disabled) {
      return;
    }

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: 'date',
        onChange: (
          event: DateTimePickerEvent,
          selected?: Date,
        ) => {
          if (event.type === 'set' && selected) {
            select(selected);
          }
        },
      });
      return;
    }

    setIOSPickerOpen((current) => !current);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label.toLowerCase()}`}
        disabled={disabled}
        style={[
          styles.button,
          disabled && styles.disabled,
        ]}
        onPress={open}
      >
        <View style={styles.icon}>
          <Ionicons
            name="calendar-outline"
            size={19}
            color={colors.brand}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.value}>
            {value
              ? formatCalendarDateForDisplay(
                  value,
                  {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  },
                )
              : 'Choose a date'}
          </Text>
          {value ? (
            <Text
              style={[
                styles.raw,
                !isCanonicalDateKey(value) &&
                  styles.review,
              ]}
            >
              {value}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {Platform.OS === 'ios' &&
        isIOSPickerOpen && (
          <View style={styles.iosPicker}>
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display="inline"
              onChange={(
                event,
                selected,
              ) => {
                if (event.type === 'set' && selected) {
                  select(selected);
                }
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setIOSPickerOpen(false)
              }
            >
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
        )}
    </View>
  );
}

interface LocalTimeFieldProps
  extends SharedFieldProps {
  onChange(value: string): void;
  onClear?(): void;
  help?: string;
}

export function LocalTimeField({
  label,
  value,
  onChange,
  onClear,
  help,
  disabled = false,
}: LocalTimeFieldProps) {
  const [isIOSPickerOpen, setIOSPickerOpen] =
    useState(false);
  const pickerValue =
    pickerValueFromLocalTime(value);
  const valid =
    !value || isCanonicalLocalTime(value);

  const select = (selected: Date) => {
    onChange(localTimeFromPickerValue(selected));
  };

  const open = () => {
    if (disabled) {
      return;
    }

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: 'time',
        is24Hour: true,
        onChange: (
          event: DateTimePickerEvent,
          selected?: Date,
        ) => {
          if (event.type === 'set' && selected) {
            select(selected);
          }
        },
      });
      return;
    }

    setIOSPickerOpen((current) => !current);
  };

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {value && onClear ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            disabled={disabled}
            onPress={onClear}
          >
            <Text style={styles.clear}>CLEAR</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label.toLowerCase()}`}
        disabled={disabled}
        style={[
          styles.button,
          disabled && styles.disabled,
        ]}
        onPress={open}
      >
        <View style={styles.icon}>
          <Ionicons
            name="time-outline"
            size={19}
            color={colors.brand}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.value}>
            {value || 'Choose an optional time'}
          </Text>
          <Text
            style={[
              styles.raw,
              !valid && styles.review,
            ]}
          >
            {valid
              ? 'Local wall-clock time'
              : 'Saved time needs review'}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textMuted}
        />
      </Pressable>
      {help ? (
        <Text style={styles.help}>{help}</Text>
      ) : null}

      {Platform.OS === 'ios' &&
        isIOSPickerOpen && (
          <View style={styles.iosPicker}>
            <DateTimePicker
              value={pickerValue}
              mode="time"
              display="spinner"
              is24Hour
              onChange={(
                event,
                selected,
              ) => {
                if (event.type === 'set' && selected) {
                  select(selected);
                }
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setIOSPickerOpen(false)
              }
            >
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing[2],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },
  button: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...shadows.subtle,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  value: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  raw: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  review: {
    color: colors.warning,
  },
  clear: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1,
    color: colors.brand,
  },
  help: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  iosPicker: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingBottom: spacing[3],
  },
  done: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing[4],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.bodySmall,
    color: colors.brand,
  },
  disabled: {
    opacity: 0.55,
  },
});
