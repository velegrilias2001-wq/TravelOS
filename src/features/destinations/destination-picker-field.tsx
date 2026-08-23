import { Ionicons } from '@expo/vector-icons';
import {
  pickLocation,
} from 'expo-location-picker';
import {
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
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
  | 'currencyCode'
>;

interface DestinationPickerFieldProps {
  label?: string;
  destination?: DestinationDisplayValue | null;
  onSelect(selection: DestinationSelection): void;
  disabled?: boolean;
}

export function DestinationPickerField({
  label = 'DESTINATION',
  destination,
  onSelect,
  disabled = false,
}: DestinationPickerFieldProps) {
  const [isPicking, setIsPicking] = useState(false);
  const isMapped = Boolean(
    destination &&
      hasRealDestinationCoordinates(destination),
  );
  const actionLabel = destination
    ? isMapped
      ? 'Replace destination'
      : 'Add destination details'
    : 'Choose destination';

  const chooseDestination = async () => {
    try {
      setIsPicking(true);

      const result = await pickLocation({
        title: 'Choose destination',
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

      onSelect(
        mapDestinationProviderResult({
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
        }),
      );
    } catch {
      Alert.alert(
        'Could not choose destination',
        'TravelOS could not open or read the map selection. Your saved destination has not changed.',
      );
    } finally {
      setIsPicking(false);
    }
  };

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
              {isMapped
                ? 'MAP LOCATION SELECTED'
                : destination
                  ? 'DESTINATION LABEL ONLY'
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
          <View style={styles.facts}>
            <Fact
              icon={
                isMapped
                  ? 'map-outline'
                  : 'document-text-outline'
              }
              text={
                isMapped
                  ? 'Map location saved'
                  : 'Map details not added yet'
              }
              ready={isMapped}
            />
            <Fact
              icon="time-outline"
              text={
                destination.timezone
                  ? 'Live trip timing available'
                  : 'Live trip timing not available yet'
              }
              ready={Boolean(destination.timezone)}
            />
            {destination.currencyCode && (
              <Fact
                icon="cash-outline"
                text={`${destination.currencyCode} local currency`}
                ready
              />
            )}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          disabled={disabled || isPicking}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.pressed,
            (disabled || isPicking) && styles.disabled,
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

      <Text style={styles.help}>
        TravelOS saves only details returned by your map selection. Local time and currency stay unknown unless a trusted source provides them.
      </Text>
    </View>
  );
}

function Fact({
  icon,
  text,
  ready,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  ready: boolean;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons
        name={icon}
        size={16}
        color={ready ? colors.teal : colors.textMuted}
      />
      <Text
        style={[
          styles.factText,
          ready && styles.factTextReady,
        ]}
      >
        {text}
      </Text>
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
  facts: {
    gap: spacing[2],
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  factText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  factTextReady: {
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
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.55,
  },
});
