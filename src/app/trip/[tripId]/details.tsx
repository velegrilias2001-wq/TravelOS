import { Ionicons } from '@expo/vector-icons';
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
import { CalendarDateField } from '@/components/ui/native-date-time-fields';
import type {
  TripDestination,
  TripStatus,
} from '@/domain/entities';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  hasStructuredDestinationMetadata,
  validateTripDateRange,
  type TripDestinationNameInput,
} from '@/services/trip-details';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

type EditableStatus = Exclude<
  TripStatus,
  'active'
>;

const STATUS_OPTIONS: Array<{
  value: EditableStatus;
  label: string;
  description: string;
}> = [
  {
    value: 'draft',
    label: 'Draft',
    description: 'Still taking shape',
  },
  {
    value: 'planned',
    label: 'Planned',
    description: 'Ready for the journey',
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'The journey has ended',
  },
  {
    value: 'archived',
    label: 'Archived',
    description: 'Kept out of the way',
  },
];

function destinationMetadata(
  destination: TripDestination,
): string | null {
  const facts = [
    destination.countryCode,
    destination.timezone,
    destination.currencyCode
      ? `${destination.currencyCode} local currency`
      : undefined,
    destination.latitude !== undefined &&
    destination.longitude !== undefined
      ? 'Mapped coordinates preserved'
      : undefined,
  ].filter(
    (value): value is string =>
      Boolean(value),
  );

  return facts.length > 0
    ? facts.join(' · ')
    : null;
}

export default function TripDetailsScreen() {
  const router = useRouter();
  const { workspace, actions } =
    useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const trip = workspace.trip;
  const hasPersistedBudget =
    workspace.budget !== null;

  const [title, setTitle] = useState(
    trip.title,
  );
  const [destinations, setDestinations] =
    useState<TripDestinationNameInput[]>(
      trip.destinations.map(
        (destination) => ({
          id: destination.id,
          name: destination.name,
        }),
      ),
    );
  const [startDate, setStartDate] = useState(
    trip.startDate,
  );
  const [endDate, setEndDate] = useState(
    trip.endDate,
  );
  const [accountingCurrency, setAccountingCurrency] =
    useState(trip.accountingCurrency);
  const [status, setStatus] =
    useState<TripStatus>(trip.status);
  const [isSaving, setIsSaving] =
    useState(false);
  const [isDeleting, setIsDeleting] =
    useState(false);
  const [showSavedNotice, setShowSavedNotice] =
    useState(false);

  const updateDestination = (
    id: string,
    name: string,
  ) => {
    setShowSavedNotice(false);
    setDestinations((current) =>
      current.map((destination) =>
        destination.id === id
          ? { ...destination, name }
          : destination,
      ),
    );
  };

  const save = async () => {
    const cleanTitle = title.trim();
    const cleanCurrency =
      accountingCurrency
        .trim()
        .toUpperCase();

    if (!cleanTitle) {
      Alert.alert(
        'Add a trip title',
        'A clear trip title keeps every part of this journey connected.',
      );
      return;
    }

    if (
      destinations.some(
        (destination) =>
          !destination.name.trim(),
      )
    ) {
      Alert.alert(
        'Check destinations',
        'Every existing destination needs a name.',
      );
      return;
    }

    try {
      validateTripDateRange(
        startDate,
        endDate,
      );
    } catch (error) {
      Alert.alert(
        'Check your dates',
        error instanceof Error
          ? error.message
          : 'Choose a valid date range.',
      );
      return;
    }

    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      Alert.alert(
        'Check the currency',
        'Use a three-letter accounting currency code such as EUR or USD.',
      );
      return;
    }

    try {
      setIsSaving(true);
      setShowSavedNotice(false);

      await actions.updateTrip({
        title: cleanTitle,
        destinations,
        startDate,
        endDate,
        accountingCurrency: cleanCurrency,
        status,
      });

      setTitle(cleanTitle);
      setAccountingCurrency(cleanCurrency);
      setDestinations((current) =>
        current.map((destination) => ({
          ...destination,
          name: destination.name.trim(),
        })),
      );
      setShowSavedNotice(true);
    } catch (error) {
      const budgetCurrencyBlocked =
        error instanceof Error &&
        error.message.includes(
          'saved budget',
        );

      Alert.alert(
        'Could not save trip details',
        budgetCurrencyBlocked
          ? 'This trip already has a saved budget. Its accounting currency cannot be relabeled or converted here.'
          : 'Your saved trip remains available. Review the details and try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTrip = () => {
    Alert.alert(
      `Delete “${trip.title}”?`,
      'This permanently removes this trip and its related local itinerary, stops, bookings, accommodations, budget, expenses, runtime data, memories and Travel Book content from this device. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete trip',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setIsDeleting(true);
                await actions.deleteTrip();
                router.replace('/trips');
              } catch (error) {
                console.error(
                  '[TripDetails] Delete failed:',
                  error,
                );
                setIsDeleting(false);
                Alert.alert(
                  'Could not delete trip',
                  'No deletion was confirmed. Your local trip remains available.',
                );
              }
            })();
          },
        },
      ],
    );
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
            accessibilityLabel="Back to More"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.brand}
            />
          </Pressable>

          <Text style={styles.topBarLabel}>
            TRIP DETAILS
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            CANONICAL TRIP
          </Text>
          <Text style={styles.title}>
            Shape the journey,
            {'\n'}
            keep its truth intact.
          </Text>
          <Text style={styles.subtitle}>
            Changes here flow through Today, Plan, Map, Bookings, Budget and More from the same saved trip.
          </Text>
        </View>

        {showSavedNotice && (
          <View style={styles.savedNotice}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.success}
            />
            <Text style={styles.savedNoticeText}>
              Trip details saved to this device.
            </Text>
          </View>
        )}

        <SectionHeader
          eyebrow="THE JOURNEY"
          title="Identity"
        />

        <View style={styles.card}>
          <Field
            label="TRIP TITLE"
            value={title}
            placeholder="Summer in Japan"
            onChangeText={(value) => {
              setShowSavedNotice(false);
              setTitle(value);
            }}
          />

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>
            STATUS
          </Text>

          {status === 'active' && (
            <View style={styles.activeStatus}>
              <View style={styles.activeDot} />
              <View style={styles.activeStatusCopy}>
                <Text style={styles.activeStatusTitle}>
                  Active
                </Text>
                <Text style={styles.activeStatusBody}>
                  Existing active status is preserved, but it cannot be assigned manually here.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((option) => {
              const selected =
                status === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.statusChoice,
                    selected &&
                      styles.statusChoiceSelected,
                  ]}
                  onPress={() => {
                    setShowSavedNotice(false);
                    setStatus(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.statusChoiceTitle,
                      selected &&
                        styles.statusChoiceTitleSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.statusChoiceBody,
                      selected &&
                        styles.statusChoiceBodySelected,
                    ]}
                  >
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldHelp}>
            Status is an organizational choice. Today derives live upcoming, active and completed truth from the saved travel dates and an explicit timezone resolution; this field cannot override it.
          </Text>
        </View>

        <SectionHeader
          eyebrow="WHERE"
          title="Destinations"
        />

        <View style={styles.card}>
          {destinations.length === 0 ? (
            <View style={styles.inlineNotice}>
              <Ionicons
                name="location-outline"
                size={21}
                color={colors.warning}
              />
              <Text style={styles.inlineNoticeText}>
                This trip has no canonical destination record. Other details can still be edited; destination creation needs the dedicated multi-destination workflow.
              </Text>
            </View>
          ) : (
            destinations.map(
              (destination, index) => {
                const canonicalDestination =
                  trip.destinations[index];
                const metadata =
                  destinationMetadata(
                    canonicalDestination,
                  );
                const nameIsLocked =
                  hasStructuredDestinationMetadata(
                    canonicalDestination,
                  );

                return (
                  <View
                    key={destination.id}
                    style={
                      index > 0
                        ? styles.destinationAfter
                        : undefined
                    }
                  >
                    <Field
                      label={
                        destinations.length === 1
                          ? 'DESTINATION'
                          : `DESTINATION ${index + 1}`
                      }
                      value={destination.name}
                      placeholder="Tokyo, Japan"
                      editable={!nameIsLocked}
                      onChangeText={(value) =>
                        updateDestination(
                          destination.id,
                          value,
                        )
                      }
                    />

                    {metadata && (
                      <Text style={styles.metadataText}>
                        {metadata}
                      </Text>
                    )}

                    {nameIsLocked && (
                      <Text style={styles.lockedDestinationText}>
                        Name editing is locked because this record already carries structured place facts. A future location-aware replacement flow must update them together.
                      </Text>
                    )}
                  </View>
                );
              },
            )
          )}

          <View style={styles.truthNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={colors.teal}
            />
            <Text style={styles.truthNoteText}>
              Name-only destination records can be refined here. Destination IDs and order are preserved; adding, removing, reordering or replacing structured destinations is not available yet.
            </Text>
          </View>
        </View>

        <SectionHeader
          eyebrow="WHEN"
          title="Travel dates"
        />

        <View style={styles.card}>
          <CalendarDateField
            label="START DATE"
            value={startDate}
            fallbackDate={endDate}
            onChange={(value) => {
              setShowSavedNotice(false);
              setStartDate(value);
            }}
          />

          <View style={styles.dateDivider} />

          <CalendarDateField
            label="END DATE"
            value={endDate}
            fallbackDate={startDate}
            onChange={(value) => {
              setShowSavedNotice(false);
              setEndDate(value);
            }}
          />

          <Text style={styles.fieldHelp}>
            Dates remain saved as YYYY-MM-DD calendar values. Existing itinerary days outside a changed range are preserved rather than silently deleted.
          </Text>
        </View>

        <SectionHeader
          eyebrow="TRIP MONEY"
          title="Accounting"
        />

        <View style={styles.card}>
          <Field
            label="ACCOUNTING CURRENCY"
            value={accountingCurrency}
            placeholder="EUR"
            editable={!hasPersistedBudget}
            autoCapitalize="characters"
            maxLength={3}
            onChangeText={(value) => {
              setShowSavedNotice(false);
              setAccountingCurrency(value);
            }}
          />

          <View
            style={[
              styles.currencyPolicy,
              hasPersistedBudget &&
                styles.currencyPolicyLocked,
            ]}
          >
            <Ionicons
              name={
                hasPersistedBudget
                  ? 'lock-closed-outline'
                  : 'information-circle-outline'
              }
              size={20}
              color={
                hasPersistedBudget
                  ? colors.warning
                  : colors.teal
              }
            />
            <Text style={styles.currencyPolicyText}>
              {hasPersistedBudget
                ? 'Locked because this trip has persisted Budget data. TravelOS will not relabel or reinterpret those amounts.'
                : 'This is the trip accounting currency, not a destination’s local currency. Any budget created for this trip will use this value.'}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSaving || isDeleting}
          style={[
            styles.saveButton,
            (isSaving || isDeleting) &&
              styles.disabled,
          ]}
          onPress={() => void save()}
        >
          <Text style={styles.saveButtonText}>
            {isSaving
              ? 'Saving trip…'
              : 'Save trip details'}
          </Text>
          {!isSaving && (
            <Ionicons
              name="checkmark"
              size={21}
              color={colors.textInverse}
            />
          )}
        </Pressable>

        <SectionHeader
          eyebrow="LOCAL DATA"
          title="Danger zone"
        />

        <View style={styles.dangerCard}>
          <View style={styles.dangerIcon}>
            <Ionicons
              name="trash-outline"
              size={22}
              color={colors.danger}
            />
          </View>
          <Text style={styles.dangerTitle}>
            Delete this trip
          </Text>
          <Text style={styles.dangerBody}>
            Permanently remove the canonical trip and its related local data from this device.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving || isDeleting}
            style={[
              styles.deleteButton,
              (isSaving || isDeleting) &&
                styles.disabled,
            ]}
            onPress={deleteTrip}
          >
            <Text style={styles.deleteButtonText}>
              {isDeleting
                ? 'Deleting trip…'
                : 'Delete trip'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpace} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>
        {eyebrow}
      </Text>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText(value: string): void;
  editable?: boolean;
  maxLength?: number;
  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  editable = true,
  maxLength,
  autoCapitalize = 'sentences',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        editable={editable}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          !editable && styles.inputLocked,
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
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  topBarLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.textMuted,
  },
  topBarSpacer: {
    width: 46,
  },
  hero: {
    paddingTop: spacing[10],
    paddingBottom: spacing[4],
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
    maxWidth: 350,
    marginTop: spacing[4],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  savedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[5],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
  },
  savedNoticeText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  sectionHeader: {
    marginTop: spacing[10],
    marginBottom: spacing[4],
  },
  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.6,
    color: colors.brass,
  },
  sectionTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },
  card: {
    padding: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
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
    minHeight: 56,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  inputLocked: {
    color: colors.textMuted,
    backgroundColor: colors.backgroundSoft,
  },
  divider: {
    height: 1,
    marginVertical: spacing[6],
    backgroundColor: colors.border,
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[3],
    marginBottom: spacing[4],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  activeDot: {
    width: 9,
    height: 9,
    marginTop: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  activeStatusCopy: {
    flex: 1,
  },
  activeStatusTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  activeStatusBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  statusChoice: {
    width: '47%',
    minHeight: 82,
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    justifyContent: 'center',
  },
  statusChoiceSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  statusChoiceTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  statusChoiceTitleSelected: {
    color: colors.textInverse,
  },
  statusChoiceBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    color: colors.textMuted,
  },
  statusChoiceBodySelected: {
    color: 'rgba(255,255,255,0.72)',
  },
  destinationAfter: {
    marginTop: spacing[5],
    paddingTop: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metadataText: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    color: colors.textMuted,
  },
  lockedDestinationText: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    color: colors.warning,
  },
  inlineNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  inlineNoticeText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  truthNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[5],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  truthNoteText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  dateDivider: {
    height: spacing[5],
  },
  fieldHelp: {
    marginTop: spacing[5],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  currencyPolicy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
  },
  currencyPolicyLocked: {
    backgroundColor: colors.brassSoft,
  },
  currencyPolicyText: {
    flex: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  saveButton: {
    minHeight: 58,
    marginTop: spacing[8],
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  saveButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },
  dangerCard: {
    padding: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.coral,
    backgroundColor: colors.surface,
  },
  dangerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralSoft,
  },
  dangerTitle: {
    marginTop: spacing[4],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.danger,
  },
  dangerBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  deleteButton: {
    minHeight: 50,
    marginTop: spacing[5],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  bottomSpace: {
    height: spacing[16],
  },
});
