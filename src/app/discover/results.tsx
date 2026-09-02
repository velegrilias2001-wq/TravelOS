import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Screen,
} from '@/components/ui/screen';

import type {
  BudgetStyle,
  DailyRhythm,
  DiscoverDestination,
  TravelDNA,
  TravelInterest,
  TravelStyle,
  TripIntent,
  TripPace,
  TypicalTravelParty,
} from '@/domain/entities';

import type {
  DiscoverMatch,
  DiscoverMatchReason,
} from '@/services/discover-matcher';

import {
  matchCuratedDiscoverDestinations,
} from '@/services/discover-matcher';

import type {
  DiscoverPreferenceSource,
} from '@/services/discover-personalization';

import {
  resolveDiscoverPersonalization,
} from '@/services/discover-personalization';

import {
  prepareDiscoverSemanticQuery,
  resolveSemanticDiscoverMatches,
  type DiscoverSemanticMatch,
} from '@/services/discover-semantic';

import {
  assertGroundedDiscoverExplanation,
  prepareDiscoverExplanationRequest,
} from '@/services/discover-explain';

import {
  buildDiscoverTripPrefill,
  serializeDiscoverTripPrefill,
} from '@/services/discover-trip-handoff';

import {
  aiAPIClient,
} from '@/services/ai-api-runtime';

import {
  formatCalendarDateForDisplay,
} from '@/services/time-truth';

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

const INTENT_LABELS: Record<
  TripIntent,
  string
> = {
  relax: 'Relax',
  explore: 'Explore',
  food: 'Food',
  nature: 'Nature',
  event: 'Event',
  social: 'Social',
  romantic: 'Romantic',
  family: 'Family',
  work_leisure: 'Work + Leisure',
  other: 'Other',
};

const PACE_LABELS: Record<
  TripPace,
  string
> = {
  slow: 'Slow',
  balanced: 'Balanced',
  full: 'Full',
};

const INTEREST_LABELS: Record<
  TravelInterest,
  string
> = {
  food: 'Food',
  culture: 'Culture',
  nature: 'Nature',
  beaches: 'Beaches',
  nightlife: 'Nightlife',
  shopping: 'Shopping',
  wellness: 'Wellness',
  adventure: 'Adventure',
};

const PARTY_LABELS: Record<
  TypicalTravelParty,
  string
> = {
  solo: 'Solo',
  couple: 'Couple',
  friends: 'Friends',
  family: 'Family',
};

const STYLE_LABELS: Record<
  TravelStyle,
  string
> = {
  local: 'Local',
  iconic: 'Iconic',
  mix: 'Mix',
};

const BUDGET_STYLE_LABELS: Record<
  BudgetStyle,
  string
> = {
  value: 'Value',
  comfortable: 'Comfortable',
  premium: 'Premium',
};

const RHYTHM_LABELS: Record<
  DailyRhythm,
  string
> = {
  morning: 'Morning',
  flexible: 'Flexible',
  night: 'Night',
};

function sourceLabel(
  source: DiscoverPreferenceSource,
): string {
  switch (source) {
    case 'discover_brief':
      return 'THIS TRIP';

    case 'travel_dna':
      return 'TRAVEL DNA';

    default:
      return 'OPEN';
  }
}

function displayDate(
  value: string,
): string {
  return formatCalendarDateForDisplay(
    value,
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
    value,
  );
}

function reasonLabel(
  reason: DiscoverMatchReason,
): string {
  const value =
    reason.matchedValues[0];

  switch (reason.dimension) {
    case 'intent':
      return INTENT_LABELS[
        value as TripIntent
      ];

    case 'interests':
      return reason.matchedValues
        .map(
          (interest) =>
            INTEREST_LABELS[
              interest as TravelInterest
            ],
        )
        .join(', ');

    case 'pace':
      return `${
        PACE_LABELS[
          value as TripPace
        ]
      } pace`;

    case 'party':
      return PARTY_LABELS[
        value as TypicalTravelParty
      ];

    case 'travel_style':
      return `${
        STYLE_LABELS[
          value as TravelStyle
        ]
      } style`;

    case 'budget_style':
      return `${
        BUDGET_STYLE_LABELS[
          value as BudgetStyle
        ]
      } budget style`;

    case 'daily_rhythm':
      return `${
        RHYTHM_LABELS[
          value as DailyRhythm
        ]
      } rhythm`;
  }
}

export default function DiscoverResultsScreen() {
  const router = useRouter();

  const brief =
    useDiscoverStore(
      (state) => state.brief,
    );

  const [
    travelDNA,
    setTravelDNA,
  ] =
    useState<TravelDNA | null>(
      null,
    );

  const [
    travelDNALoaded,
    setTravelDNALoaded,
  ] =
    useState(false);

  const [
    semanticMatches,
    setSemanticMatches,
  ] =
    useState<
      DiscoverSemanticMatch[]
    >([]);

  const [
    semanticStatus,
    setSemanticStatus,
  ] = useState<
    | 'idle'
    | 'loading'
    | 'ready'
    | 'unavailable'
  >('idle');

  const [
    explanations,
    setExplanations,
  ] = useState<
    Record<
      string,
      | {
          status: 'loading';
        }
      | {
          status: 'ready';
          sentences: string[];
        }
      | {
          status: 'unavailable';
        }
    >
  >({});

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
              setTravelDNALoaded(
                true,
              );
            }
          } catch (error) {
            console.error(
              '[DiscoverResults] Travel DNA load failed:',
              error,
            );

            if (active) {
              setTravelDNA(null);
              setTravelDNALoaded(
                true,
              );
            }
          }
        };

      void loadTravelDNA();

      return () => {
        active = false;
      };
    }, []),
  );

  const effectiveTravelDNA =
    travelDNALoaded
      ? travelDNA
      : null;

  const matches = useMemo(
    () => {
      if (!brief || !travelDNALoaded) {
        return [];
      }

      return matchCuratedDiscoverDestinations(
        brief,
        effectiveTravelDNA,
      );
    },
    [
      brief,
      effectiveTravelDNA,
      travelDNALoaded,
    ],
  );

  useEffect(() => {
    if (!brief || !travelDNALoaded) {
      setSemanticMatches([]);
      setSemanticStatus('idle');
      return;
    }

    const request =
      prepareDiscoverSemanticQuery(
        brief,
        effectiveTravelDNA,
      );

    if (!request) {
      setSemanticMatches([]);
      setSemanticStatus('idle');
      return;
    }

    const controller =
      new AbortController();

    setSemanticStatus('loading');
    setSemanticMatches([]);

    const loadSemanticMatches =
      async () => {
        try {
          const result =
            await aiAPIClient.retrieveDiscoverMatches(
              request,
              controller.signal,
            );

          if (controller.signal.aborted) {
            return;
          }

          setSemanticMatches(
            resolveSemanticDiscoverMatches(
              matches,
              result.matches,
            ),
          );
          setSemanticStatus('ready');
        } catch (error) {
          if (
            controller.signal.aborted ||
            (error instanceof Error &&
              error.name ===
                'AbortError')
          ) {
            return;
          }

          setSemanticMatches([]);
          setSemanticStatus(
            'unavailable',
          );
        }
      };

    void loadSemanticMatches();

    return () => {
      controller.abort();
    };
  }, [
    brief,
    effectiveTravelDNA,
    matches,
    travelDNALoaded,
  ]);

  if (!brief) {
    return (
      <Screen scroll>
        <View style={styles.header}>
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
              size={20}
              color={colors.brand}
            />
          </Pressable>

          <Text
            style={styles.eyebrow}
          >
            DISCOVER
          </Text>

          <Text style={styles.title}>
            No trip brief yet
          </Text>

          <Text
            style={styles.subtitle}
          >
            Go back and tell TravelOS what kind of trip you are looking for.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to Discover"
          style={
            styles.primaryButton
          }
          onPress={() =>
            router.replace(
              '/discover',
            )
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Return to Discover
          </Text>
        </Pressable>
      </Screen>
    );
  }

  const personalization =
    resolveDiscoverPersonalization(
      brief,
      effectiveTravelDNA,
    );

  const visibleMatches =
    matches.slice(0, 5);

  const timingLabel =
    brief.timing?.kind === 'exact'
      ? `${displayDate(
          brief.timing.startDate,
        )} – ${displayDate(
          brief.timing.endDate,
        )}`
      : brief.timing?.kind ===
          'flexible'
        ? [
            brief.timing
              .earliestStartDate
              ? `From ${displayDate(
                  brief.timing
                    .earliestStartDate,
                )}`
              : null,

            brief.timing
              .latestEndDate
              ? `Until ${displayDate(
                  brief.timing
                    .latestEndDate,
                )}`
              : null,

            brief.timing
              .tripLengthDays
              ? `${brief.timing.tripLengthDays} days`
              : null,
          ]
            .filter(Boolean)
            .join(' · ') ||
          'Flexible'
        : 'Open';

  const timingSource:
    DiscoverPreferenceSource =
      brief.timing
        ? 'discover_brief'
        : 'unspecified';

  const budgetLabel =
    brief.budget
      ? `${brief.budget.maximumAmount} ${brief.budget.currency}`
      : 'Open';

  const chooseDestination = (
    destination: DiscoverDestination,
  ) => {
    const prefill =
      buildDiscoverTripPrefill(
        brief,
        destination,
      );

    const params =
      serializeDiscoverTripPrefill(
        prefill,
      );

    router.push({
      pathname: '/new-trip',
      params,
    });
  };

  const askExplanation = (
    identity: string,
  ) => {
    const request =
      prepareDiscoverExplanationRequest(
        brief,
        effectiveTravelDNA,
        identity,
      );

    if (!request) {
      setExplanations(
        (current) => ({
          ...current,
          [identity]: {
            status: 'unavailable',
          },
        }),
      );
      return;
    }

    setExplanations((current) => ({
      ...current,
      [identity]: {
        status: 'loading',
      },
    }));

    const loadExplanation =
      async () => {
        try {
          const result =
            await aiAPIClient.explainDiscoverMatch(
              request,
            );

          const sentences =
            assertGroundedDiscoverExplanation(
              {
                identity:
                  result.identity,
                sentences:
                  result.sentences,
              },
              request,
            );

          setExplanations(
            (current) => ({
              ...current,
              [identity]: {
                status: 'ready',
                sentences,
              },
            }),
          );
        } catch {
          setExplanations(
            (current) => ({
              ...current,
              [identity]: {
                status: 'unavailable',
              },
            }),
          );
        }
      };

    void loadExplanation();
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
          Places that fit
        </Text>

        <Text style={styles.subtitle}>
          Real destinations ranked against the preferences TravelOS knows for this trip.
        </Text>
      </View>

      <View style={styles.readyCard}>
        <View style={styles.readyIcon}>
          <Ionicons
            name="checkmark"
            size={22}
            color={colors.teal}
          />
        </View>

        <View style={styles.readyCopy}>
          <Text
            style={
              styles.readyEyebrow
            }
          >
            GROUNDED RESULTS
          </Text>

          <Text
            style={
              styles.readyTitle
            }
          >
            Ranked from real destination candidates
          </Text>

          <Text
            style={
              styles.readyBody
            }
          >
            These destinations come from the curated TravelOS catalogue. Explicit preference matching stays first. Semantic matches, when available, can only add other grounded catalogue places.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.resultsSection
        }
      >
        <SectionHeading
          eyebrow="DESTINATIONS"
          title="Your best matches"
          description="Choose any destination to carry it into New Trip. Nothing is created until you confirm it there."
        />

        {!travelDNALoaded ? (
          <View
            style={
              styles.loadingCard
            }
          >
            <Text
              style={
                styles.loadingText
              }
            >
              Preparing destination matches…
            </Text>
          </View>
        ) : (
          visibleMatches.map(
            (
              match,
              index,
            ) => (
              <DestinationMatchCard
                key={
                  match.candidate.id
                }
                rank={index + 1}
                match={match}
                explanation={
                  explanations[
                    match.candidate.id
                  ]
                }
                onAskExplanation={() =>
                  askExplanation(
                    match.candidate.id,
                  )
                }
                onChoose={() =>
                  chooseDestination(
                    match.candidate
                      .destination,
                  )
                }
              />
            ),
          )
        )}
      </View>

      {semanticStatus ===
        'loading' ||
      semanticMatches.length >
        0 ? (
        <View
          style={
            styles.resultsSection
          }
        >
          <SectionHeading
            eyebrow="ALSO CLOSE"
            title="Semantic matches"
            description="Grounded catalogue destinations that are close to this trip brief in meaning. TravelOS did not invent these places."
          />

          {semanticStatus ===
          'loading' ? (
            <View
              style={
                styles.loadingCard
              }
            >
              <Text
                style={
                  styles.loadingText
                }
              >
                Looking for close catalogue matches…
              </Text>
            </View>
          ) : (
            semanticMatches.map(
              (match) => (
                <DestinationMatchCard
                  key={
                    match.candidate.id
                  }
                  kind="semantic"
                  match={{
                    candidate:
                      match.candidate,
                    score:
                      match.score,
                    reasons: [],
                  }}
                  explanation={
                    explanations[
                      match.candidate.id
                    ]
                  }
                  onAskExplanation={() =>
                    askExplanation(
                      match.candidate.id,
                    )
                  }
                  onChoose={() =>
                    chooseDestination(
                      match.candidate
                        .destination,
                    )
                  }
                />
              ),
            )
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeading
          eyebrow="TRIP BRIEF"
          title="What you told TravelOS"
          description="These are explicit choices for this specific trip."
        />

        <SummaryRow
          label="Timing"
          value={timingLabel}
          source={timingSource}
        />

        <SummaryRow
          label="Budget"
          value={budgetLabel}
          source={
            brief.budget
              ? 'discover_brief'
              : 'unspecified'
          }
        />

        <SummaryRow
          label="Primary intent"
          value={
            brief.intent
              ? INTENT_LABELS[
                  brief.intent
                ]
              : 'Open'
          }
          source={
            brief.intent
              ? 'discover_brief'
              : 'unspecified'
          }
        />
      </View>

      <View style={styles.section}>
        <SectionHeading
          eyebrow="PERSONALIZATION"
          title="What TravelOS used"
          description="Trip-specific choices take priority. Travel DNA fills only gaps where you already saved a preference."
        />

        <SummaryRow
          label="Pace"
          value={
            personalization.pace
              .value
              ? PACE_LABELS[
                  personalization
                    .pace.value
                ]
              : 'Open'
          }
          source={
            personalization.pace
              .source
          }
        />

        <SummaryRow
          label="Interests"
          value={
            personalization
              .interests.values
              .length > 0
              ? personalization
                  .interests.values
                  .map(
                    (interest) =>
                      INTEREST_LABELS[
                        interest
                      ],
                  )
                  .join(', ')
              : 'Open'
          }
          source={
            personalization
              .interests.source
          }
        />

        <SummaryRow
          label="Travel party"
          value={
            personalization.party
              .value
              ? PARTY_LABELS[
                  personalization
                    .party.value
                ]
              : 'Open'
          }
          source={
            personalization.party
              .source
          }
        />

        <SummaryRow
          label="Travel style"
          value={
            personalization
              .travelStyle.value
              ? STYLE_LABELS[
                  personalization
                    .travelStyle
                    .value
                ]
              : 'Open'
          }
          source={
            personalization
              .travelStyle.source
          }
        />

        <SummaryRow
          label="Budget style"
          value={
            personalization
              .budgetStyle.value
              ? BUDGET_STYLE_LABELS[
                  personalization
                    .budgetStyle
                    .value
                ]
              : 'Open'
          }
          source={
            personalization
              .budgetStyle.source
          }
        />

        <SummaryRow
          label="Daily rhythm"
          value={
            personalization
              .dailyRhythm.value
              ? RHYTHM_LABELS[
                  personalization
                    .dailyRhythm
                    .value
                ]
              : 'Open'
          }
          source={
            personalization
              .dailyRhythm.source
          }
        />
      </View>

      <View style={styles.nextCard}>
        <View style={styles.nextIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={colors.brass}
          />
        </View>

        <View style={styles.nextCopy}>
          <Text
            style={
              styles.nextEyebrow
            }
          >
            CONTROL
          </Text>

          <Text
            style={
              styles.nextTitle
            }
          >
            You stay in control
          </Text>

          <Text
            style={
              styles.nextBody
            }
          >
            Choosing a destination only prepares New Trip. TravelOS will not save anything until you explicitly create the trip.
          </Text>
        </View>
      </View>

      <View
        style={styles.bottomSpace}
      />
    </Screen>
  );
}

function DestinationMatchCard({
  rank,
  kind = 'deterministic',
  match,
  explanation,
  onAskExplanation,
  onChoose,
}: {
  rank?: number;
  kind?: 'deterministic' | 'semantic';
  match: DiscoverMatch;
  explanation?:
    | {
        status: 'loading';
      }
    | {
        status: 'ready';
        sentences: string[];
      }
    | {
        status: 'unavailable';
      };
  onAskExplanation(): void;
  onChoose(): void;
}) {
  const destination =
    match.candidate.destination;

  const isSemantic =
    kind === 'semantic';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose ${destination.name}`}
      onPress={onChoose}
      style={({ pressed }) => [
        styles.destinationCard,
        pressed &&
          styles.destinationCardPressed,
      ]}
    >
      <View
        style={
          styles.destinationTopRow
        }
      >
        <View style={styles.destinationCopy}>
          <Text
            style={
              styles.rankLabel
            }
          >
            {isSemantic
              ? 'SEMANTIC MATCH'
              : `MATCH #${rank}`}
          </Text>

          <Text
            style={
              styles.destinationName
            }
          >
            {destination.name}
          </Text>

          {destination.countryCode ? (
            <Text
              style={
                styles.destinationCountry
              }
            >
              {destination.countryCode}
            </Text>
          ) : null}
        </View>

        <View
          style={
            styles.destinationIcon
          }
        >
          <Ionicons
            name="location-outline"
            size={21}
            color={
              isSemantic
                ? colors.brass
                : colors.teal
            }
          />
        </View>
      </View>

      {isSemantic ? (
        <Text
          style={
            styles.noReasonText
          }
        >
          Close to this trip brief. This is a grounded catalogue destination, not an AI-invented place.
        </Text>
      ) : match.reasons.length > 0 ? (
        <View
          style={
            styles.reasonsBlock
          }
        >
          <Text
            style={
              styles.reasonsEyebrow
            }
          >
            WHY IT FITS
          </Text>

          <View
            style={
              styles.reasonList
            }
          >
            {match.reasons.map(
              (
                reason,
                index,
              ) => (
                <View
                  key={`${reason.dimension}-${index}`}
                  style={
                    styles.reasonRow
                  }
                >
                  <View
                    style={
                      styles.reasonDot
                    }
                  />

                  <Text
                    style={
                      styles.reasonText
                    }
                  >
                    {reasonLabel(
                      reason,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.reasonSource
                    }
                  >
                    {sourceLabel(
                      reason.source,
                    )}
                  </Text>
                </View>
              ),
            )}
          </View>
        </View>
      ) : (
        <Text
          style={
            styles.noReasonText
          }
        >
          No explicit preference overlap yet. Add more trip preferences to refine the ranking.
        </Text>
      )}

      {explanation?.status ===
      'ready' ? (
        <View
          style={
            styles.explanationBlock
          }
        >
          <Text
            style={
              styles.reasonsEyebrow
            }
          >
            FROM THE CATALOGUE
          </Text>

          {explanation.sentences.map(
            (sentence) => (
              <Text
                key={sentence}
                style={
                  styles.explanationText
                }
              >
                {sentence}
              </Text>
            ),
          )}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ask TravelOS why ${destination.name} fits`}
          disabled={
            explanation?.status ===
            'loading'
          }
          onPress={onAskExplanation}
          style={
            styles.explainButton
          }
        >
          <Text
            style={
              styles.explainButtonText
            }
          >
            {explanation?.status ===
            'loading'
              ? 'Asking TravelOS…'
              : 'Ask TravelOS why it fits'}
          </Text>
        </Pressable>
      )}

      {explanation?.status ===
      'unavailable' ? (
        <Text
          style={
            styles.explanationError
          }
        >
          TravelOS could not explain this from the catalogue. Nothing was saved.
        </Text>
      ) : null}

      <View
        style={
          styles.chooseRow
        }
      >
        <Text
          style={
            styles.chooseText
          }
        >
          Choose destination
        </Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color={colors.brand}
        />
      </View>
    </Pressable>
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
        {eyebrow}
      </Text>

      <Text
        style={
          styles.sectionTitle
        }
      >
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

function SummaryRow({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source: DiscoverPreferenceSource;
}) {
  return (
    <View
      style={styles.summaryRow}
    >
      <View
        style={styles.summaryCopy}
      >
        <Text
          style={
            styles.summaryLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.summaryValue
          }
        >
          {value}
        </Text>
      </View>

      <View
        style={[
          styles.sourcePill,

          source ===
            'discover_brief' &&
            styles.sourceTrip,

          source ===
            'travel_dna' &&
            styles.sourceDNA,

          source ===
            'unspecified' &&
            styles.sourceOpen,
        ]}
      >
        <Text
          style={[
            styles.sourceText,

            source ===
              'discover_brief' &&
              styles.sourceTripText,

            source ===
              'travel_dna' &&
              styles.sourceDNAText,
          ]}
        >
          {sourceLabel(source)}
        </Text>
      </View>
    </View>
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

    readyCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[4],
      marginBottom: spacing[5],
      padding: spacing[5],
      borderRadius: radius.lg,
      backgroundColor:
        colors.tealSoft,
    },

    readyIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor:
        colors.surface,
    },

    readyCopy: {
      flex: 1,
    },

    readyEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.2,
      color: colors.teal,
    },

    readyTitle: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.titleSmall,
      lineHeight:
        lineHeight.titleSmall,
      color:
        colors.textPrimary,
    },

    readyBody: {
      marginTop: spacing[2],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textSecondary,
    },

    resultsSection: {
      gap: spacing[3],
      marginBottom: spacing[5],
    },

    destinationCard: {
      padding: spacing[5],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor:
        colors.surface,
      ...shadows.subtle,
    },

    destinationCardPressed: {
      opacity: 0.88,
    },

    destinationTopRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-start',
      gap: spacing[4],
    },

    destinationCopy: {
      flex: 1,
    },

    rankLabel: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.3,
      color: colors.brass,
    },

    destinationName: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.titleSmall,
      lineHeight:
        lineHeight.titleSmall,
      color:
        colors.textPrimary,
    },

    destinationCountry: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textMuted,
    },

    destinationIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor:
        colors.tealSoft,
    },

    reasonsBlock: {
      marginTop: spacing[4],
      paddingTop: spacing[4],
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    reasonsEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.2,
      color:
        colors.textMuted,
    },

    reasonList: {
      gap: spacing[2],
      marginTop: spacing[3],
    },

    reasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },

    reasonDot: {
      width: 5,
      height: 5,
      borderRadius: 999,
      backgroundColor:
        colors.teal,
    },

    reasonText: {
      flex: 1,
      fontFamily:
        fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color:
        colors.textSecondary,
    },

    reasonSource: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.7,
      color: colors.brass,
    },

    noReasonText: {
      marginTop: spacing[4],
      paddingTop: spacing[4],
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color: colors.textMuted,
    },

    chooseRow: {
      minHeight: 44,
      marginTop: spacing[4],
      paddingTop: spacing[3],
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: spacing[3],
    },

    chooseText: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color: colors.brand,
    },

    explainButton: {
      minHeight: 44,
      marginTop: spacing[3],
      alignItems: 'flex-start',
      justifyContent: 'center',
    },

    explainButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize: fontSize.caption,
      color: colors.teal,
    },

    explanationBlock: {
      marginTop: spacing[4],
      paddingTop: spacing[4],
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      gap: spacing[2],
    },

    explanationText: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textSecondary,
    },

    explanationError: {
      marginTop: spacing[2],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color: colors.textMuted,
    },

    loadingCard: {
      minHeight: 90,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[5],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor:
        colors.surface,
    },

    loadingText: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textSecondary,
    },

    section: {
      gap: spacing[3],
      marginBottom: spacing[5],
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
      marginBottom: spacing[1],
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
      color:
        colors.textPrimary,
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

    summaryRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: spacing[3],
      paddingVertical:
        spacing[3],
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    summaryCopy: {
      flex: 1,
    },

    summaryLabel: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color:
        colors.textSecondary,
    },

    summaryValue: {
      marginTop: 3,
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textPrimary,
    },

    sourcePill: {
      paddingHorizontal:
        spacing[2],
      paddingVertical:
        spacing[1],
      borderRadius: radius.pill,
    },

    sourceTrip: {
      backgroundColor:
        colors.tealSoft,
    },

    sourceDNA: {
      backgroundColor:
        colors.brassSoft,
    },

    sourceOpen: {
      backgroundColor:
        colors.backgroundSoft,
    },

    sourceText: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 0.8,
      color:
        colors.textMuted,
    },

    sourceTripText: {
      color: colors.teal,
    },

    sourceDNAText: {
      color: colors.brass,
    },

    nextCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[4],
      padding: spacing[5],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor:
        colors.backgroundSoft,
    },

    nextIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor:
        colors.surface,
    },

    nextCopy: {
      flex: 1,
    },

    nextEyebrow: {
      fontFamily:
        fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.2,
      color: colors.brass,
    },

    nextTitle: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize:
        fontSize.titleSmall,
      lineHeight:
        lineHeight.titleSmall,
      color:
        colors.textPrimary,
    },

    nextBody: {
      marginTop: spacing[2],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color:
        colors.textSecondary,
    },

    primaryButton: {
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal:
        spacing[5],
      borderRadius: radius.md,
      backgroundColor:
        colors.brand,
    },

    primaryButtonText: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textInverse,
    },

    bottomSpace: {
      height: spacing[12],
    },
  });