import { useRouteEditorGuard } from '@/features/forms/use-route-editor-guard';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { useState } from 'react';

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  CalendarDateField,
} from '@/components/ui/native-date-time-fields';

import {
  Screen,
} from '@/components/ui/screen';

import type {
  TripIntent,
  TripPace,
  TripPartyType,
} from '@/domain/entities';

import {
  DestinationPickerField,
} from '@/features/destinations/destination-picker-field';
import { PressableScale } from '@/features/motion/pressable-scale';
import { RiseIn } from '@/features/motion/rise-in';
import { motion } from '@/features/motion/timing';

import {
  assignTravelerTimeZoneToSelection,
  preserveSelectionEnrichment,
  type DestinationSelection,
} from '@/services/destination-authoring';

import {
  parseDiscoverTripRouteParams,
} from '@/services/discover-trip-handoff';

import {
  buildNewTrip,
} from '@/services/trip-creation';

import {
  budgetService,
} from '@/services/budget-service';

import {
  MAX_TRIP_DESTINATIONS,
  moveDestinationItems,
} from '@/services/trip-details';
import {
  formatCalendarDateForDisplay,
} from '@/services/time-truth';

import {
  useTripStore,
} from '@/store/trip-store';

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

interface ChoiceOption<
  Value extends string,
> {
  value: Value;
  label: string;
  description?: string;
}

const INTENT_OPTIONS:
  ChoiceOption<TripIntent>[] = [
    {
      value: 'relax',
      label: strings.tripIntent.relax,
    },
    {
      value: 'explore',
      label: strings.tripIntent.explore,
    },
    {
      value: 'food',
      label: strings.tripIntent.food,
    },
    {
      value: 'nature',
      label: strings.tripIntent.nature,
    },
    {
      value: 'event',
      label: strings.tripIntent.event,
    },
    {
      value: 'social',
      label: strings.tripIntent.social,
    },
    {
      value: 'romantic',
      label: strings.tripIntent.romantic,
    },
    {
      value: 'family',
      label: strings.tripIntent.family,
    },
    {
      value: 'work_leisure',
      label: strings.tripIntent.work_leisure,
    },
    {
      value: 'other',
      label: strings.tripIntent.other,
    },
  ];

const PACE_OPTIONS:
  ChoiceOption<TripPace>[] = [
    {
      value: 'slow',
      label: strings.tripPace.slowLabel,
      description:
        strings.tripPace.slowDescription,
    },
    {
      value: 'balanced',
      label: strings.tripPace.balancedLabel,
      description:
        strings.tripPace.balancedDescription,
    },
    {
      value: 'full',
      label: strings.tripPace.fullLabel,
      description:
        strings.tripPace.fullDescription,
    },
  ];

const PARTY_OPTIONS:
  ChoiceOption<TripPartyType>[] = [
    { value: 'solo', label: strings.tripParty.solo },
    { value: 'couple', label: strings.tripParty.couple },
    { value: 'friends', label: strings.tripParty.friends },
    { value: 'family', label: strings.tripParty.family },
  ];

type CreateTripStep =
  | 'where'
  | 'when'
  | 'finish';

const CREATE_TRIP_STEPS: CreateTripStep[] = [
  'where',
  'when',
  'finish',
];

/** Compact range format for the review card; never a raw ISO key. */
const REVIEW_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

const STEP_COPY: Record<
  CreateTripStep,
  { eyebrow: string; title: string; subtitle: string }
> = {
  where: {
    eyebrow: strings.newTrip.stepWhereEyebrow,
    title: strings.newTrip.stepWhereTitle,
    subtitle: strings.newTrip.stepWhereSubtitle,
  },
  when: {
    eyebrow: strings.newTrip.stepWhenEyebrow,
    title: strings.newTrip.stepWhenTitle,
    subtitle: strings.newTrip.stepWhenSubtitle,
  },
  finish: {
    eyebrow: strings.newTrip.stepFinishEyebrow,
    title: strings.newTrip.stepFinishTitle,
    subtitle: strings.newTrip.stepFinishSubtitle,
  },
};

export default function NewTripScreen() {
  const router = useRouter();

  const routeParams =
    useLocalSearchParams();

  /**
   * Discover prefill is read once when this screen opens.
   *
   * After that, local form state belongs to the user.
   * Route params must never keep overwriting edits.
   */
  const [discoverPrefill] =
    useState(() => {
      try {
        return (
          parseDiscoverTripRouteParams(
            routeParams,
          )
        );
      } catch (error) {
        console.error(
          '[NewTrip] Discover prefill could not be parsed:',
          error,
        );

        return null;
      }
    });

  const [importSeedPrefill] = useState(() => {
    const source = Array.isArray(routeParams.source)
      ? routeParams.source[0]
      : routeParams.source;

    if (source !== 'import_seed') {
      return null;
    }

    const pick = (key: string) => {
      const value = routeParams[key];
      return Array.isArray(value) ? value[0] : value;
    };

    return {
      title: pick('title')?.trim() || '',
      startDate: pick('startDate')?.trim() || '',
      endDate: pick('endDate')?.trim() || '',
    };
  });

  const saveTrip =
    useTripStore(
      (state) => state.saveTrip,
    );

  const [
    title,
    setTitle,
  ] = useState(
    () => importSeedPrefill?.title ?? '',
  );

  const [
    destinations,
    setDestinations,
  ] =
    useState<DestinationSelection[]>(
      () => {
        if (!discoverPrefill) {
          return [];
        }

        return [
          discoverPrefill.destination,
          ...(discoverPrefill.extraDestinations ?? []),
        ];
      },
    );

  const [
    origin,
    setOrigin,
  ] =
    useState<DestinationSelection | null>(null);

  const [
    startDate,
    setStartDate,
  ] =
    useState(
      () =>
        discoverPrefill?.startDate ??
        importSeedPrefill?.startDate ??
        '',
    );

  const [
    endDate,
    setEndDate,
  ] =
    useState(
      () =>
        discoverPrefill?.endDate ??
        importSeedPrefill?.endDate ??
        '',
    );

  const [
    intent,
    setIntent,
  ] =
    useState<
      TripIntent | undefined
    >(
      () =>
        discoverPrefill
          ?.intent,
    );

  const [
    pace,
    setPace,
  ] =
    useState<
      TripPace | undefined
    >(
      () =>
        discoverPrefill
          ?.pace,
    );

  const [
    partyType,
    setPartyType,
  ] =
    useState<TripPartyType | undefined>();

  const [
    partySizeText,
    setPartySizeText,
  ] = useState('');

  /**
   * Accounting currency is deliberately not inferred from
   * destination currency or Discover.
   *
   * Destination/local currency and accounting currency are
   * separate concepts.
   */
  const [
    currency,
    setCurrency,
  ] = useState('EUR');

  const [
    plannedBudgetAmount,
    setPlannedBudgetAmount,
  ] = useState('');

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [step, setStep] =
    useState<CreateTripStep>(() =>
      discoverPrefill &&
      (discoverPrefill.destination ||
        (discoverPrefill.extraDestinations?.length ??
          0) > 0)
        ? 'when'
        : 'where',
    );

  const isReady = Boolean(
    destinations.length > 0 &&
      startDate &&
      endDate &&
      currency.length === 3,
  );

  const editor = useRouteEditorGuard({ title, destinations, origin, startDate, endDate, intent, pace, partyType, partySizeText, currency, plannedBudgetAmount }, isSaving);

  const stepIndex = CREATE_TRIP_STEPS.indexOf(step);

  const canAdvanceWhere = destinations.length > 0;
  const canAdvanceWhen = Boolean(startDate && endDate);

  const goNext = () => {
    if (step === 'where' && !canAdvanceWhere) {
      Alert.alert(
        strings.newTrip.alertDestinationNeededTitle,
        strings.newTrip.alertDestinationNeededBody,
      );
      return;
    }

    if (step === 'when' && !canAdvanceWhen) {
      Alert.alert(
        strings.newTrip.alertDatesNeededTitle,
        strings.newTrip.alertDatesNeededBody,
      );
      return;
    }

    const next = CREATE_TRIP_STEPS[stepIndex + 1];

    if (next) {
      setStep(next);
    }
  };

  const goBackStep = () => {
    const previous = CREATE_TRIP_STEPS[stepIndex - 1];

    if (previous) {
      setStep(previous);
      return;
    }

    router.back();
  };

  const primaryDestination = destinations[0];

  const tripNamePlaceholder =
    primaryDestination?.name
      ? `${primaryDestination.name} trip`
      : strings.newTrip.namePlaceholder;

  const updateCurrency = (
    value: string,
  ) => {
    setCurrency(
      value
        .replace(
          /[^a-z]/gi,
          '',
        )
        .toUpperCase()
        .slice(0, 3),
    );
  };

  const toggleIntent = (
    value: TripIntent,
  ) => {
    setIntent(
      (current) =>
        current === value
          ? undefined
          : value,
    );
  };

  const togglePace = (
    value: TripPace,
  ) => {
    setPace(
      (current) =>
        current === value
          ? undefined
          : value,
    );
  };

  const togglePartyType = (
    value: TripPartyType,
  ) => {
    setPartyType((current) =>
      current === value ? undefined : value,
    );
  };

  const addDestination = (
    selection: DestinationSelection,
  ) => {
    setDestinations((current) => {
      if (current.length >= MAX_TRIP_DESTINATIONS) {
        Alert.alert(
          strings.newTrip.alertDestinationLimitTitle,
          `A trip can have at most ${MAX_TRIP_DESTINATIONS} destinations.`,
        );
        return current;
      }

      return [...current, selection];
    });
  };

  const replaceDestination = (
    index: number,
    selection: DestinationSelection,
  ) => {
    setDestinations((current) =>
      current.map((destination, currentIndex) =>
        currentIndex === index
          ? preserveSelectionEnrichment(
              destination,
              selection,
            )
          : destination,
      ),
    );
  };

  const setDestinationTimeZone = (
    index: number,
    timezone: string | null,
  ) => {
    setDestinations((current) =>
      current.map((destination, currentIndex) =>
        currentIndex === index
          ? assignTravelerTimeZoneToSelection(
              destination,
              timezone,
            )
          : destination,
      ),
    );
  };

  const moveDestination = (index: number, delta: number) => {
    setDestinations((current) =>
      moveDestinationItems(current, index, delta),
    );
  };

  const removeDestination = (index: number) => {
    const destination = destinations[index];

    if (!destination) {
      return;
    }

    if (destinations.length <= 1) {
      Alert.alert(
        strings.newTrip.alertKeepOneTitle,
        'A trip needs at least one destination.',
      );
      return;
    }

    Alert.alert(
      `Remove ${destination.name}?`,
      strings.newTrip.alertRemoveDestinationBody,
      [
        {
          text: 'Keep',
          style: 'cancel',
        },
        {
          text: strings.newTrip.remove,
          style: 'destructive',
          onPress: () => {
            setDestinations((current) =>
              current.filter((_, currentIndex) => currentIndex !== index),
            );
          },
        },
      ],
    );
  };

  const createTrip =
    async () => {
      if (destinations.length === 0) {
        Alert.alert(
          strings.newTrip.alertChooseDestinationTitle,
          strings.newTrip.alertChooseDestinationBody,
        );

        return;
      }

      const resolvedTitle =
        title.trim() ||
        primaryDestination?.name?.trim() ||
        strings.newTrip.defaultTripName;

      const now =
        new Date().toISOString();

      let trip;

      try {
        const partySizeRaw = partySizeText.trim();
        let partySize: number | undefined;

        if (partySizeRaw.length > 0) {
          const parsed = Number(partySizeRaw);

          if (
            !Number.isInteger(parsed) ||
            parsed < 1 ||
            parsed > 99
          ) {
            Alert.alert(
              strings.newTrip.alertPartySizeTitle,
              strings.newTrip.alertPartySizeBody,
            );
            return;
          }

          partySize = parsed;
        }

        trip =
          buildNewTrip(
            {
              title:
                resolvedTitle,

              destinations,

              startDate,

              endDate,

              accountingCurrency:
                currency,

              intent,

              pace,

              partyType,

              partySize,

              origin: origin ?? undefined,
            },

            {
              tripId: () =>
                Crypto.randomUUID(),

              destinationId: () =>
                Crypto.randomUUID(),
            },

            now,
          );
      } catch (error) {
        Alert.alert(
          strings.newTrip.alertTripDetailsTitle,

          error instanceof Error
            ? error.message
            : strings.newTrip.alertTripDetailsBody,
        );

        return;
      }

      try {
        setIsSaving(true);

        await saveTrip(trip);

        const plannedRaw = plannedBudgetAmount.trim();

        if (plannedRaw.length > 0) {
          const parsed = Number(
            plannedRaw.replace(',', '.'),
          );

          if (
            !Number.isFinite(parsed) ||
            parsed < 0
          ) {
            Alert.alert(
              strings.newTrip.alertTripCreatedTitle,
              strings.newTrip.alertBudgetNotSetBody,
            );
          } else {
            try {
              await budgetService.setPlannedBudget(
                trip.id,
                parsed,
              );
            } catch {
              Alert.alert(
                strings.newTrip.alertTripCreatedTitle,
                strings.newTrip.alertBudgetFailedBody,
              );
            }
          }
        }

        editor.finish(() => router.replace({
          pathname: '/trip/[tripId]/copilot',
          params: {
            tripId: trip.id,
          },
        }));
      } catch {
        Alert.alert(
          strings.newTrip.alertCreateFailedTitle,
          strings.newTrip.alertCreateFailedBody,
        );
      } finally {
        setIsSaving(false);
      }
    };

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <Screen
        scroll={false}
        contentStyle={styles.screenBody}
      >
        <View
          style={styles.topBar}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.newTrip.back}
            style={
              styles.backButton
            }
            onPress={goBackStep}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.brand}
            />
          </Pressable>

          <Text
            style={
              styles.topBarTitle
            }
          >
            {strings.newTrip.header}
          </Text>

          <View
            style={
              styles.topSpacer
            }
          />
        </View>

        <View style={styles.stepRow}>
          {CREATE_TRIP_STEPS.map(
            (item, index) => {
              const active = index === stepIndex;
              const done = index < stepIndex;

              return (
                <View
                  key={item}
                  style={[
                    styles.stepPip,
                    active && styles.stepPipActive,
                    done && styles.stepPipDone,
                  ]}
                />
              );
            },
          )}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <RiseIn factKey={`step:${step}`}>
          <View style={styles.intro}>
            <Text
              style={styles.eyebrow}
            >
              {STEP_COPY[step].eyebrow}
            </Text>

            <Text style={styles.title}>
              {discoverPrefill && step === 'where'
                ? strings.newTrip.prefillTitle
                : STEP_COPY[step].title}
            </Text>

            <Text
              style={styles.subtitle}
            >
              {discoverPrefill && step === 'where'
                ? strings.newTrip.prefillSubtitle
                : STEP_COPY[step].subtitle}
            </Text>
          </View>
        </RiseIn>

        {discoverPrefill && step === 'where' ? (
          <View
            style={
              styles.discoverCard
            }
          >
            <View
              style={
                styles.discoverIcon
              }
            >
              <Ionicons
                name="compass-outline"
                size={21}
                color={colors.teal}
              />
            </View>

            <View
              style={
                styles.discoverCopy
              }
            >
              <Text
                style={
                  styles.discoverEyebrow
                }
              >
                FROM DISCOVER
              </Text>

              <Text
                style={
                  styles.discoverTitle
                }
              >
                {discoverPrefill.extraDestinations &&
                discoverPrefill.extraDestinations.length > 0
                  ? strings.newTrip.prefillMany
                  : strings.newTrip.prefillOne}
              </Text>

              <Text
                style={
                  styles.discoverBody
                }
              >
                {strings.newTrip.prefillNote}
              </Text>
            </View>
          </View>
        ) : null}

        <RiseIn
          factKey={`body:${step}`}
          delayMs={motion.staggerMs}
        >
          <View style={styles.form}>
            {step === 'where' ? (
              <>
                {destinations.length === 0 ? (
                  <View style={styles.whereDoors}>
                    <Text style={styles.fieldLabel}>
                      {strings.newTrip.howToStart}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={strings.newTrip.helpMeDecideLabel}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.whereDoor,
                        pressed && styles.pressed,
                        isSaving && styles.inputDisabled,
                      ]}
                      onPress={() =>
                        router.push('/discover/find-destination')
                      }
                    >
                      <Text style={styles.whereDoorTitle}>
                        {strings.newTrip.helpMeDecide}
                      </Text>
                      <Text style={styles.whereDoorBody}>
                        {strings.newTrip.helpMeDecideBody}
                      </Text>
                    </Pressable>
                    <Text style={styles.whereDoorDivider}>
                      {strings.newTrip.orPickKnown}
                    </Text>
                    <DestinationPickerField
                      disabled={isSaving}
                      onSelect={addDestination}
                    />
                  </View>
                ) : (
                  destinations.map((destination, index) => (
                    <View
                      key={`${destination.name}-${index}`}
                      style={
                        index > 0
                          ? styles.destinationAfter
                          : undefined
                      }
                    >
                      <DestinationPickerField
                        label={
                          destinations.length === 1
                            ? strings.newTrip.destinationLabel
                            : strings.newTrip.destinationLabelNumbered(
                                index + 1,
                              )
                        }
                        destination={destination}
                        disabled={isSaving}
                        onSelect={(selection) =>
                          replaceDestination(index, selection)
                        }
                        onTimeZoneChange={(timezone) =>
                          setDestinationTimeZone(index, timezone)
                        }
                      />

                      {destinations.length > 1 ? (
                        <View style={styles.destinationActions}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${destination.name} earlier`}
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
                            accessibilityLabel={`Move ${destination.name} later`}
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
                            accessibilityLabel={`Remove ${destination.name}`}
                            disabled={isSaving}
                            hitSlop={5}
                            style={({ pressed }) => [
                              styles.destinationAction,
                              pressed && styles.pressed,
                            ]}
                            onPress={() => removeDestination(index)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color={colors.coral}
                            />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ))
                )}

                {destinations.length > 0 &&
                destinations.length < MAX_TRIP_DESTINATIONS ? (
                  <View style={styles.destinationAddAfter}>
                    <DestinationPickerField
                      variant="add"
                      disabled={isSaving}
                      onSelect={addDestination}
                    />
                  </View>
                ) : null}

                <View style={styles.originBlock}>
                  <Text style={styles.fieldLabel}>
                    {strings.newTrip.originEyebrow}
                  </Text>
                  <Text style={styles.helperText}>
                    {strings.newTrip.originHelper}
                  </Text>
                  <DestinationPickerField
                    role="origin"
                    label={strings.newTrip.originLabel}
                    destination={origin}
                    disabled={isSaving}
                    onSelect={(selection) =>
                      setOrigin(
                        preserveSelectionEnrichment(
                          origin ?? selection,
                          selection,
                        ),
                      )
                    }
                    onTimeZoneChange={(timezone) => {
                      setOrigin((current) =>
                        current
                          ? assignTravelerTimeZoneToSelection(
                              current,
                              timezone,
                            )
                          : current,
                      );
                    }}
                  />
                  {origin ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={strings.newTrip.originClear}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.secondaryTextButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setOrigin(null)}
                    >
                      <Text style={styles.secondaryTextButtonLabel}>
                        {strings.newTrip.originClear}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}

            {step === 'when' ? (
              <View
                style={styles.section}
              >
                {destinations.length > 0 ? (
                  <Text style={styles.stepContext}>
                    {destinations
                      .map((item) => item.name)
                      .join(' · ')}
                  </Text>
                ) : null}

                <View
                  style={
                    styles.sectionHeading
                  }
                >
                  <Text
                    style={
                      styles.sectionEyebrow
                    }
                  >
                    WHEN
                  </Text>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    {strings.newTrip.travelDates}
                  </Text>
                </View>

                <View
                  style={
                    styles.dateFields
                  }
                >
                  <CalendarDateField
                    label={strings.newTrip.startDate}
                    value={startDate}
                    fallbackDate={
                      endDate
                    }
                    disabled={isSaving}
                    onChange={
                      setStartDate
                    }
                  />

                  <CalendarDateField
                    label={strings.newTrip.endDate}
                    value={endDate}
                    fallbackDate={
                      startDate
                    }
                    disabled={isSaving}
                    onChange={
                      setEndDate
                    }
                  />
                </View>
              </View>
            ) : null}

            {step === 'finish' ? (
              <>
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewEyebrow}>
                    {strings.newTrip.readyToCreate}
                  </Text>
                  <Text style={styles.reviewTitle}>
                    {title.trim() || tripNamePlaceholder}
                  </Text>
                  <Text style={styles.reviewMeta}>
                    {destinations
                      .map((item) => item.name)
                      .join(' · ')}
                  </Text>
                  {origin ? (
                    <Text style={styles.reviewMeta}>
                      From {origin.name}
                    </Text>
                  ) : null}
                  <Text style={styles.reviewMeta}>
                    {startDate && endDate
                      ? `${formatCalendarDateForDisplay(startDate, REVIEW_DATE_FORMAT)} → ${formatCalendarDateForDisplay(endDate, REVIEW_DATE_FORMAT)}`
                      : strings.newTrip.datesIncomplete}
                    {' · '}
                    {currency}
                  </Text>
                </View>

                <View
                  style={styles.section}
                >
                  <View
                    style={
                      styles.sectionHeading
                    }
                  >
                    <Text
                      style={
                        styles.sectionEyebrow
                      }
                    >
                      WHY THIS TRIP
                    </Text>

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      {strings.newTrip.shapeTitle}
                    </Text>

                    <Text
                      style={
                        styles.sectionDescription
                      }
                    >
                      {strings.newTrip.shapeBody}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.choiceGroup
                    }
                  >
                    <Text
                      style={
                        styles.fieldLabel
                      }
                    >
                      PRIMARY INTENT · OPTIONAL
                    </Text>

                    <View
                      style={
                        styles.intentGrid
                      }
                    >
                      {INTENT_OPTIONS.map(
                        (option) => {
                          const selected =
                            intent ===
                            option.value;

                          return (
                            <Pressable
                              key={
                                option.value
                              }
                              accessibilityRole="button"
                              accessibilityState={{
                                selected,
                              }}
                              accessibilityLabel={`Trip intent: ${option.label}`}
                              disabled={
                                isSaving
                              }
                              onPress={() =>
                                toggleIntent(
                                  option.value,
                                )
                              }
                              style={({
                                pressed,
                              }) => [
                                styles.intentChip,

                                selected &&
                                  styles.choiceSelected,

                                pressed &&
                                  styles.pressed,

                                isSaving &&
                                  styles.inputDisabled,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.intentChipText,

                                  selected &&
                                    styles.choiceSelectedText,
                                ]}
                              >
                                {
                                  option.label
                                }
                              </Text>
                            </Pressable>
                          );
                        },
                      )}
                    </View>
                  </View>

                  <View
                    style={
                      styles.choiceGroup
                    }
                  >
                    <Text
                      style={
                        styles.fieldLabel
                      }
                    >
                      TRIP PACE · OPTIONAL
                    </Text>

                    <View
                      style={
                        styles.paceOptions
                      }
                    >
                      {PACE_OPTIONS.map(
                        (option) => {
                          const selected =
                            pace ===
                            option.value;

                          return (
                            <Pressable
                              key={
                                option.value
                              }
                              accessibilityRole="button"
                              accessibilityState={{
                                selected,
                              }}
                              accessibilityLabel={`Trip pace: ${option.label}`}
                              disabled={
                                isSaving
                              }
                              onPress={() =>
                                togglePace(
                                  option.value,
                                )
                              }
                              style={({
                                pressed,
                              }) => [
                                styles.paceCard,

                                selected &&
                                  styles.choiceSelected,

                                pressed &&
                                  styles.pressed,

                                isSaving &&
                                  styles.inputDisabled,
                              ]}
                            >
                              <View
                                style={[
                                  styles.radioOuter,

                                  selected &&
                                    styles.radioOuterSelected,
                                ]}
                              >
                                {selected ? (
                                  <View
                                    style={
                                      styles.radioInner
                                    }
                                  />
                                ) : null}
                              </View>

                              <View
                                style={
                                  styles.paceCopy
                                }
                              >
                                <Text
                                  style={[
                                    styles.paceLabel,

                                    selected &&
                                      styles.choiceSelectedText,
                                  ]}
                                >
                                  {
                                    option.label
                                  }
                                </Text>

                                <Text
                                  style={
                                    styles.paceDescription
                                  }
                                >
                                  {
                                    option.description
                                  }
                                </Text>
                              </View>
                            </Pressable>
                          );
                        },
                      )}
                    </View>
                  </View>

                  <View
                    style={
                      styles.choiceGroup
                    }
                  >
                    <Text
                      style={
                        styles.fieldLabel
                      }
                    >
                      PARTY · OPTIONAL
                    </Text>
                    <Text
                      style={
                        styles.helperText
                      }
                    >
                      {strings.newTrip.partyNote}
                    </Text>
                    <View
                      style={
                        styles.intentGrid
                      }
                    >
                      {PARTY_OPTIONS.map(
                        (option) => {
                          const selected =
                            partyType ===
                            option.value;

                          return (
                            <Pressable
                              key={
                                option.value
                              }
                              accessibilityRole="button"
                              accessibilityState={{
                                selected,
                              }}
                              accessibilityLabel={`Party: ${option.label}`}
                              disabled={
                                isSaving
                              }
                              onPress={() =>
                                togglePartyType(
                                  option.value,
                                )
                              }
                              style={({
                                pressed,
                              }) => [
                                styles.intentChip,
                                selected &&
                                  styles.choiceSelected,
                                pressed &&
                                  styles.pressed,
                                isSaving &&
                                  styles.inputDisabled,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.intentChipText,
                                  selected &&
                                    styles.choiceSelectedText,
                                ]}
                              >
                                {
                                  option.label
                                }
                              </Text>
                            </Pressable>
                          );
                        },
                      )}
                    </View>
                    <Field
                      label="PARTY SIZE · OPTIONAL"
                      placeholder={strings.newTrip.partySizePlaceholder}
                      value={partySizeText}
                      disabled={isSaving}
                      keyboardType="number-pad"
                      maxLength={2}
                      onChangeText={
                        setPartySizeText
                      }
                    />
                  </View>
                </View>

                <View
                  style={styles.section}
                >
                  <View
                    style={
                      styles.sectionHeading
                    }
                  >
                    <Text
                      style={
                        styles.sectionEyebrow
                      }
                    >
                      MAKE IT YOURS
                    </Text>

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      {strings.newTrip.tripDetails}
                    </Text>
                  </View>

                  <Field
                    label="TRIP NAME · OPTIONAL"
                    placeholder={
                      tripNamePlaceholder
                    }
                    value={title}
                    disabled={isSaving}
                    onChangeText={
                      setTitle
                    }
                  />

                  <View
                    style={
                      styles.currencyField
                    }
                  >
                    <Field
                      label="TRIP CURRENCY"
                      placeholder={strings.newTrip.currencyPlaceholder}
                      value={currency}
                      disabled={isSaving}
                      maxLength={3}
                      onChangeText={
                        updateCurrency
                      }
                      autoCapitalize="characters"
                    />

                    <Text
                      style={
                        styles.helperText
                      }
                    >
                      {strings.newTrip.currencyNote}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.currencyField
                    }
                  >
                    <Field
                      label="PLANNED BUDGET · OPTIONAL"
                      placeholder={strings.newTrip.budgetPlaceholder}
                      value={plannedBudgetAmount}
                      disabled={isSaving}
                      keyboardType="decimal-pad"
                      onChangeText={
                        setPlannedBudgetAmount
                      }
                    />

                    <Text
                      style={
                        styles.helperText
                      }
                    >
                      {strings.newTrip.budgetNote}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </RiseIn>

        <View style={styles.scrollBottomSpace} />
        </ScrollView>

        <View
          style={[
            styles.stickyFooter,
            {
              paddingBottom: Math.max(
                insets.bottom,
                spacing[4],
              ),
            },
          ]}
        >
        {step !== 'finish' ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={strings.newTrip.continue}
            disabled={
              isSaving ||
              (step === 'where' && !canAdvanceWhere) ||
              (step === 'when' && !canAdvanceWhen)
            }
            style={[
              styles.createButton,
              ((step === 'where' && !canAdvanceWhere) ||
                (step === 'when' && !canAdvanceWhen) ||
                isSaving) &&
                styles.disabled,
            ]}
            pressedStyle={styles.pressed}
            onPress={goNext}
          >
            <Text
              style={
                styles.createButtonText
              }
            >
              {strings.newTrip.continue}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={
                colors.textInverse
              }
            />
          </PressableScale>
        ) : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={strings.newTrip.createTrip}
            disabled={
              isSaving ||
              !isReady
            }
            style={[
              styles.createButton,

              (isSaving ||
                !isReady) &&
                styles.disabled,
            ]}
            pressedStyle={styles.pressed}
            onPress={
              createTrip
            }
          >
            <Text
              style={
                styles.createButtonText
              }
            >
              {isSaving
                ? strings.newTrip.creatingTrip
                : strings.newTrip.createTrip}
            </Text>

            {!isSaving ? (
              <Ionicons
                name="arrow-forward"
                size={20}
                color={
                  colors.textInverse
                }
              />
            ) : null}
          </PressableScale>
        )}

        {step === 'where' &&
        !canAdvanceWhere &&
        !isSaving ? (
          <Text style={styles.ctaHint}>
            {strings.newTrip.needDestination} — {' '}
            <Text
              accessibilityRole="link"
              style={styles.ctaHintLink}
              onPress={() =>
                router.push('/travel-chat')
              }
            >
              {strings.newTrip.helpMeDecide}
            </Text>
            .
          </Text>
        ) : null}

        {step === 'when' &&
        !canAdvanceWhen &&
        !isSaving ? (
          <Text
            style={styles.ctaHint}
          >
            {strings.newTrip.needDates}
          </Text>
        ) : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

interface FieldProps {
  label: string;

  placeholder: string;

  value: string;

  onChangeText(
    value: string,
  ): void;

  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';

  disabled?: boolean;

  maxLength?: number;

  keyboardType?:
    | 'default'
    | 'decimal-pad'
    | 'number-pad';
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = 'sentences',
  disabled = false,
  maxLength,
  keyboardType = 'default',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          colors.textMuted
        }
        autoCapitalize={
          autoCapitalize
        }
        autoCorrect={false}
        editable={!disabled}
        maxLength={maxLength}
        keyboardType={keyboardType}
        style={[
          styles.input,

          disabled &&
            styles.inputDisabled,
        ]}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    screenBody: {
      flex: 1,
      paddingBottom: 0,
    },

    scrollContent: {
      paddingBottom: spacing[4],
      flexGrow: 1,
    },

    stickyFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      paddingTop: spacing[3],
      gap: spacing[2],
    },

    scrollBottomSpace: {
      height: spacing[4],
    },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingTop: spacing[3],
    },

    stepRow: {
      flexDirection: 'row',
      gap: spacing[2],
      marginTop: spacing[4],
      marginBottom: spacing[2],
    },

    stepPip: {
      flex: 1,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
    },

    stepPipActive: {
      backgroundColor: colors.brand,
    },

    stepPipDone: {
      backgroundColor: colors.teal,
    },

    stepContext: {
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing[4],
    },

    reviewCard: {
      padding: spacing[5],
      borderRadius: radius.lg,
      backgroundColor: colors.brand,
      gap: spacing[2],
      marginBottom: spacing[2],
    },

    reviewEyebrow: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.4,
      color: colors.brass,
    },

    reviewTitle: {
      fontFamily: fontFamily.serifSemiBold,
      fontSize: fontSize.title,
      lineHeight: lineHeight.title,
      color: colors.textInverse,
    },

    reviewMeta: {
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.bodySmall,
      lineHeight: lineHeight.bodySmall,
      color: 'rgba(255,253,248,0.72)',
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems: 'center',
      justifyContent:
        'center',
      ...shadows.subtle,
    },

    topBarTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    topSpacer: {
      width: 42,
    },

    intro: {
      marginTop: spacing[8],
      marginBottom:
        spacing[7],
    },

    eyebrow: {
      marginBottom:
        spacing[2],
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.8,
      color: colors.brass,
    },

    title: {
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.titleLarge,
      lineHeight:
        lineHeight.titleLarge,
      color:
        colors.textPrimary,
    },

    subtitle: {
      maxWidth: 430,
      marginTop: spacing[3],
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.bodySmall,
      lineHeight:
        lineHeight.bodySmall,
      color:
        colors.textSecondary,
    },

    discoverCard: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: spacing[4],
      marginBottom:
        spacing[6],
      padding: spacing[5],
      borderRadius:
        radius.lg,
      backgroundColor:
        colors.tealSoft,
    },

    discoverIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent:
        'center',
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.surface,
    },

    discoverCopy: {
      flex: 1,
    },

    discoverEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.2,
      color: colors.teal,
    },

    discoverTitle: {
      marginTop:
        spacing[1],
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.titleSmall,
      lineHeight:
        lineHeight.titleSmall,
      color:
        colors.textPrimary,
    },

    discoverBody: {
      marginTop:
        spacing[2],
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textSecondary,
    },

    form: {
      gap: spacing[6],
    },

    whereDoors: {
      gap: spacing[3],
    },

    whereDoor: {
      gap: spacing[2],
      padding: spacing[4],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    whereDoorTitle: {
      fontFamily: fontFamily.serifSemiBold,
      fontSize: fontSize.titleSmall,
      lineHeight: lineHeight.titleSmall,
      color: colors.textPrimary,
    },

    whereDoorBody: {
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.caption,
      color: colors.textSecondary,
    },

    whereDoorDivider: {
      marginTop: spacing[2],
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textMuted,
    },

    destinationAfter: {
      paddingTop: spacing[5],
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    destinationAddAfter: {
      paddingTop: spacing[1],
    },

    originBlock: {
      gap: spacing[2],
      paddingTop: spacing[5],
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    secondaryTextButton: {
      minHeight: 44,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },

    secondaryTextButtonLabel: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.brand,
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

    section: {
      gap: spacing[4],
      padding: spacing[5],
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.lg,
      backgroundColor:
        colors.surface,
    },

    sectionHeading: {
      gap: spacing[1],
    },

    sectionEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.4,
      color: colors.brass,
    },

    sectionTitle: {
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.titleSmall,
      lineHeight:
        lineHeight.titleSmall,
      color:
        colors.textPrimary,
    },

    sectionDescription: {
      marginTop:
        spacing[1],
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textSecondary,
    },

    field: {
      gap: spacing[2],
    },

    fieldLabel: {
      fontFamily:
        fontFamily.sansBold,
      fontSize:
        fontSize.micro,
      letterSpacing: 1.3,
      color: colors.brass,
    },

    input: {
      minHeight: 54,
      backgroundColor:
        colors.background,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      paddingHorizontal:
        spacing[4],
      fontFamily:
        fontFamily.sansMedium,
      fontSize: fontSize.body,
      color:
        colors.textPrimary,
    },

    inputDisabled: {
      opacity: 0.55,
    },

    dateFields: {
      gap: spacing[4],
    },

    choiceGroup: {
      gap: spacing[3],
    },

    intentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },

    intentChip: {
      minHeight: 42,
      justifyContent:
        'center',
      paddingHorizontal:
        spacing[4],
      borderRadius:
        radius.pill,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.background,
    },

    intentChipText: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    choiceSelected: {
      borderColor:
        colors.brand,
      backgroundColor:
        colors.brandSoft,
    },

    choiceSelectedText: {
      color: colors.brand,
    },

    paceOptions: {
      gap: spacing[2],
    },

    paceCard: {
      minHeight: 66,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal:
        spacing[4],
      paddingVertical:
        spacing[3],
      borderRadius:
        radius.md,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.background,
    },

    radioOuter: {
      width: 20,
      height: 20,
      borderRadius:
        radius.pill,
      borderWidth: 1.5,
      borderColor:
        colors.textMuted,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    radioOuterSelected: {
      borderColor:
        colors.brand,
    },

    radioInner: {
      width: 10,
      height: 10,
      borderRadius:
        radius.pill,
      backgroundColor:
        colors.brand,
    },

    paceCopy: {
      flex: 1,
      gap: spacing[1],
    },

    paceLabel: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    paceDescription: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textMuted,
    },

    currencyField: {
      gap: spacing[2],
    },

    helperText: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textMuted,
    },

    createButton: {
      minHeight: 56,
      marginTop: spacing[7],
      borderRadius:
        radius.md,
      backgroundColor:
        colors.brand,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: spacing[3],
      ...shadows.card,
    },

    createButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize: fontSize.body,
      color:
        colors.textInverse,
    },

    ctaHint: {
      marginTop: spacing[2],
      paddingHorizontal:
        spacing[2],
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.caption,
      lineHeight:
        lineHeight.caption,
      textAlign: 'center',
      color:
        colors.textMuted,
    },

    ctaHintLink: {
      fontFamily: fontFamily.sansSemiBold,
      color: colors.brand,
      textDecorationLine: 'underline',
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
