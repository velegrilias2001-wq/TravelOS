import { useRouteEditorGuard } from '@/features/forms/use-route-editor-guard';
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
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import type {
  TripIntent,
  TripPace,
  TripStatus,
} from '@/domain/entities';
import {
  DestinationPickerField,
} from '@/features/destinations/destination-picker-field';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import type {
  DestinationSelection,
} from '@/services/destination-authoring';
import {
  MAX_TRIP_DESTINATIONS,
  moveDestinationItems,
  validateTripDateRange,
  type TripDestinationEditInput,
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
import { strings } from '@/i18n';

type EditableStatus = Exclude<
  TripStatus,
  'active'
>;

const STATUS_OPTIONS: Array<{
  value: EditableStatus;
  label: string;
}> = [
  {
    value: 'draft',
    label: strings.tripStatusLabel.draft,
  },
  {
    value: 'planned',
    label: strings.tripStatusLabel.planned,
  },
  {
    value: 'completed',
    label: strings.tripStatusLabel.completed,
  },
  {
    value: 'archived',
    label: strings.tripStatusLabel.archived,
  },
];

interface ChoiceOption<Value extends string> {
  value: Value;
  label: string;
  description?: string;
}

const INTENT_OPTIONS: ChoiceOption<TripIntent>[] = [
  { value: 'relax', label: strings.tripIntent.relax },
  { value: 'explore', label: strings.tripIntent.explore },
  { value: 'food', label: strings.tripIntent.food },
  { value: 'nature', label: strings.tripIntent.nature },
  { value: 'event', label: strings.tripIntent.event },
  { value: 'social', label: strings.tripIntent.social },
  { value: 'romantic', label: strings.tripIntent.romantic },
  { value: 'family', label: strings.tripIntent.family },
  {
    value: 'work_leisure',
    label: strings.tripIntent.work_leisure,
  },
  { value: 'other', label: strings.tripIntent.other },
];

const PACE_OPTIONS: ChoiceOption<TripPace>[] = [
  {
    value: 'slow',
    label: strings.tripPace.slowLabel,
    description: strings.tripPace.slowDescription,
  },
  {
    value: 'balanced',
    label: strings.tripPace.balancedLabel,
    description: 'A mix of plans and space.',
  },
  {
    value: 'full',
    label: strings.tripPace.fullLabel,
    description: strings.tripPace.fullDescription,
  },
];

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
    useState<TripDestinationEditInput[]>(
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
  const [intent, setIntent] =
    useState<TripIntent | undefined>(
      trip.intent,
    );
  const [pace, setPace] =
    useState<TripPace | undefined>(
      trip.pace,
    );
  const [isSaving, setIsSaving] =
    useState(false);
  const [isDeleting, setIsDeleting] =
    useState(false);
  const [showSavedNotice, setShowSavedNotice] =
    useState(false);

  const editor = useRouteEditorGuard({ title, destinations, startDate, endDate, accountingCurrency, status, intent, pace }, isSaving || isDeleting);

  const replaceDestination = (
    id: string,
    replacement: DestinationSelection,
  ) => {
    setShowSavedNotice(false);
    setDestinations((current) =>
      current.map((destination) =>
        destination.id === id
          ? {
              ...destination,
              name: replacement.name,
              replacement,
            }
          : destination,
      ),
    );
  };

  const addDestination = (selection: DestinationSelection) => {
    setShowSavedNotice(false);
    setDestinations((current) => {
      if (current.length >= MAX_TRIP_DESTINATIONS) {
        Alert.alert(
          strings.tripDetails.alertDestinationLimit,
          `A trip can have at most ${MAX_TRIP_DESTINATIONS} destinations.`,
        );
        return current;
      }

      return [
        ...current,
        {
          id: Crypto.randomUUID(),
          name: selection.name,
          replacement: selection,
        },
      ];
    });
  };

  const moveDestination = (index: number, delta: number) => {
    setShowSavedNotice(false);
    setDestinations((current) =>
      moveDestinationItems(current, index, delta),
    );
  };

  const removeDestination = (id: string) => {
    const destination = destinations.find((item) => item.id === id);

    if (!destination) {
      return;
    }

    if (destinations.length <= 1) {
      Alert.alert(
        strings.tripDetails.alertKeepOne,
        'A trip needs at least one destination.',
      );
      return;
    }

    Alert.alert(
      `Remove ${destination.name.trim() || 'this destination'}?`,
      strings.tripDetails.alertRemoveDestinationBody,
      [
        {
          text: strings.tripDetails.keep,
          style: 'cancel',
        },
        {
          text: strings.tripDetails.remove,
          style: 'destructive',
          onPress: () => {
            setShowSavedNotice(false);
            setDestinations((current) =>
              current.filter((item) => item.id !== id),
            );
          },
        },
      ],
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
        strings.tripDetails.alertTitleNeeded,
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
        strings.tripDetails.alertDestinationsTitle,
        strings.tripDetails.alertDestinationsBody,
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
        strings.tripDetails.alertDatesTitle,
        error instanceof Error
          ? error.message
          : strings.tripDetails.alertDatesBody,
      );
      return;
    }

    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      Alert.alert(
        strings.tripDetails.alertCurrencyTitle,
        strings.tripDetails.alertCurrencyBody,
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
        intent: intent ?? null,
        pace: pace ?? null,
      });

      setTitle(cleanTitle);
      setAccountingCurrency(cleanCurrency);
      setDestinations((current) =>
        current.map((destination) => ({
          id: destination.id,
          name:
            destination.replacement?.name ??
            destination.name.trim(),
        })),
      );
      setShowSavedNotice(true);
      editor.markSaved({
        title: cleanTitle,
        destinations: destinations.map(destination => ({ id: destination.id, name: destination.replacement?.name ?? destination.name.trim() })),
        startDate, endDate, accountingCurrency: cleanCurrency, status, intent, pace,
      });
    } catch (error) {
      const budgetCurrencyBlocked =
        error instanceof Error &&
        error.message.includes(
          'saved budget',
        );

      console.error(
        '[Trip Details] Save error:',
        error,
      );

      Alert.alert(
        strings.tripDetails.alertSaveFailed,
        budgetCurrencyBlocked
          ? strings.tripDetails.alertBudgetLocked
          : error instanceof Error && error.message
            ? error.message
            : strings.tripDetails.alertSaveFailedBody,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTrip = () => {
      Alert.alert(
        strings.tripDetails.deleteConfirmTitle(trip.title),
        strings.tripDetails.deleteConfirmBody,
      [
        {
          text: strings.tripDetails.cancel,
          style: 'cancel',
        },
        {
          text: strings.tripDetails.deleteConfirm,
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
                  strings.tripDetails.alertDeleteFailed,
                  strings.tripDetails.alertDeleteFailedBody,
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
      <Screen scroll clearTabBar>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.tripDetails.back}
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
            MORE
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <UtilityScreenHeader
          eyebrow={strings.tripDetails.eyebrowOverview}
          title={strings.tripDetails.title}
          subtitle={strings.tripDetails.subtitle}
        />

        {showSavedNotice && (
          <View style={styles.savedNotice}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.success}
            />
            <Text style={styles.savedNoticeText}>
              {strings.tripDetails.savedToast}
            </Text>
          </View>
        )}

        <SectionHeader
          eyebrow={strings.tripDetails.eyebrowJourney}
          title={strings.tripDetails.basics}
        />

        <View style={styles.card}>
          <Field
            label={strings.tripDetails.labelTitle}
            value={title}
            placeholder={strings.tripDetails.titlePlaceholder}
            onChangeText={(value) => {
              setShowSavedNotice(false);
              setTitle(value);
            }}
          />

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>
            {strings.tripDetails.labelStatus}
          </Text>

          {status === 'active' && (
            <View style={styles.activeStatus}>
              <View style={styles.activeDot} />
              <View style={styles.activeStatusCopy}>
                <Text style={styles.activeStatusTitle}>
                  {strings.tripDetails.activeStatus}
                </Text>
                <Text style={styles.activeStatusBody}>
                  {strings.tripDetails.activeNote}
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
                </Pressable>
              );
            })}
          </View>

        </View>

        <SectionHeader
          eyebrow={strings.tripDetails.eyebrowCharacter}
          title={strings.tripDetails.intentAndPace}
        />

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            {strings.tripDetails.intentEyebrow}
          </Text>

          <Text style={styles.choiceHelp}>
            {strings.tripDetails.intentQuestion}
          </Text>

          <View style={styles.intentGrid}>
            {INTENT_OPTIONS.map((option) => {
              const selected =
                intent === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Trip intent: ${option.label}`}
                  disabled={isSaving || isDeleting}
                  style={({ pressed }) => [
                    styles.intentChoice,
                    selected &&
                      styles.intentChoiceSelected,
                    pressed && styles.pressed,
                    (isSaving || isDeleting) &&
                      styles.disabled,
                  ]}
                  onPress={() => {
                    setShowSavedNotice(false);
                    setIntent((current) =>
                      current === option.value
                        ? undefined
                        : option.value,
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.intentChoiceText,
                      selected &&
                        styles.intentChoiceTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>
            {strings.tripDetails.paceEyebrow}
          </Text>

          <Text style={styles.choiceHelp}>
            {strings.tripDetails.paceQuestion}
          </Text>

          <View style={styles.paceOptions}>
            {PACE_OPTIONS.map((option) => {
              const selected =
                pace === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Trip pace: ${option.label}`}
                  disabled={isSaving || isDeleting}
                  style={({ pressed }) => [
                    styles.paceChoice,
                    selected &&
                      styles.paceChoiceSelected,
                    pressed && styles.pressed,
                    (isSaving || isDeleting) &&
                      styles.disabled,
                  ]}
                  onPress={() => {
                    setShowSavedNotice(false);
                    setPace((current) =>
                      current === option.value
                        ? undefined
                        : option.value,
                    );
                  }}
                >
                  <View
                    style={[
                      styles.choiceRadio,
                      selected &&
                        styles.choiceRadioSelected,
                    ]}
                  >
                    {selected ? (
                      <View
                        style={styles.choiceRadioDot}
                      />
                    ) : null}
                  </View>

                  <View style={styles.paceChoiceCopy}>
                    <Text
                      style={[
                        styles.paceChoiceTitle,
                        selected &&
                          styles.paceChoiceTitleSelected,
                      ]}
                    >
                      {option.label}
                    </Text>

                    <Text
                      style={styles.paceChoiceBody}
                    >
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.choiceFootnote}>
            {strings.tripDetails.unsetHint}
          </Text>
        </View>

        <SectionHeader
          eyebrow={strings.tripDetails.eyebrowWhere}
          title={strings.tripDetails.destinations}
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
                {strings.tripDetails.noDestinationYet}
              </Text>
            </View>
          ) : (
            destinations.map(
              (destination, index) => {
                const savedDestination =
                  trip.destinations.find(
                    (item) => item.id === destination.id,
                  );
                const baseDestination =
                  destination.replacement ??
                  savedDestination;
                const displayDestination = baseDestination
                  ? {
                      ...baseDestination,
                      ...(destination.timezone !== undefined
                        ? {
                            timezone:
                              destination.timezone ??
                              undefined,
                            timezoneSource: destination.timezone
                              ? ('traveler' as const)
                              : undefined,
                          }
                        : {}),
                    }
                  : undefined;

                return (
                  <View
                    key={destination.id}
                    style={
                      index > 0
                        ? styles.destinationAfter
                        : undefined
                    }
                  >
                    <DestinationPickerField
                      label={
                        destinations.length === 1
                          ? 'DESTINATION'
                          : `DESTINATION ${index + 1}`
                      }
                      destination={displayDestination}
                      disabled={isSaving}
                      onSelect={(selection) =>
                        replaceDestination(
                          destination.id,
                          selection,
                        )
                      }
                      onTimeZoneChange={(timezone) => {
                        setShowSavedNotice(false);
                        setDestinations((current) =>
                          current.map((item) =>
                            item.id === destination.id
                              ? {
                                  ...item,
                                  timezone,
                                }
                              : item,
                          ),
                        );
                      }}
                    />

                    {destinations.length > 1 ? (
                      <View style={styles.destinationActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={strings.a11y.moveEarlier(destination.name)}
                          disabled={isSaving || index === 0}
                          hitSlop={5}
                          style={({ pressed }) => [
                            styles.destinationAction,
                            (isSaving || index === 0) &&
                              styles.destinationActionDisabled,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => moveDestination(index, -1)}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={18}
                            color={colors.textSecondary}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={strings.a11y.moveLater(destination.name)}
                          disabled={
                            isSaving ||
                            index === destinations.length - 1
                          }
                          hitSlop={5}
                          style={({ pressed }) => [
                            styles.destinationAction,
                            (isSaving ||
                              index === destinations.length - 1) &&
                              styles.destinationActionDisabled,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => moveDestination(index, 1)}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={18}
                            color={colors.textSecondary}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={strings.a11y.remove(destination.name)}
                          disabled={isSaving}
                          hitSlop={5}
                          style={({ pressed }) => [
                            styles.destinationAction,
                            pressed && styles.pressed,
                          ]}
                          onPress={() =>
                            removeDestination(destination.id)
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={colors.coral}
                          />
                        </Pressable>
                      </View>
                    ) : null}

                    {destination.replacement && (
                      <Text style={styles.pendingDestinationText}>
                        {strings.tripDetails.destinationWillUpdate}
                      </Text>
                    )}
                  </View>
                );
              },
            )
          )}

          {destinations.length < MAX_TRIP_DESTINATIONS ? (
            <View
              style={
                destinations.length > 0
                  ? styles.destinationAddAfter
                  : undefined
              }
            >
              <DestinationPickerField
                variant="add"
                disabled={isSaving}
                onSelect={addDestination}
              />
            </View>
          ) : null}

          {destinations.length > 1 ? (
            <Text style={styles.destinationFootnote}>
              {strings.tripDetails.timezoneFootnote}
            </Text>
          ) : null}
        </View>

        <SectionHeader
          eyebrow={strings.tripDetails.eyebrowWhen}
          title={strings.tripDetails.travelDates}
        />

        <View style={styles.card}>
          <CalendarDateField
            compact
            label={strings.tripDetails.labelStartDate}
            value={startDate}
            fallbackDate={endDate}
            onChange={(value) => {
              setShowSavedNotice(false);
              setStartDate(value);
            }}
          />

          <View style={styles.dateDivider} />

          <CalendarDateField
            compact
            label={strings.tripDetails.labelEndDate}
            value={endDate}
            fallbackDate={startDate}
            onChange={(value) => {
              setShowSavedNotice(false);
              setEndDate(value);
            }}
          />

          <Text style={styles.fieldHelp}>
            Days that already contain moments are kept when dates change.
          </Text>
        </View>

        <SectionHeader
          eyebrow={strings.tripDetails.eyebrowMoney}
          title={strings.tripDetails.budgetCurrency}
        />

        <View style={styles.card}>
          <Field
            label={strings.tripDetails.labelBudgetCurrency}
            value={accountingCurrency}
            placeholder={strings.newTrip.currencyPlaceholder}
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
                ? 'A saved budget is using this currency, so it can’t be changed.'
                : strings.tripDetails.currencyNote}
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
              ? strings.tripDetails.saving
              : strings.tripDetails.save}
          </Text>
          {!isSaving && (
            <Ionicons
              name="checkmark"
              size={21}
              color={colors.textInverse}
            />
          )}
        </Pressable>

        <View style={styles.dangerSection}>
          <Text style={styles.sectionEyebrow}>
            {strings.tripDetails.dangerZone}
          </Text>
          <View style={styles.dangerRow}>
            <View style={styles.dangerIcon}>
              <Ionicons
                name="trash-outline"
                size={20}
                color={colors.danger}
              />
            </View>
            <View style={styles.dangerCopy}>
              <Text style={styles.dangerTitle}>
                {strings.tripDetails.deleteTitle}
              </Text>
              <Text style={styles.dangerBody}>
                {strings.tripDetails.deleteBody}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.tripDetails.deleteTitle}
              disabled={isSaving || isDeleting}
              style={[
                styles.deleteButton,
                (isSaving || isDeleting) &&
                  styles.disabled,
              ]}
              onPress={deleteTrip}
            >
              <Text style={styles.deleteButtonText}>
                {isDeleting ? '…' : strings.tripDetails.delete}
              </Text>
            </Pressable>
          </View>
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
    marginTop: spacing[7],
    marginBottom: spacing[3],
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
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    gap: spacing[2],
    marginTop: spacing[3],
  },
  statusChoice: {
    width: '48%',
    minHeight: 48,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
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
  choiceHelp: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  intentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  intentChoice: {
    minHeight: 42,
    paddingHorizontal: spacing[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentChoiceSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  intentChoiceText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  intentChoiceTextSelected: {
    color: colors.brand,
  },
  paceOptions: {
    gap: spacing[2],
    marginTop: spacing[3],
  },
  paceChoice: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  paceChoiceSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  choiceRadio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceRadioSelected: {
    borderColor: colors.brand,
  },
  choiceRadioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  paceChoiceCopy: {
    flex: 1,
  },
  paceChoiceTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  paceChoiceTitleSelected: {
    color: colors.brand,
  },
  paceChoiceBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  choiceFootnote: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.84,
  },
  destinationAfter: {
    marginTop: spacing[5],
    paddingTop: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  destinationAddAfter: {
    marginTop: spacing[5],
    paddingTop: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  destinationActions: {
    marginTop: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  destinationAction: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  destinationActionDisabled: {
    opacity: 0.4,
  },
  destinationFootnote: {
    marginTop: spacing[4],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  pendingDestinationText: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    color: colors.teal,
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
    gap: spacing[2],
    marginTop: spacing[3],
  },
  currencyPolicyLocked: {
    padding: spacing[3],
    borderRadius: radius.md,
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
  },
  saveButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },
  dangerSection: {
    marginTop: spacing[8],
  },
  dangerRow: {
    marginTop: spacing[3],
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.coral,
    backgroundColor: colors.surface,
  },
  dangerIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralSoft,
  },
  dangerCopy: {
    flex: 1,
  },
  dangerTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.danger,
  },
  dangerBody: {
    marginTop: 2,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  deleteButton: {
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  bottomSpace: {
    height: spacing[16],
  },
});
