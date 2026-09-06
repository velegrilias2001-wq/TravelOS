import { Ionicons } from '@expo/vector-icons';
import {
  pickLocation,
} from 'expo-location-picker';
import {
  useState,
} from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  TripDestination,
} from '@/domain/entities';
import {
  hasRealDestinationCoordinates,
  mapDestinationProviderResult,
  type DestinationSelection,
} from '@/services/destination-authoring';
import {
  enrichSelectionWithProviderTimezone,
} from '@/services/timezone-lookup';
import {
  isValidIanaTimeZone,
} from '@/services/time-truth';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

type DestinationDisplayValue = Pick<
  TripDestination,
  | 'name'
  | 'countryCode'
  | 'latitude'
  | 'longitude'
  | 'timezone'
  | 'timezoneSource'
  | 'currencyCode'
  | 'placeId'
>;

interface DestinationPickerFieldProps {
  label?: string;
  destination?: DestinationDisplayValue | null;
  onSelect(selection: DestinationSelection): void;
  onTimeZoneChange?(timezone: string | null): void;
  disabled?: boolean;
  variant?: 'card' | 'add';
}

const COMMON_TIME_ZONES = [
  'Europe/Athens',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'Asia/Tokyo',
];

function optionalProviderString(
  result: object,
  key: string,
): string | undefined {
  const value = (result as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim()
    ? value
    : undefined;
}

function timezoneSourceLabel(
  source: DestinationDisplayValue['timezoneSource'],
): string {
  if (source === 'provider') {
    return 'From the map provider';
  }

  if (source === 'catalogue') {
    return 'From the catalogue';
  }

  if (source === 'traveler') {
    return 'Set by you';
  }

  return 'Saved timezone';
}

export function DestinationPickerField({
  label = 'DESTINATION',
  destination,
  onSelect,
  onTimeZoneChange,
  disabled = false,
  variant = 'card',
}: DestinationPickerFieldProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [customTimeZone, setCustomTimeZone] = useState('');
  const isMapped = Boolean(
    destination &&
      hasRealDestinationCoordinates(destination),
  );

  const actionLabel = destination
    ? isMapped
      ? 'Replace map location'
      : 'Add map location'
    : variant === 'add'
      ? 'Add destination'
      : 'Choose destination';

  const chooseDestination = async () => {
    try {
      setIsPicking(true);

      const result = await pickLocation({
        title: variant === 'add' ? 'Add destination' : 'Choose destination',
        doneButtonTitle: 'Use destination',
        cancelButtonTitle: 'Cancel',
        searchPlaceholder:
          'Search cities, regions or countries…',
        initialRadiusMeters: 120_000,
        disableCurrentLocation: true,
        ...(destination && isMapped
          ? {
              initialLatitude:
                destination.latitude,
              initialLongitude:
                destination.longitude,
            }
          : {}),
        theme: {
          primary: colors.brand,
          pin: colors.coral,
          colorScheme: 'light',
        },
      });

      if (!result) {
        return;
      }

      const mapped = mapDestinationProviderResult({
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
        locality: result.locality,
        administrativeArea:
          result.administrativeArea,
        formattedAddress:
          result.formattedAddress,
        country: result.country,
        countryCode: result.countryCode,
        timezone: optionalProviderString(
          result,
          'timezone',
        ),
        placeId: optionalProviderString(
          result,
          'placeId',
        ),
      });

      // Loopback Time Zone enrichment when the picker
      // has coords but no IANA zone. Fail closed → unknown.
      onSelect(
        await enrichSelectionWithProviderTimezone(
          mapped,
        ),
      );
    } catch {
      Alert.alert(
        'Could not choose destination',
        'The map selection could not be opened. Your destination is unchanged.',
      );
    } finally {
      setIsPicking(false);
    }
  };

  if (variant === 'add') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        disabled={disabled || isPicking}
        style={({ pressed }) => [
          styles.action,
          styles.addAction,
          pressed && styles.pressed,
          (disabled || isPicking) && styles.disabled,
        ]}
        onPress={() => void chooseDestination()}
      >
        <Ionicons
          name="add"
          size={18}
          color={colors.textInverse}
        />
        <Text style={styles.actionText}>
          {isPicking ? 'Opening map…' : actionLabel}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.card,
          isMapped && styles.cardMapped,
        ]}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.icon,
              isMapped && styles.iconMapped,
            ]}
          >
            <Ionicons
              name={
                isMapped
                  ? 'location'
                  : 'location-outline'
              }
              size={22}
              color={
                isMapped
                  ? colors.textInverse
                  : colors.teal
              }
            />
          </View>

          <View style={styles.copy}>
            <Text style={styles.stateLabel}>
              {destination
                ? 'MAP LOCATION'
                : 'WHERE ARE YOU GOING?'}
            </Text>

            <Text style={styles.name}>
              {destination?.name ||
                'Choose a city, region or country'}
            </Text>

            {destination?.countryCode && (
              <Text style={styles.country}>
                {destination.countryCode}
              </Text>
            )}
          </View>
        </View>

        {destination && (
          <View style={styles.mapStatus}>
            <Ionicons
              name={
                isMapped
                  ? 'map-outline'
                  : 'map-outline'
              }
              size={17}
              color={
                isMapped
                  ? colors.teal
                  : colors.textMuted
              }
            />
            <Text
              style={[
                styles.mapStatusText,
                isMapped &&
                  styles.mapStatusTextReady,
              ]}
            >
              {isMapped
                ? 'Map location saved'
                : 'Map location not added'}
            </Text>
          </View>
        )}

        {destination ? (
          <View style={styles.timezoneRow}>
            <View style={styles.timezoneCopy}>
              <Text style={styles.timezoneLabel}>
                TIMEZONE
              </Text>
              <Text style={styles.timezoneValue}>
                {destination.timezone ?? 'Unknown'}
              </Text>
              <Text style={styles.timezoneSource}>
                {destination.timezone
                  ? timezoneSourceLabel(
                      destination.timezoneSource,
                    )
                  : 'Not guessed from the map pin'}
              </Text>
            </View>
            {onTimeZoneChange ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set timezone"
                disabled={disabled}
                style={({ pressed }) => [
                  styles.timezoneAction,
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}
                onPress={() => {
                  setCustomTimeZone(
                    destination.timezone ?? '',
                  );
                  setTimezoneOpen(true);
                }}
              >
                <Text style={styles.timezoneActionText}>
                  {destination.timezone ? 'Change' : 'Set'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          disabled={disabled || isPicking}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.pressed,
            (disabled || isPicking) &&
              styles.disabled,
          ]}
          onPress={() => void chooseDestination()}
        >
          <Ionicons
            name="map-outline"
            size={18}
            color={colors.textInverse}
          />
          <Text style={styles.actionText}>
            {isPicking
              ? 'Opening map…'
              : actionLabel}
          </Text>
        </Pressable>
      </View>

      {destination && !isMapped ? (
        <Text style={styles.help}>
          Add a real location to place this destination on your trip map.
        </Text>
      ) : null}

      <Modal
        visible={timezoneOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTimezoneOpen(false)}
      >
        <Pressable
          style={styles.timezoneOverlay}
          onPress={() => setTimezoneOpen(false)}
        >
          <Pressable
            style={styles.timezoneSheet}
            onPress={() => undefined}
          >
            <Text style={styles.timezoneSheetTitle}>
              City timezone
            </Text>
            <Text style={styles.timezoneSheetBody}>
              Use a real IANA timezone. TravelOS will not guess one from coordinates.
            </Text>
            {COMMON_TIME_ZONES.map((zone) => (
              <Pressable
                key={zone}
                accessibilityRole="button"
                accessibilityLabel={zone}
                style={styles.timezoneOption}
                onPress={() => {
                  onTimeZoneChange?.(zone);
                  setTimezoneOpen(false);
                }}
              >
                <Text style={styles.timezoneOptionText}>
                  {zone}
                </Text>
              </Pressable>
            ))}
            <TextInput
              value={customTimeZone}
              onChangeText={setCustomTimeZone}
              placeholder="Europe/Lisbon"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.timezoneInput}
            />
            <View style={styles.timezoneSheetActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear timezone"
                onPress={() => {
                  onTimeZoneChange?.(null);
                  setTimezoneOpen(false);
                }}
              >
                <Text style={styles.timezoneClearText}>
                  Clear
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save timezone"
                style={styles.timezoneSave}
                onPress={() => {
                  const value = customTimeZone.trim();

                  if (
                    value &&
                    !isValidIanaTimeZone(value)
                  ) {
                    Alert.alert(
                      'Timezone not recognized',
                      'Enter a valid IANA timezone such as Europe/Lisbon.',
                    );
                    return;
                  }

                  onTimeZoneChange?.(value || null);
                  setTimezoneOpen(false);
                }}
              >
                <Text style={styles.timezoneSaveText}>
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing[2],
  },
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },
  card: {
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  cardMapped: {
    borderColor: colors.teal,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },
  iconMapped: {
    backgroundColor: colors.teal,
  },
  copy: {
    flex: 1,
  },
  stateLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.1,
    color: colors.brass,
  },
  name: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },
  country: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  mapStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mapStatusText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  mapStatusTextReady: {
    color: colors.textSecondary,
  },
  action: {
    minHeight: 48,
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.brand,
  },
  addAction: {
    marginTop: 0,
  },
  actionText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  help: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timezoneCopy: {
    flex: 1,
  },
  timezoneLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.1,
    color: colors.brass,
  },
  timezoneValue: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  timezoneSource: {
    marginTop: 2,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  timezoneAction: {
    minHeight: 40,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },
  timezoneActionText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.teal,
  },
  timezoneOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 12, 0.46)',
    justifyContent: 'flex-end',
  },
  timezoneSheet: {
    padding: spacing[5],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing[2],
  },
  timezoneSheetTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  timezoneSheetBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  timezoneOption: {
    minHeight: 44,
    justifyContent: 'center',
  },
  timezoneOptionText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  timezoneInput: {
    minHeight: 48,
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  timezoneSheetActions: {
    marginTop: spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timezoneClearText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textMuted,
  },
  timezoneSave: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  timezoneSaveText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.55,
  },
});
