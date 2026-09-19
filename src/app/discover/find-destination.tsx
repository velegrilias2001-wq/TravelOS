import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
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
  DiscoverBrief,
  TravelDNA,
  TravelInterest,
  TripIntent,
  TripPace,
  TypicalTravelParty,
} from '@/domain/entities';

import {
  travelDNAService,
} from '@/services/travel-dna-runtime';

import {
  useDiscoverStore,
} from '@/store/discover-store';

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

type TimingMode =
  | 'unsure'
  | 'exact'
  | 'flexible';

interface ChoiceOption<
  Value extends string,
> {
  value: Value;
  label: string;
  description?: string;
}

const INTENT_OPTIONS: ChoiceOption<TripIntent>[] = [
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
    label: strings.tripParty.family,
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

const PACE_OPTIONS: ChoiceOption<TripPace>[] = [
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
      'A mix of plans and space.',
  },
  {
    value: 'full',
    label: strings.tripPace.fullLabel,
    description:
      strings.tripPace.fullDescription,
  },
];

const INTEREST_OPTIONS: ChoiceOption<TravelInterest>[] = [
  {
    value: 'food',
    label: strings.tripIntent.food,
  },
  {
    value: 'culture',
    label: strings.travelDna.interestCulture,
  },
  {
    value: 'nature',
    label: strings.tripIntent.nature,
  },
  {
    value: 'beaches',
    label: strings.travelDna.interestBeaches,
  },
  {
    value: 'nightlife',
    label: strings.travelDna.interestNightlife,
  },
  {
    value: 'shopping',
    label: strings.travelDna.interestShopping,
  },
  {
    value: 'wellness',
    label: strings.travelDna.interestWellness,
  },
  {
    value: 'adventure',
    label: strings.travelDna.interestAdventure,
  },
];

const PARTY_OPTIONS: ChoiceOption<TypicalTravelParty>[] = [
  {
    value: 'solo',
    label: strings.tripParty.solo,
  },
  {
    value: 'couple',
    label: strings.tripParty.couple,
  },
  {
    value: 'friends',
    label: strings.tripParty.friends,
  },
  {
    value: 'family',
    label: strings.tripParty.family,
  },
];

export default function FindDestinationScreen() {
  const router = useRouter();

  const setBrief =
    useDiscoverStore(
      (state) => state.setBrief,
    );

  const [
    travelDNA,
    setTravelDNA,
  ] = useState<TravelDNA | null>(
    null,
  );

  const [
    travelDNALoaded,
    setTravelDNALoaded,
  ] = useState(false);

  const [
    timingMode,
    setTimingMode,
  ] = useState<TimingMode>(
    'unsure',
  );

  const [
    startDate,
    setStartDate,
  ] = useState('');

  const [
    endDate,
    setEndDate,
  ] = useState('');

  const [
    earliestStartDate,
    setEarliestStartDate,
  ] = useState('');

  const [
    latestEndDate,
    setLatestEndDate,
  ] = useState('');

  const [
    tripLengthDays,
    setTripLengthDays,
  ] = useState('');

  const [
    budgetAmount,
    setBudgetAmount,
  ] = useState('');

  const [
    budgetCurrency,
    setBudgetCurrency,
  ] = useState('');

  const [
    intent,
    setIntent,
  ] =
    useState<TripIntent | undefined>();

  const [
    pace,
    setPace,
  ] =
    useState<TripPace | undefined>();

  const [
    interests,
    setInterests,
  ] = useState<TravelInterest[]>([]);

  const [
    party,
    setParty,
  ] =
    useState<
      TypicalTravelParty | undefined
    >();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadTravelDNA =
        async () => {
          try {
            const profile =
              await travelDNAService.get();

            if (active) {
              setTravelDNA(profile);
              setTravelDNALoaded(true);
            }
          } catch (error) {
            console.error(
              '[Discover] Travel DNA load failed:',
              error,
            );

            if (active) {
              setTravelDNA(null);
              setTravelDNALoaded(true);
            }
          }
        };

      void loadTravelDNA();

      return () => {
        active = false;
      };
    }, []),
  );

  const toggleIntent = (
    value: TripIntent,
  ) => {
    setIntent((current) =>
      current === value
        ? undefined
        : value,
    );
  };

  const togglePace = (
    value: TripPace,
  ) => {
    setPace((current) =>
      current === value
        ? undefined
        : value,
    );
  };

  const toggleInterest = (
    value: TravelInterest,
  ) => {
    setInterests((current) =>
      current.includes(value)
        ? current.filter(
            (interest) =>
              interest !== value,
          )
        : [
            ...current,
            value,
          ],
    );
  };

  const toggleParty = (
    value: TypicalTravelParty,
  ) => {
    setParty((current) =>
      current === value
        ? undefined
        : value,
    );
  };

  const buildTiming =
    (): DiscoverBrief['timing'] => {
      if (
        timingMode === 'unsure'
      ) {
        return undefined;
      }

      if (
        timingMode === 'exact'
      ) {
        if (
          !startDate ||
          !endDate
        ) {
          throw new Error(
            strings.findDestination.alertDatesBody,
          );
        }

        return {
          kind: 'exact',
          startDate,
          endDate,
        };
      }

      const parsedTripLength =
        tripLengthDays.trim()
          ? Number(
              tripLengthDays,
            )
          : undefined;

      return {
        kind: 'flexible',
        earliestStartDate:
          earliestStartDate ||
          undefined,
        latestEndDate:
          latestEndDate ||
          undefined,
        tripLengthDays:
          parsedTripLength,
      };
    };

  const buildBudget =
    (): DiscoverBrief['budget'] => {
      const cleanAmount =
        budgetAmount
          .trim()
          .replace(',', '.');

      const cleanCurrency =
        budgetCurrency
          .trim()
          .toUpperCase();

      if (
        !cleanAmount &&
        !cleanCurrency
      ) {
        return undefined;
      }

      if (
        !cleanAmount ||
        !cleanCurrency
      ) {
        throw new Error(
          strings.findDestination.alertBudgetBody,
        );
      }

      const maximumAmount =
        Number(cleanAmount);

      return {
        maximumAmount,
        currency: cleanCurrency,
      };
    };

  const continueToResults = () => {
    try {
      const brief: DiscoverBrief = {
        mode:
          'find_destination',

        timing:
          buildTiming(),

        budget:
          buildBudget(),

        intent,

        pace,

        interests,

        party,
      };

      setBrief(brief);

      router.push(
        '/discover/results',
      );
    } catch (error) {
      Alert.alert(
        strings.findDestination.alertBriefTitle,
        error instanceof Error
          ? error.message
          : strings.findDestination.alertBriefBody,
      );
    }
  };

  const hasTravelDNA =
    Boolean(
      travelDNA &&
      (
        travelDNA.pace ||
        travelDNA.interests.length > 0 ||
        travelDNA.travelStyle ||
        travelDNA.budgetStyle ||
        travelDNA.dailyRhythm ||
        travelDNA.typicalParty
      ),
    );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.discoverShared.goBack}
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={colors.brand}
          />
        </Pressable>

        <Text style={styles.eyebrow}>
          DISCOVER
        </Text>

        <Text style={styles.title}>
          {strings.findDestination.title}
        </Text>

        <Text style={styles.subtitle}>
          {strings.findDestination.intro}
        </Text>
      </View>

      <View style={styles.dnaCard}>
        <View style={styles.dnaIcon}>
          <Ionicons
            name="finger-print-outline"
            size={21}
            color={colors.teal}
          />
        </View>

        <View style={styles.dnaCopy}>
          <Text style={styles.dnaTitle}>
            {travelDNALoaded
              ? hasTravelDNA
                ? strings.findDestination.dnaHelping
                : strings.findDestination.dnaNone
              : strings.findDestination.dnaLoading}
          </Text>

          <Text style={styles.dnaBody}>
            {travelDNALoaded
              ? hasTravelDNA
                ? strings.findDestination.dnaHelpingBody
                : strings.findDestination.dnaNoneBody
              : strings.findDestination.dnaLoadingBody}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.section}>
          <SectionHeading
            eyebrow={strings.findDestination.whenEyebrow}
            title={strings.findDestination.whenTitle}
            description={strings.findDestination.whenBody}
          />

          <View style={styles.segmented}>
            <TimingChoice
              label={strings.findDestination.notSure}
              selected={
                timingMode ===
                'unsure'
              }
              onPress={() =>
                setTimingMode(
                  'unsure',
                )
              }
            />

            <TimingChoice
              label={strings.findDestination.exact}
              selected={
                timingMode ===
                'exact'
              }
              onPress={() =>
                setTimingMode(
                  'exact',
                )
              }
            />

            <TimingChoice
              label={strings.findDestination.flexible}
              selected={
                timingMode ===
                'flexible'
              }
              onPress={() =>
                setTimingMode(
                  'flexible',
                )
              }
            />
          </View>

          {timingMode ===
            'exact' && (
            <View
              style={
                styles.dateFields
              }
            >
              <CalendarDateField
                label={strings.findDestination.labelStartDate}
                value={startDate}
                fallbackDate={
                  endDate
                }
                onChange={
                  setStartDate
                }
              />

              <CalendarDateField
                label={strings.findDestination.labelEndDate}
                value={endDate}
                fallbackDate={
                  startDate
                }
                onChange={
                  setEndDate
                }
              />
            </View>
          )}

          {timingMode ===
            'flexible' && (
            <View
              style={
                styles.flexibleFields
              }
            >
              <CalendarDateField
                label={strings.findDestination.labelEarliestStart}
                value={
                  earliestStartDate
                }
                fallbackDate={
                  latestEndDate
                }
                onChange={
                  setEarliestStartDate
                }
              />

              <CalendarDateField
                label={strings.findDestination.labelLatestEnd}
                value={
                  latestEndDate
                }
                fallbackDate={
                  earliestStartDate
                }
                onChange={
                  setLatestEndDate
                }
              />

              <View
                style={
                  styles.field
                }
              >
                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  {strings.findDestination.idealLength}
                </Text>

                <TextInput
                  value={
                    tripLengthDays
                  }
                  onChangeText={
                    setTripLengthDays
                  }
                  placeholder={strings.findDestination.lengthPlaceholder}
                  placeholderTextColor={
                    colors.textMuted
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow={strings.findDestination.budgetEyebrow}
            title={strings.findDestination.budgetTitle}
            description={strings.findDestination.budgetBody}
          />

          <View style={styles.budgetRow}>
            <View
              style={
                styles.budgetAmount
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                {strings.findDestination.maximum}
              </Text>

              <TextInput
                value={
                  budgetAmount
                }
                onChangeText={
                  setBudgetAmount
                }
                placeholder="1500"
                placeholderTextColor={
                  colors.textMuted
                }
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            <View
              style={
                styles.budgetCurrency
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                {strings.findDestination.currency}
              </Text>

              <TextInput
                value={
                  budgetCurrency
                }
                onChangeText={
                  setBudgetCurrency
                }
                placeholder="EUR"
                placeholderTextColor={
                  colors.textMuted
                }
                autoCapitalize="characters"
                maxLength={3}
                style={styles.input}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow={strings.findDestination.whyEyebrow}
            title={strings.findDestination.whyTitle}
            description={strings.findDestination.whyBody}
          />

          <View style={styles.choiceGroup}>
            <Text style={styles.fieldLabel}>
              {strings.findDestination.primaryIntent}
            </Text>

            <View style={styles.chipGrid}>
              {INTENT_OPTIONS.map(
                (option) => {
                  const selected =
                    intent ===
                    option.value;

                  return (
                    <ChoiceChip
                      key={
                        option.value
                      }
                      label={
                        option.label
                      }
                      selected={
                        selected
                      }
                      onPress={() =>
                        toggleIntent(
                          option.value,
                        )
                      }
                    />
                  );
                },
              )}
            </View>
          </View>

          <View style={styles.choiceGroup}>
            <Text style={styles.fieldLabel}>
              {strings.findDestination.interests}
            </Text>

            <View style={styles.chipGrid}>
              {INTEREST_OPTIONS.map(
                (option) => (
                  <ChoiceChip
                    key={
                      option.value
                    }
                    label={
                      option.label
                    }
                    selected={interests.includes(
                      option.value,
                    )}
                    onPress={() =>
                      toggleInterest(
                        option.value,
                      )
                    }
                  />
                ),
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow={strings.findDestination.styleEyebrow}
            title={strings.findDestination.styleTitle}
            description={strings.findDestination.styleBody}
          />

          <View style={styles.choiceGroup}>
            <Text style={styles.fieldLabel}>
              {strings.findDestination.tripPace}
            </Text>

            <View style={styles.paceOptions}>
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
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked:
                          selected,
                      }}
                      style={[
                        styles.paceCard,
                        selected &&
                          styles.choiceSelected,
                      ]}
                      onPress={() =>
                        togglePace(
                          option.value,
                        )
                      }
                    >
                      <View
                        style={[
                          styles.radioOuter,

                          selected &&
                            styles.radioOuterSelected,
                        ]}
                      >
                        {selected && (
                          <View
                            style={
                              styles.radioInner
                            }
                          />
                        )}
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

          <View style={styles.choiceGroup}>
            <Text style={styles.fieldLabel}>
              {strings.findDestination.whoWith}
            </Text>

            <View style={styles.chipGrid}>
              {PARTY_OPTIONS.map(
                (option) => (
                  <ChoiceChip
                    key={
                      option.value
                    }
                    label={
                      option.label
                    }
                    selected={
                      party ===
                      option.value
                    }
                    onPress={() =>
                      toggleParty(
                        option.value,
                      )
                    }
                  />
                ),
              )}
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.findDestination.findDestinations}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed &&
              styles.pressed,
          ]}
          onPress={
            continueToResults
          }
        >
          <View>
            <Text
              style={
                styles.primaryButtonEyebrow
              }
            >
              {strings.findDestination.next}
            </Text>

            <Text
              style={
                styles.primaryButtonText
              }
            >
              {strings.findDestination.findDestinations}
            </Text>
          </View>

          <Ionicons
            name="arrow-forward"
            size={21}
            color={
              colors.textInverse
            }
          />
        </Pressable>
      </View>

      <View
        style={
          styles.bottomSpace
        }
      />
    </Screen>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionEyebrow}>
        {eyebrow}
      </Text>

      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text
        style={
          styles.sectionDescription
        }
      >
        {description}
      </Text>
    </View>
  );
}

function TimingChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{
        checked: selected,
      }}
      style={[
        styles.timingChoice,

        selected &&
          styles.timingChoiceSelected,
      ]}
      onPress={onPress}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[
          styles.timingChoiceText,

          selected &&
            styles.timingChoiceTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        selected,
      }}
      style={[
        styles.choiceChip,

        selected &&
          styles.choiceSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.choiceChipText,

          selected &&
            styles.choiceSelectedText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    header: {
      paddingTop: spacing[4],
      marginBottom: spacing[6],
    },

    backButton: {
      width: 42,
      height: 42,
      marginBottom: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor:
        colors.surface,
    },

    eyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.8,
      color: colors.brass,
    },

    title: {
      maxWidth: 470,
      marginTop: spacing[2],
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize: fontSize.display,
      lineHeight:
        lineHeight.display,
      color: colors.textPrimary,
    },

    subtitle: {
      maxWidth: 470,
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

    dnaCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
      marginBottom: spacing[6],
      padding: spacing[4],
      borderRadius: radius.lg,
      backgroundColor:
        colors.tealSoft,
    },

    dnaIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.surface,
    },

    dnaCopy: {
      flex: 1,
    },

    dnaTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color: colors.textPrimary,
    },

    dnaBody: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textSecondary,
    },

    form: {
      gap: spacing[5],
    },

    section: {
      gap: spacing[4],
      padding: spacing[5],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor:
        colors.surface,
      ...shadows.subtle,
    },

    sectionHeading: {
      gap: spacing[1],
    },

    sectionEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
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
      color: colors.textPrimary,
    },

    sectionDescription: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textSecondary,
    },

    segmented: {
      flexDirection: 'row',
      gap: spacing[2],
    },

    timingChoice: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[2],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      backgroundColor:
        colors.background,
    },

    timingChoiceSelected: {
      borderColor: colors.brand,
      backgroundColor:
        colors.brandSoft,
    },

    timingChoiceText: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize: fontSize.caption,
      lineHeight: 16,
      textAlign: 'center',
      color:
        colors.textSecondary,
    },

    timingChoiceTextSelected: {
      color: colors.brand,
    },

    dateFields: {
      gap: spacing[4],
    },

    flexibleFields: {
      gap: spacing[4],
    },

    field: {
      gap: spacing[2],
    },

    fieldLabel: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.2,
      color: colors.brass,
    },

    input: {
      minHeight: 54,
      paddingHorizontal:
        spacing[4],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor:
        colors.background,
      fontFamily:
        fontFamily.sansMedium,
      fontSize: fontSize.body,
      color: colors.textPrimary,
    },

    budgetRow: {
      flexDirection: 'row',
      gap: spacing[3],
    },

    budgetAmount: {
      flex: 2,
      gap: spacing[2],
    },

    budgetCurrency: {
      flex: 1,
      gap: spacing[2],
    },

    choiceGroup: {
      gap: spacing[3],
    },

    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },

    choiceChip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal:
        spacing[4],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      backgroundColor:
        colors.background,
    },

    choiceChipText: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.bodySmall,
      color: colors.textPrimary,
    },

    choiceSelected: {
      borderColor: colors.brand,
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
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor:
        colors.background,
    },

    radioOuter: {
      width: 20,
      height: 20,
      borderWidth: 1.5,
      borderColor:
        colors.textMuted,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },

    radioOuterSelected: {
      borderColor: colors.brand,
    },

    radioInner: {
      width: 10,
      height: 10,
      borderRadius: radius.pill,
      backgroundColor:
        colors.brand,
    },

    paceCopy: {
      flex: 1,
    },

    paceLabel: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color: colors.textPrimary,
    },

    paceDescription: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color:
        colors.textSecondary,
    },

    primaryButton: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal:
        spacing[5],
      paddingVertical:
        spacing[3],
      borderRadius: radius.lg,
      backgroundColor:
        colors.brand,
      ...shadows.card,
    },

    primaryButtonEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.3,
      color: '#D5B887',
    },

    primaryButtonText: {
      marginTop: 2,
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize: fontSize.body,
      color:
        colors.textInverse,
    },

    pressed: {
      opacity: 0.84,
    },

    bottomSpace: {
      height: spacing[12],
    },
  });