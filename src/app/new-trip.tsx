import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CalendarDateField } from '@/components/ui/native-date-time-fields';
import { Screen } from '@/components/ui/screen';
import {
  DestinationPickerField,
} from '@/features/destinations/destination-picker-field';
import type {
  DestinationSelection,
} from '@/services/destination-authoring';
import { buildNewTrip } from '@/services/trip-creation';
import { useTripStore } from '@/store/trip-store';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

export default function NewTripScreen() {
  const router = useRouter();

  const saveTrip = useTripStore(
    (state) => state.saveTrip,
  );

  const [title, setTitle] = useState('');
  const [destination, setDestination] =
    useState<DestinationSelection | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [isSaving, setIsSaving] = useState(false);

  const isReady = Boolean(
    destination &&
      startDate &&
      endDate &&
      currency.length === 3,
  );

  const tripNamePlaceholder = destination?.name
    ? `${destination.name} trip`
    : 'Give this trip a name';

  const updateCurrency = (value: string) => {
    setCurrency(
      value
        .replace(/[^a-z]/gi, '')
        .toUpperCase()
        .slice(0, 3),
    );
  };

  const createTrip = async () => {
    if (!destination) {
      Alert.alert(
        'Choose a destination',
        'Choose a city, region or country before creating this trip.',
      );
      return;
    }

    const resolvedTitle =
      title.trim() ||
      destination.name?.trim() ||
      'New trip';

    const now = new Date().toISOString();
    let trip;

    try {
      trip = buildNewTrip(
        {
          title: resolvedTitle,
          destination,
          startDate,
          endDate,
          accountingCurrency: currency,
        },
        {
          tripId: () => Crypto.randomUUID(),
          destinationId: () => Crypto.randomUUID(),
        },
        now,
      );
    } catch (error) {
      Alert.alert(
        'Check trip details',
        error instanceof Error
          ? error.message
          : 'Check the destination, travel dates and trip currency.',
      );
      return;
    }

    try {
      setIsSaving(true);

      await saveTrip(trip);

      router.replace({
        pathname: '/trip/[tripId]',
        params: {
          tripId: trip.id,
        },
      });
    } catch {
      Alert.alert(
        'Could not create trip',
        'TravelOS could not save this trip. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <Screen scroll>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.brand}
            />
          </Pressable>

          <Text style={styles.topBarTitle}>
            Create trip
          </Text>

          <View style={styles.topSpacer} />
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>
            NEW JOURNEY
          </Text>

          <Text style={styles.title}>
            Start with somewhere.
          </Text>

          <Text style={styles.subtitle}>
            Pick a place and your dates. You can shape the rest once the trip is yours.
          </Text>
        </View>

        <View style={styles.form}>
          <DestinationPickerField
            destination={destination}
            disabled={isSaving}
            onSelect={setDestination}
          />

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionEyebrow}>
                WHEN
              </Text>
              <Text style={styles.sectionTitle}>
                Travel dates
              </Text>
            </View>

            <View style={styles.dateFields}>
              <CalendarDateField
                label="START DATE"
                value={startDate}
                fallbackDate={endDate}
                disabled={isSaving}
                onChange={setStartDate}
              />

              <CalendarDateField
                label="END DATE"
                value={endDate}
                fallbackDate={startDate}
                disabled={isSaving}
                onChange={setEndDate}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionEyebrow}>
                MAKE IT YOURS
              </Text>
              <Text style={styles.sectionTitle}>
                Trip details
              </Text>
            </View>

            <Field
              label="TRIP NAME · OPTIONAL"
              placeholder={tripNamePlaceholder}
              value={title}
              disabled={isSaving}
              onChangeText={setTitle}
            />

            <View style={styles.currencyField}>
              <Field
                label="TRIP CURRENCY"
                placeholder="EUR"
                value={currency}
                disabled={isSaving}
                maxLength={3}
                onChangeText={updateCurrency}
                autoCapitalize="characters"
              />

              <Text style={styles.helperText}>
                Used for your budget and trip totals. Expenses can still use the currency you paid.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create trip"
          disabled={isSaving || !isReady}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.pressed,
            (isSaving || !isReady) &&
              styles.disabled,
          ]}
          onPress={createTrip}
        >
          <Text style={styles.createButtonText}>
            {isSaving
              ? 'Creating trip…'
              : 'Create trip'}
          </Text>

          {!isSaving && (
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.textInverse}
            />
          )}
        </Pressable>

        {!isReady && !isSaving ? (
          <Text style={styles.ctaHint}>
            Choose a destination and travel dates to continue.
          </Text>
        ) : null}

        <View style={styles.bottomSpace} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText(value: string): void;
  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';
  disabled?: boolean;
  maxLength?: number;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = 'sentences',
  disabled = false,
  maxLength,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={!disabled}
        maxLength={maxLength}
        style={[
          styles.input,
          disabled && styles.inputDisabled,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },

  topBarTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },

  topSpacer: {
    width: 42,
  },

  intro: {
    marginTop: spacing[8],
    marginBottom: spacing[7],
  },

  eyebrow: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
  },

  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleLarge,
    lineHeight: lineHeight.titleLarge,
    color: colors.textPrimary,
  },

  subtitle: {
    maxWidth: 430,
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  form: {
    gap: spacing[6],
  },

  section: {
    gap: spacing[4],
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  sectionHeading: {
    gap: spacing[1],
  },

  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },

  sectionTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  field: {
    gap: spacing[2],
  },

  fieldLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.3,
    color: colors.brass,
  },

  input: {
    minHeight: 54,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },

  inputDisabled: {
    opacity: 0.55,
  },

  dateFields: {
    gap: spacing[4],
  },

  currencyField: {
    gap: spacing[2],
  },

  helperText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },

  createButton: {
    minHeight: 56,
    marginTop: spacing[7],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    ...shadows.card,
  },

  createButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },

  ctaHint: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    textAlign: 'center',
    color: colors.textMuted,
  },

  pressed: {
    opacity: 0.84,
  },

  disabled: {
    opacity: 0.45,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
