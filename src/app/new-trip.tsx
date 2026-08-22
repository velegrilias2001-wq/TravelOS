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

import { Screen } from '@/components/ui/screen';
import type { Trip } from '@/domain/entities';
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
    useState('');

  const [startDate, setStartDate] =
    useState('');

  const [endDate, setEndDate] =
    useState('');

  const [currency, setCurrency] =
    useState('EUR');

  const [isSaving, setIsSaving] =
    useState(false);

  const createTrip = async () => {
    const cleanTitle = title.trim();
    const cleanDestination =
      destination.trim();

    if (
      !cleanTitle ||
      !cleanDestination ||
      !startDate.trim() ||
      !endDate.trim()
    ) {
      Alert.alert(
        'Missing information',
        'Add a trip name, destination and travel dates.',
      );

      return;
    }

    if (endDate < startDate) {
      Alert.alert(
        'Check your dates',
        'The end date cannot be before the start date.',
      );

      return;
    }

    const tripId = Crypto.randomUUID();
    const now = new Date().toISOString();

    const trip: Trip = {
      id: tripId,

      title: cleanTitle,
      status: 'planned',

      destinations: [
        {
          id: Crypto.randomUUID(),
          name: cleanDestination,
        },
      ],

      startDate: startDate.trim(),
      endDate: endDate.trim(),

      travelerIds: [],

      accountingCurrency:
        currency.trim().toUpperCase() || 'EUR',

      createdAt: now,
      updatedAt: now,
    };

    try {
      setIsSaving(true);

      await saveTrip(trip);

      router.replace({
        pathname: '/trip/[tripId]',
        params: {
          tripId,
        },
      });
    } catch {
      Alert.alert(
        'Could not create trip',
        'Travel OS could not save this trip. Please try again.',
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
            New trip
          </Text>

          <View style={styles.topSpacer} />
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>
            START A JOURNEY
          </Text>

          <Text style={styles.title}>
            Where will life
            {'\n'}
            take you next?
          </Text>

          <Text style={styles.subtitle}>
            Give us the essentials. You can shape
            every detail of the journey afterwards.
          </Text>
        </View>

        <View style={styles.form}>
          <Field
            label="TRIP NAME"
            placeholder="Summer in Japan"
            value={title}
            onChangeText={setTitle}
          />

          <Field
            label="DESTINATION"
            placeholder="Tokyo, Japan"
            value={destination}
            onChangeText={setDestination}
          />

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Field
                label="START DATE"
                placeholder="2026-09-01"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>

            <View style={styles.dateField}>
              <Field
                label="END DATE"
                placeholder="2026-09-10"
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          <Field
            label="ACCOUNTING CURRENCY"
            placeholder="EUR"
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.currencyNote}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={colors.teal}
          />

          <Text style={styles.currencyNoteText}>
            Your budget currency stays separate
            from the local currency of each
            destination.
          </Text>
        </View>

        <Pressable
          disabled={isSaving}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.pressed,
            isSaving && styles.disabled,
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
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = 'sentences',
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
        placeholderTextColor={
          colors.textMuted
        }
        autoCapitalize={autoCapitalize}
        style={styles.input}
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
    marginTop: spacing[10],
    marginBottom: spacing[8],
  },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
    marginBottom: spacing[3],
  },

  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleLarge,
    lineHeight: lineHeight.titleLarge,
    color: colors.textPrimary,
  },

  subtitle: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing[4],
  },

  form: {
    gap: spacing[5],
  },

  field: {
    gap: spacing[2],
  },

  fieldLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },

  input: {
    height: 56,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],

    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.body,
    color: colors.textPrimary,

    ...shadows.subtle,
  },

  dateRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  dateField: {
    flex: 1,
  },

  currencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.tealSoft,
    padding: spacing[4],
    borderRadius: radius.md,
    marginTop: spacing[6],
  },

  currencyNoteText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  createButton: {
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginTop: spacing[8],
    ...shadows.card,
  },

  createButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },

  pressed: {
    opacity: 0.84,
  },

  disabled: {
    opacity: 0.6,
  },

  bottomSpace: {
    height: spacing[12],
  },
});