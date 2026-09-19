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
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Screen,
} from '@/components/ui/screen';
import { BookmarkPulse } from '@/features/motion/bookmark-pulse';
import { playSelectionHaptic } from '@/features/motion/haptic';
import { RiseIn } from '@/features/motion/rise-in';
import { StaggerEnter } from '@/features/motion/stagger-enter';

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
  buildDiscoverEmbeddingDocuments,
  prepareDiscoverSemanticQuery,
  resolveSemanticDiscoverMatches,
  type DiscoverSemanticMatch,
} from '@/services/discover-semantic';

import {
  reorderSemanticHitsByIdentities,
} from '@/services/discover-rerank';

import {
  loadGroundedDiscoverCorpus,
} from '@/services/discover-corpus';

import {
  assertGroundedDiscoverExplanation,
  prepareDiscoverExplanationRequest,
} from '@/services/discover-explain';

import {
  compareDiscoverDestinations,
  type DiscoverCompareResult,
} from '@/services/discover-compare';

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
  savedPlaceService,
} from '@/services/saved-place-runtime';

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

type DiscoverExplanationState =
  | {
      status: 'loading';
    }
  | {
      status: 'ready';
      sentences: string[];
      provider: string;
      model: string;
    }
  | {
      status: 'unavailable';
    };

type SemanticLaneStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unavailable';

const INTENT_LABELS: Record<
  TripIntent,
  string
> = {
  relax: strings.tripIntent.relax,
  explore: strings.tripIntent.explore,
  food: strings.tripIntent.food,
  nature: strings.tripIntent.nature,
  event: strings.tripIntent.event,
  social: strings.tripIntent.social,
  romantic: strings.tripIntent.romantic,
  family: strings.tripParty.family,
  work_leisure: strings.tripIntent.work_leisure,
  other: strings.tripIntent.other,
};

const PACE_LABELS: Record<
  TripPace,
  string
> = {
  slow: strings.tripPace.slowLabel,
  balanced: strings.tripPace.balancedLabel,
  full: strings.tripPace.fullLabel,
};

const INTEREST_LABELS: Record<
  TravelInterest,
  string
> = {
  food: strings.tripIntent.food,
  culture: strings.travelDna.interestCulture,
  nature: strings.tripIntent.nature,
  beaches: strings.travelDna.interestBeaches,
  nightlife: strings.travelDna.interestNightlife,
  shopping: strings.travelDna.interestShopping,
  wellness: strings.travelDna.interestWellness,
  adventure: strings.travelDna.interestAdventure,
};

const PARTY_LABELS: Record<
  TypicalTravelParty,
  string
> = {
  solo: strings.tripParty.solo,
  couple: strings.tripParty.couple,
  friends: strings.tripParty.friends,
  family: strings.tripParty.family,
};

const STYLE_LABELS: Record<
  TravelStyle,
  string
> = {
  local: strings.travelDna.styleLocal,
  iconic: strings.travelDna.styleIconic,
  mix: 'Mix',
};

const BUDGET_STYLE_LABELS: Record<
  BudgetStyle,
  string
> = {
  value: strings.travelDna.budgetValue,
  comfortable: strings.travelDna.budgetComfortable,
  premium: strings.travelDna.budgetPremium,
};

const RHYTHM_LABELS: Record<
  DailyRhythm,
  string
> = {
  morning: strings.travelDna.rhythmMorning,
  flexible: strings.discoverResults.flexible,
  night: strings.travelDna.rhythmNight,
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
  ] = useState<SemanticLaneStatus>('idle');

  const [
    semanticProvenance,
    setSemanticProvenance,
  ] = useState<{
    provider: string;
    model: string;
  } | null>(null);

  const [
    explanations,
    setExplanations,
  ] = useState<
    Record<string, DiscoverExplanationState>
  >({});

  const [
    savedIdentities,
    setSavedIdentities,
  ] = useState<string[]>([]);

  const [
    compareIdentities,
    setCompareIdentities,
  ] = useState<string[]>([]);

  const [
    compareOpen,
    setCompareOpen,
  ] = useState(false);

  const [
    compareError,
    setCompareError,
  ] = useState<string | null>(null);

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

      const loadSavedIdeas =
        async () => {
          try {
            const identities =
              await savedPlaceService.savedIdentities();

            if (active) {
              setSavedIdentities(
                identities,
              );
            }
          } catch (error) {
            console.error(
              '[DiscoverResults] Saved ideas load failed:',
              error,
            );
          }
        };

      void loadTravelDNA();
      void loadSavedIdeas();

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

  const compareResult = useMemo(():
    | DiscoverCompareResult
    | null => {
    if (
      !brief ||
      !travelDNALoaded ||
      compareIdentities.length < 2
    ) {
      return null;
    }

    try {
      return compareDiscoverDestinations({
        brief,
        travelDNA: effectiveTravelDNA,
        identities: compareIdentities,
      });
    } catch {
      return null;
    }
  }, [
    brief,
    compareIdentities,
    effectiveTravelDNA,
    travelDNALoaded,
  ]);

  const toggleCompareIdentity = (
    identity: string,
  ) => {
    setCompareError(null);
    setCompareIdentities((current) => {
      if (current.includes(identity)) {
        return current.filter((id) => id !== identity);
      }

      if (current.length >= 3) {
        setCompareError(
          strings.discoverResults.compareUpToThree,
        );
        return current;
      }

      return [...current, identity];
    });
  };

  const openCompare = () => {
    if (!brief || compareIdentities.length < 2) {
      setCompareError(
        strings.discoverResults.compareSelectTwoOrThree,
      );
      return;
    }

    try {
      compareDiscoverDestinations({
        brief,
        travelDNA: effectiveTravelDNA,
        identities: compareIdentities,
      });
      setCompareError(null);
      setCompareOpen(true);
    } catch (error) {
      setCompareError(
        error instanceof Error
          ? error.message
          : strings.discoverResults.compareFailed,
      );
    }
  };

  useEffect(() => {
    if (!brief || !travelDNALoaded) {
      setSemanticMatches([]);
      setSemanticProvenance(null);
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
      setSemanticProvenance(null);
      setSemanticStatus('idle');
      return;
    }

    const controller =
      new AbortController();

    setSemanticStatus('loading');
    setSemanticMatches([]);
    setSemanticProvenance(null);

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

          let rankedHits = result.matches;
          let provenance = {
            provider: result.provider,
            model: result.model,
          };

          if (rankedHits.length > 1) {
            try {
              const documents =
                buildDiscoverEmbeddingDocuments(
                  loadGroundedDiscoverCorpus().records,
                );
              const textByIdentity = new Map(
                documents.map((document) => [
                  document.identity,
                  document.text,
                ]),
              );
              const candidates = rankedHits
                .map((hit) => {
                  const text = textByIdentity.get(
                    hit.identity,
                  );

                  if (!text) {
                    return null;
                  }

                  return {
                    identity: hit.identity,
                    text,
                  };
                })
                .filter(
                  (
                    candidate,
                  ): candidate is {
                    identity: string;
                    text: string;
                  } => candidate != null,
                );

              if (candidates.length > 1) {
                const reranked =
                  await aiAPIClient.rerankDiscoverMatches(
                    {
                      query: request.query,
                      candidates,
                    },
                    controller.signal,
                  );

                if (controller.signal.aborted) {
                  return;
                }

                rankedHits =
                  reorderSemanticHitsByIdentities(
                    rankedHits,
                    reranked.identities,
                  );
                provenance = {
                  provider: `${result.provider}+rerank`,
                  model: `${result.model} · ${reranked.model}`,
                };
              }
            } catch {
              // Fail closed: keep unreordered retrieve hits.
            }
          }

          setSemanticMatches(
            resolveSemanticDiscoverMatches(
              matches,
              rankedHits,
            ),
          );
          setSemanticProvenance(provenance);
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
          setSemanticProvenance(null);
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
            accessibilityLabel={strings.discoverShared.goBack}
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
            {strings.discoverResults.noBriefTitle}
          </Text>

          <Text
            style={styles.subtitle}
          >
            {strings.discoverResults.noBriefBody}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.discoverResults.returnToDiscover}
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
            {strings.discoverResults.returnToDiscover}
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
          strings.discoverResults.flexible
        : strings.discoverResults.open;

  const timingSource:
    DiscoverPreferenceSource =
      brief.timing
        ? 'discover_brief'
        : 'unspecified';

  const budgetLabel =
    brief.budget
      ? `${brief.budget.maximumAmount} ${brief.budget.currency}`
      : strings.discoverResults.open;

  const toggleSaved = (
    identity: string,
  ) => {
    playSelectionHaptic();
    void (async () => {
      const next =
        await savedPlaceService.toggle({
          kind: 'destination',
          groundedIdentity: identity,
        });

      setSavedIdentities(
        (current) =>
          next
            ? current.includes(identity)
              ? current
              : [...current, identity]
            : current.filter(
                (value) =>
                  value !== identity,
              ),
      );
    })();
  };

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

    const controller =
      new AbortController();

    const loadExplanation =
      async () => {
        try {
          const result =
            await aiAPIClient.explainDiscoverMatch(
              request,
              controller.signal,
            );

          if (controller.signal.aborted) {
            return;
          }

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
                provider: result.provider,
                model: result.model,
              },
            }),
          );
        } catch (error) {
          if (
            controller.signal.aborted ||
            (error instanceof Error &&
              error.name === 'AbortError')
          ) {
            return;
          }

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
          {strings.discoverResults.title}
        </Text>

        <Text style={styles.subtitle}>
          {strings.discoverResults.subtitle}
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
            {strings.discoverResults.groundedEyebrow}
          </Text>

          <Text
            style={
              styles.readyTitle
            }
          >
            {strings.discoverResults.groundedTitle}
          </Text>

          <Text
            style={
              styles.readyBody
            }
          >
            {strings.discoverResults.groundedBody}
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
          title={strings.discoverResults.bestMatches}
          description={strings.discoverResults.bestMatchesBody}
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
              <StaggerEnter
                key={
                  match.candidate.id
                }
                index={index}
              >
                <DestinationMatchCard
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
                  saved={savedIdentities.includes(
                    match.candidate.id,
                  )}
                  onToggleSaved={() =>
                    toggleSaved(
                      match.candidate.id,
                    )
                  }
                  compareSelected={compareIdentities.includes(
                    match.candidate.id,
                  )}
                  onToggleCompare={() =>
                    toggleCompareIdentity(
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
              </StaggerEnter>
            ),
          )
        )}
      </View>

      {semanticStatus ===
        'loading' ||
      semanticStatus ===
        'unavailable' ||
      semanticMatches.length >
        0 ? (
        <View
          style={
            styles.resultsSection
          }
        >
          <SectionHeading
            eyebrow="ALSO CLOSE"
            title={strings.discoverResults.semanticTitle}
            description={strings.discoverResults.semanticBody}
          />

          {semanticStatus ===
          'loading' ? (
            <View
              style={
                styles.loadingCard
              }
            >
              <ActivityIndicator
                size="small"
                color={colors.teal}
              />
              <Text
                style={
                  styles.loadingText
                }
              >
                Looking for close catalogue matches…
              </Text>
              <Text
                style={
                  styles.loadingHint
                }
              >
                {strings.discoverResults.explicitStaysAvailable}
              </Text>
            </View>
          ) : semanticStatus ===
            'unavailable' ? (
            <View
              style={
                styles.degradeCard
              }
            >
              <Text
                style={
                  styles.degradeTitle
                }
              >
                {strings.discoverResults.semanticUnavailable}
              </Text>
              <Text
                style={
                  styles.degradeBody
                }
              >
                {strings.discoverResults.semanticUnavailableBody}
              </Text>
            </View>
          ) : (
            <>
              {semanticProvenance ? (
                <Text
                  style={
                    styles.laneProvenance
                  }
                >
                  Retrieved with{' '}
                  {semanticProvenance.provider}{' '}
                  ·{' '}
                  {semanticProvenance.model}
                </Text>
              ) : null}

              {semanticMatches.map(
                (match, index) => (
                  <StaggerEnter
                    key={
                      match.candidate.id
                    }
                    index={index}
                  >
                    <DestinationMatchCard
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
                      saved={savedIdentities.includes(
                        match.candidate.id,
                      )}
                      onToggleSaved={() =>
                        toggleSaved(
                          match.candidate.id,
                        )
                      }
                      compareSelected={compareIdentities.includes(
                        match.candidate.id,
                      )}
                      onToggleCompare={() =>
                        toggleCompareIdentity(
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
                  </StaggerEnter>
                ),
              )}
            </>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeading
          eyebrow="TRIP BRIEF"
          title={strings.discoverResults.youToldTitle}
          description={strings.discoverResults.youToldBody}
        />

        <SummaryRow
          label={strings.discoverResults.timing}
          value={timingLabel}
          source={timingSource}
        />

        <SummaryRow
          label={strings.discoverResults.budget}
          value={budgetLabel}
          source={
            brief.budget
              ? 'discover_brief'
              : 'unspecified'
          }
        />

        <SummaryRow
          label={strings.discoverResults.primaryIntent}
          value={
            brief.intent
              ? INTENT_LABELS[
                  brief.intent
                ]
              : strings.discoverResults.open
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
          title={strings.discoverResults.usedTitle}
          description={strings.discoverResults.usedBody}
        />

        <SummaryRow
          label={strings.discoverResults.pace}
          value={
            personalization.pace
              .value
              ? PACE_LABELS[
                  personalization
                    .pace.value
                ]
              : strings.discoverResults.open
          }
          source={
            personalization.pace
              .source
          }
        />

        <SummaryRow
          label={strings.discoverResults.interests}
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
              : strings.discoverResults.open
          }
          source={
            personalization
              .interests.source
          }
        />

        <SummaryRow
          label={strings.discoverResults.travelParty}
          value={
            personalization.party
              .value
              ? PARTY_LABELS[
                  personalization
                    .party.value
                ]
              : strings.discoverResults.open
          }
          source={
            personalization.party
              .source
          }
        />

        <SummaryRow
          label={strings.discoverResults.travelStyle}
          value={
            personalization
              .travelStyle.value
              ? STYLE_LABELS[
                  personalization
                    .travelStyle
                    .value
                ]
              : strings.discoverResults.open
          }
          source={
            personalization
              .travelStyle.source
          }
        />

        <SummaryRow
          label={strings.discoverResults.budgetStyle}
          value={
            personalization
              .budgetStyle.value
              ? BUDGET_STYLE_LABELS[
                  personalization
                    .budgetStyle
                    .value
                ]
              : strings.discoverResults.open
          }
          source={
            personalization
              .budgetStyle.source
          }
        />

        <SummaryRow
          label={strings.discoverResults.dailyRhythm}
          value={
            personalization
              .dailyRhythm.value
              ? RHYTHM_LABELS[
                  personalization
                    .dailyRhythm
                    .value
                ]
              : strings.discoverResults.open
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
            {strings.discoverResults.controlEyebrow}
          </Text>

          <Text
            style={
              styles.nextTitle
            }
          >
            {strings.discoverResults.controlTitle}
          </Text>

          <Text
            style={
              styles.nextBody
            }
          >
            {strings.discoverResults.controlBody}
          </Text>
        </View>
      </View>

      {compareError ? (
        <Text style={styles.compareError}>
          {compareError}
        </Text>
      ) : null}

      {compareIdentities.length > 0 ? (
        <View style={styles.compareBar}>
          <Text style={styles.compareBarCopy}>
            {compareIdentities.length}/3 selected for compare
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.discoverResults.compareSelected}
            disabled={compareIdentities.length < 2}
            style={({ pressed }) => [
              styles.compareBarButton,
              compareIdentities.length < 2 &&
                styles.compareBarButtonDisabled,
              pressed && styles.destinationCardPressed,
            ]}
            onPress={openCompare}
          >
            <Text style={styles.compareBarButtonText}>
              {strings.discoverResults.compare}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={compareOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCompareOpen(false)}
      >
        <View style={styles.compareModalBackdrop}>
          <View style={styles.compareModalSheet}>
            <Text style={styles.compareModalEyebrow}>
              {strings.discoverResults.tradeoffEyebrow}
            </Text>
            <Text style={styles.compareModalTitle}>
              {strings.discoverResults.groundedOnly}
            </Text>
            <Text style={styles.compareModalBody}>
              {strings.discoverResults.tradeoffBody}
            </Text>

            {compareResult ? (
              <ScrollView
                horizontal
                style={styles.compareScroll}
              >
                <View>
                  <View style={styles.compareHeaderRow}>
                    <Text style={styles.compareDimCell}>
                      {strings.discoverResults.dimension}
                    </Text>
                    {compareResult.columns.map((column) => (
                      <Text
                        key={column.identity}
                        style={styles.comparePlaceCell}
                      >
                        {column.name}
                      </Text>
                    ))}
                  </View>
                  {compareResult.rows.length === 0 ? (
                    <Text style={styles.compareModalBody}>
                      {strings.discoverResults.noDimensions}
                    </Text>
                  ) : (
                    compareResult.rows.map((row) => (
                      <View
                        key={row.dimension}
                        style={styles.compareHeaderRow}
                      >
                        <View style={styles.compareDimCell}>
                          <Text style={styles.compareDimLabel}>
                            {row.dimension.replace('_', ' ')}
                          </Text>
                          <Text style={styles.compareDimPref}>
                            {row.preferenceLabel}
                          </Text>
                        </View>
                        {row.cells.map((cell) => (
                          <Text
                            key={`${row.dimension}-${cell.identity}`}
                            style={styles.comparePlaceCell}
                          >
                            {cell.status === 'match'
                              ? strings.discoverResults.match
                              : cell.status === 'no_match'
                                ? strings.discoverResults.noMatch
                                : strings.discoverResults.unknown}
                          </Text>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.discoverResults.closeCompare}
              style={styles.compareCloseButton}
              onPress={() => setCompareOpen(false)}
            >
              <Text style={styles.compareBarButtonText}>
                {strings.discoverResults.close}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  saved,
  compareSelected,
  onAskExplanation,
  onToggleSaved,
  onToggleCompare,
  onChoose,
}: {
  rank?: number;
  kind?: 'deterministic' | 'semantic';
  match: DiscoverMatch;
  explanation?: DiscoverExplanationState;
  saved: boolean;
  compareSelected: boolean;
  onAskExplanation(): void;
  onToggleSaved(): void;
  onToggleCompare(): void;
  onChoose(): void;
}) {
  const destination =
    match.candidate.destination;

  const isSemantic =
    kind === 'semantic';

  const explaining =
    explanation?.status === 'loading';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.discoverResults.chooseLabel(destination.name)}
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
              ? strings.discoverResults.semanticMatch
              : strings.discoverResults.matchRank(rank)}
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
            {strings.discoverResults.whyItFits}
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
          {strings.discoverResults.noOverlap}
        </Text>
      )}

      {explanation?.status ===
      'ready' ? (
        <RiseIn
          factKey={`explain:${match.candidate.id}:${explanation.provider}:${explanation.model}`}
        >
          <View
            style={
              styles.explanationBlock
            }
          >
            <View
              style={
                styles.explanationHeadingRow
              }
            >
              <Text
                style={
                  styles.reasonsEyebrow
                }
              >
                {strings.discoverResults.fromCatalogue}
              </Text>
              <Text
                style={
                  styles.explanationProvenance
                }
              >
                {explanation.provider} ·{' '}
                {explanation.model}
              </Text>
            </View>

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

            <Text
              style={
                styles.explanationGuard
              }
            >
              {strings.discoverResults.paraphraseNote}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.discoverResults.askAgainLabel(destination.name)}
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
                {strings.discoverResults.askAgain}
              </Text>
            </Pressable>
          </View>
        </RiseIn>
      ) : explanation?.status ===
        'unavailable' ? (
        <View
          style={
            styles.explanationUnavailable
          }
        >
          <Text
            style={
              styles.explanationError
            }
          >
            {strings.discoverResults.explainFailed}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.discoverResults.retryExplainLabel(destination.name)}
            onPress={onAskExplanation}
            style={
              styles.explainAskRow
            }
          >
            <Ionicons
              name="refresh-outline"
              size={16}
              color={colors.teal}
            />
            <Text
              style={
                styles.explainButtonText
              }
            >
              {strings.discoverResults.tryAgain}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.discoverResults.askWhyLabel(destination.name)}
          disabled={explaining}
          onPress={onAskExplanation}
          style={[
            styles.explainAskRow,
            explaining &&
              styles.explainAskRowDisabled,
          ]}
        >
          {explaining ? (
            <ActivityIndicator
              size="small"
              color={colors.teal}
            />
          ) : (
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={colors.teal}
            />
          )}
          <Text
            style={
              styles.explainButtonText
            }
          >
            {explaining
              ? strings.discoverResults.asking
              : strings.discoverResults.askWhyItFits}
          </Text>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          compareSelected
            ? strings.discoverResults.removeFromCompareLabel(destination.name)
            : strings.discoverResults.addToCompareLabel(destination.name)
        }
        accessibilityState={{ selected: compareSelected }}
        onPress={onToggleCompare}
        style={styles.explainButton}
      >
        <Text style={styles.explainButtonText}>
          {compareSelected
            ? strings.discoverResults.selectedForCompare
            : strings.discoverResults.addToCompare}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          saved
            ? strings.a11y.removeFromSavedNamed(destination.name)
            : strings.a11y.saveAsIdea(destination.name)
        }
        onPress={onToggleSaved}
        style={styles.explainButton}
      >
        <BookmarkPulse active={saved}>
          <View
            style={
              styles.saveIdeaRow
            }
          >
            <Ionicons
              name={
                saved
                  ? 'bookmark'
                  : 'bookmark-outline'
              }
              size={17}
              color={colors.teal}
            />
            <Text
              style={
                styles.explainButtonText
              }
            >
              {saved
                ? strings.discoverShared.removeFromSaved
                : strings.discoverShared.saveIdea}
            </Text>
          </View>
        </BookmarkPulse>
      </Pressable>

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
          {strings.discoverResults.chooseDestination}
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

    explainAskRow: {
      minHeight: 44,
      marginTop: spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },

    explainAskRowDisabled: {
      opacity: 0.7,
    },

    saveIdeaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
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

    explanationHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: spacing[3],
    },

    explanationProvenance: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color: colors.textMuted,
      flexShrink: 1,
      textAlign: 'right',
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

    explanationGuard: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color: colors.textMuted,
    },

    explanationUnavailable: {
      marginTop: spacing[3],
      gap: spacing[1],
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
      gap: spacing[2],
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
      color: colors.textSecondary,
      textAlign: 'center',
    },

    loadingHint: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color: colors.textMuted,
      textAlign: 'center',
    },

    degradeCard: {
      padding: spacing[5],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor:
        colors.surface,
      gap: spacing[2],
    },

    degradeTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize:
        fontSize.bodySmall,
      color: colors.textPrimary,
    },

    degradeBody: {
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color: colors.textMuted,
    },

    laneProvenance: {
      marginBottom: spacing[3],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color: colors.textMuted,
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

    compareError: {
      marginTop: spacing[4],
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color: colors.danger,
    },

    compareBar: {
      marginTop: spacing[5],
      padding: spacing[4],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[3],
    },

    compareBarCopy: {
      flex: 1,
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textSecondary,
    },

    compareBarButton: {
      minHeight: 44,
      paddingHorizontal: spacing[4],
      borderRadius: radius.md,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },

    compareBarButtonDisabled: {
      opacity: 0.45,
    },

    compareBarButtonText: {
      fontFamily: fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.textInverse,
    },

    compareModalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },

    compareModalSheet: {
      maxHeight: '80%',
      gap: spacing[3],
      padding: spacing[5],
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      backgroundColor: colors.background,
    },

    compareModalEyebrow: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.4,
      color: colors.brass,
    },

    compareModalTitle: {
      fontFamily: fontFamily.serifSemiBold,
      fontSize: fontSize.titleSmall,
      color: colors.textPrimary,
    },

    compareModalBody: {
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color: colors.textSecondary,
    },

    compareScroll: {
      maxHeight: 320,
    },

    compareHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
      paddingVertical: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    compareDimCell: {
      width: 120,
    },

    compareDimLabel: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      color: colors.teal,
      textTransform: 'uppercase',
    },

    compareDimPref: {
      marginTop: spacing[1],
      fontFamily: fontFamily.sansRegular,
      fontSize: fontSize.caption,
      color: colors.textSecondary,
    },

    comparePlaceCell: {
      width: 110,
      fontFamily: fontFamily.sansMedium,
      fontSize: fontSize.caption,
      color: colors.textPrimary,
    },

    compareCloseButton: {
      minHeight: 48,
      marginTop: spacing[2],
      borderRadius: radius.lg,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomSpace: {
      height: spacing[12],
    },
  });