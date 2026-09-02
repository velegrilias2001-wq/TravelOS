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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CalendarDateField,
} from '@/components/ui/native-date-time-fields';

import {
  Screen,
} from '@/components/ui/screen';

import type {
  TripIntent,
  TripPace,
} from '@/domain/entities';

import {
  DestinationPickerField,
} from '@/features/destinations/destination-picker-field';

import type {
  DestinationSelection,
} from '@/services/destination-authoring';

import {
  parseDiscoverTripRouteParams,
} from '@/services/discover-trip-handoff';

import {
  buildNewTrip,
} from '@/services/trip-creation';

import {
  MAX_TRIP_DESTINATIONS,
  moveDestinationItems,
} from '@/services/trip-details';

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
      label: 'Relax',
    },
    {
      value: 'explore',
      label: 'Explore',
    },
    {
      value: 'food',
      label: 'Food',
    },
    {
      value: 'nature',
      label: 'Nature',
    },
    {
      value: 'event',
      label: 'Event',
    },
    {
      value: 'social',
      label: 'Social',
    },
    {
      value: 'romantic',
      label: 'Romantic',
    },
    {
      value: 'family',
      label: 'Family',
    },
    {
      value: 'work_leisure',
      label: 'Work + Leisure',
    },
    {
      value: 'other',
      label: 'Other',
    },
  ];

const PACE_OPTIONS:
  ChoiceOption<TripPace>[] = [
    {
      value: 'slow',
      label: 'Slow',
      description:
        'More breathing room.',
    },
    {
      value: 'balanced',
      label: 'Balanced',
      description:
        'A mix of plans and space.',
    },
    {
      value: 'full',
      label: 'Full',
      description:
        'Make the most of each day.',
    },
  ];

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

  const saveTrip =
    useTripStore(
      (state) => state.saveTrip,
    );

  const [
    title,
    setTitle,
  ] = useState('');

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
    startDate,
    setStartDate,
  ] =
    useState(
      () =>
        discoverPrefill
          ?.startDate ?? '',
    );

  const [
    endDate,
    setEndDate,
  ] =
    useState(
      () =>
        discoverPrefill
          ?.endDate ?? '',
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
    isSaving,
    setIsSaving,
  ] = useState(false);

  const isReady = Boolean(
    destinations.length > 0 &&
      startDate &&
      endDate &&
      currency.length === 3,
  );

  const primaryDestination = destinations[0];

  const tripNamePlaceholder =
    primaryDestination?.name
      ? `${primaryDestination.name} trip`
      : 'Give this trip a name';

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

  const addDestination = (
    selection: DestinationSelection,
  ) => {
    setDestinations((current) => {
      if (current.length >= MAX_TRIP_DESTINATIONS) {
        Alert.alert(
          'Destination limit',
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
        currentIndex === index ? selection : destination,
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
        'Keep one destination',
        'A trip needs at least one destination.',
      );
      return;
    }

    Alert.alert(
      `Remove ${destination.name}?`,
      'This only removes the place from the new trip. Nothing has been saved yet.',
      [
        {
          text: 'Keep',
          style: 'cancel',
        },
        {
          text: 'Remove',
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
          'Choose a destination',
          'Choose a city, region or country before creating this trip.',
        );

        return;
      }

      const resolvedTitle =
        title.trim() ||
        primaryDestination?.name?.trim() ||
        'New trip';

      const now =
        new Date().toISOString();

      let trip;

      try {
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
          pathname:
            '/trip/[tripId]',

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
        <View
          style={styles.topBar}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
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
            Create trip
          </Text>

          <View
            style={
              styles.topSpacer
            }
          />
        </View>

        <View style={styles.intro}>
          <Text
            style={styles.eyebrow}
          >
            NEW JOURNEY
          </Text>

          <Text style={styles.title}>
            {discoverPrefill
              ? 'Make it a trip.'
              : 'Start with somewhere.'}
          </Text>

          <Text
            style={styles.subtitle}
          >
            {discoverPrefill
              ? 'Your Discover choice is ready. Add the remaining trip details, review anything you want to change, and create the trip when you are ready.'
              : 'Pick a place and your dates, then add a little context about the kind of trip you want.'}
          </Text>
        </View>

        {discoverPrefill ? (
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
                  ? 'Destinations prefilled'
                  : 'Destination prefilled'}
              </Text>

              <Text
                style={
                  styles.discoverBody
                }
              >
                Nothing has been created yet. Review the details below and create the trip only when you are ready.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.form}>
          {destinations.length === 0 ? (
            <DestinationPickerField
              disabled={isSaving}
              onSelect={addDestination}
            />
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
                      ? 'DESTINATION'
                      : `DESTINATION ${index + 1}`
                  }
                  destination={destination}
                  disabled={isSaving}
                  onSelect={(selection) =>
                    replaceDestination(index, selection)
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
                WHEN
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Travel dates
              </Text>
            </View>

            <View
              style={
                styles.dateFields
              }
            >
              <CalendarDateField
                label="START DATE"
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
                label="END DATE"
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
                Shape the journey
              </Text>

              <Text
                style={
                  styles.sectionDescription
                }
              >
                Optional. Choose what matters most for this trip and how full you want the days to feel.
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
                Trip details
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
                placeholder="EUR"
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
                Used for your budget and trip totals. Expenses can still use the currency you paid.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create trip"
          disabled={
            isSaving ||
            !isReady
          }
          style={({
            pressed,
          }) => [
            styles.createButton,

            pressed &&
              styles.pressed,

            (isSaving ||
              !isReady) &&
              styles.disabled,
          ]}
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
              ? 'Creating trip…'
              : 'Create trip'}
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
        </Pressable>

        {!isReady &&
        !isSaving ? (
          <Text
            style={styles.ctaHint}
          >
            Choose a destination and travel dates to continue.
          </Text>
        ) : null}

        <View
          style={
            styles.bottomSpace
          }
        />
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

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingTop: spacing[3],
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

    destinationAfter: {
      paddingTop: spacing[5],
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    destinationAddAfter: {
      paddingTop: spacing[1],
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