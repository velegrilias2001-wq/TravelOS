import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter, type Href } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import { DnaReflectionCards } from '@/features/copilot/dna-reflection-cards';
import { freeTimeAdviceKey } from '@/features/copilot/free-time-activity-copy';
import { FreeTimeAdviceCard } from '@/features/copilot/free-time-advice-card';
import { useFreeTimeAdvice } from '@/features/copilot/use-free-time-advice';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import type {
  TravelDNA,
  TravelInterest,
} from '@/domain/entities';
import {
  applyDnaReflectionProposal,
  interestFromPlanAssistActivity,
  selectDnaReflectionProposals,
  type DnaReflectionProposal,
} from '@/services/dna-reflection';
import { packingService } from '@/services/packing-service';
import { packingProgress } from '@/services/packing-progress';
import { packingTemplateSuggestions } from '@/services/packing-templates';
import {
  buildStopFromPlanAssistCandidate,
  type PlanAssistCandidate,
} from '@/services/plan-assist';
import { repositories } from '@/services/repository-registry';
import { selectTripCopilotBuildQueue } from '@/services/trip-copilot-build';
import {
  buildTripEvidencePack,
  summarizeTripEvidencePack,
} from '@/services/trip-evidence-pack';
import {
  selectTripCopilotProposals,
  type TripCopilotProposal,
} from '@/services/trip-copilot';
import { travelDNAService } from '@/services/travel-dna-runtime';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

export default function TripCopilotScreen() {
  const router = useRouter();
  const { workspace, actions } = useTripWorkspace();
  useTripWorkspaceFocusRefresh();

  const [travelDNA, setTravelDNA] = useState<TravelDNA | null>(
    null,
  );
  const [acceptedInterests, setAcceptedInterests] = useState<
    TravelInterest[]
  >([]);
  const [dismissedDnaIds, setDismissedDnaIds] = useState<
    string[]
  >([]);
  const [dnaBusyId, setDnaBusyId] = useState<string | null>(
    null,
  );
  const [pendingImportCount, setPendingImportCount] =
    useState(0);
  const [packingTotal, setPackingTotal] = useState(0);
  const [packingPacked, setPackingPacked] = useState(0);
  const [evidenceSummary, setEvidenceSummary] = useState<
    string | null
  >(null);
  const [acceptingId, setAcceptingId] = useState<
    string | null
  >(null);
  const [acceptingStarter, setAcceptingStarter] =
    useState(false);

  const freeTimeAdvice = useFreeTimeAdvice(
    workspace.trip.id,
  );

  const applyLoadedState = useCallback(
    (input: {
      dna: TravelDNA | null;
      pending: number;
      packingItems: Awaited<
        ReturnType<typeof repositories.packing.listByTripId>
      >;
    }) => {
      const progress = packingProgress(input.packingItems);
      const pack = buildTripEvidencePack({
        workspace,
        packingItems: input.packingItems,
        pendingImportClaims: input.pending,
        travelDNA: input.dna,
      });

      setTravelDNA(input.dna);
      setPendingImportCount(input.pending);
      setPackingTotal(progress.total);
      setPackingPacked(progress.packed);
      setEvidenceSummary(summarizeTripEvidencePack(pack));
    },
    [workspace],
  );

  const loadCopilotContext = useCallback(async () => {
    const [dna, batches, packingItems] = await Promise.all([
      travelDNAService.get(),
      repositories.imports.listBatches(),
      repositories.packing.listByTripId(workspace.trip.id),
    ]);

    let pending = 0;

    for (const batch of batches) {
      const claims = await repositories.imports.listClaims(
        batch.id,
      );
      pending += claims.filter(
        (claim) => claim.status === 'pending',
      ).length;
    }

    return { dna, pending, packingItems };
  }, [workspace.trip.id]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadCopilotContext();

        if (!cancelled) {
          applyLoadedState(loaded);
        }
      } catch {
        if (!cancelled) {
          setTravelDNA(null);
          setPendingImportCount(0);
          setPackingTotal(0);
          setPackingPacked(0);
          setEvidenceSummary(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadCopilotContext, applyLoadedState]);

  const interests = travelDNA?.interests ?? [];

  const proposals = useMemo(
    () =>
      selectTripCopilotProposals(workspace, {
        interests,
        pendingImportClaimCount: pendingImportCount,
        packingTotal,
        packingPacked,
      }),
    [
      workspace,
      interests,
      pendingImportCount,
      packingTotal,
      packingPacked,
    ],
  );

  const buildQueue = useMemo(
    () => selectTripCopilotBuildQueue(proposals, 3),
    [proposals],
  );

  const moreProposals = useMemo(() => {
    if (proposals.length <= buildQueue.length) {
      return [];
    }

    const buildIds = new Set(buildQueue.map((item) => item.id));
    return proposals.filter((item) => !buildIds.has(item.id));
  }, [proposals, buildQueue]);

  const dnaProposals = useMemo(
    () =>
      selectDnaReflectionProposals({
        travelDNA,
        trip: workspace.trip,
        acceptedInterests,
      }).filter(
        (proposal) => !dismissedDnaIds.includes(proposal.id),
      ),
    [
      travelDNA,
      workspace.trip,
      acceptedInterests,
      dismissedDnaIds,
    ],
  );

  const openRoute = useCallback(
    (pathname: string) => {
      if (pathname === '/import') {
        router.push('/import' as Href);
        return;
      }

      router.push({
        pathname: pathname as
          | '/trip/[tripId]/plan'
          | '/trip/[tripId]/accommodation'
          | '/trip/[tripId]/bookings'
          | '/trip/[tripId]/travelers'
          | '/trip/[tripId]/budget'
          | '/trip/[tripId]/packing'
          | '/trip/[tripId]/more',
        params: { tripId: workspace.trip.id },
      });
    },
    [router, workspace.trip.id],
  );

  const acceptCandidate = async (
    proposal: Extract<
      TripCopilotProposal,
      { kind: 'plan_assist' }
    >,
    candidate: PlanAssistCandidate,
  ) => {
    if (acceptingId) {
      return;
    }

    try {
      setAcceptingId(candidate.id);

      const dayStops = workspace.stops.filter(
        (stop) => stop.dayId === proposal.dayId,
      );

      const stop = buildStopFromPlanAssistCandidate({
        candidate,
        tripId: workspace.trip.id,
        dayId: proposal.dayId,
        order: dayStops.length + 1,
        id: Crypto.randomUUID(),
        nowIso: new Date().toISOString(),
      });

      await actions.addStop(stop);

      const interest = interestFromPlanAssistActivity(
        candidate.activityType,
      );

      if (interest) {
        setAcceptedInterests((current) =>
          current.includes(interest)
            ? current
            : [...current, interest],
        );
      }
    } catch (error) {
      Alert.alert(
        'Δεν προστέθηκε η στιγμή',
        error instanceof Error
          ? error.message
          : 'Δοκίμασε ξανά.',
      );
    } finally {
      setAcceptingId(null);
    }
  };

  const acceptStarterPacking = async () => {
    if (acceptingStarter || packingTotal > 0) {
      return;
    }

    try {
      setAcceptingStarter(true);

      const titles = packingTemplateSuggestions();

      for (const title of titles) {
        await packingService.addItem(workspace.trip.id, title);
      }

      const loaded = await loadCopilotContext();
      applyLoadedState(loaded);
    } catch (error) {
      Alert.alert(
        'Δεν φορτώθηκε η λίστα',
        error instanceof Error
          ? error.message
          : 'Δοκίμασε ξανά.',
      );
    } finally {
      setAcceptingStarter(false);
    }
  };

  const acceptDnaProposal = async (
    proposal: DnaReflectionProposal,
  ) => {
    if (dnaBusyId) {
      return;
    }

    setDnaBusyId(proposal.id);

    try {
      const next = applyDnaReflectionProposal(travelDNA, proposal);
      const saved = await travelDNAService.save(next);
      setTravelDNA(saved);
      setDismissedDnaIds((current) => [...current, proposal.id]);
    } catch (caught) {
      Alert.alert(
        'Δεν αποθηκεύτηκε',
        caught instanceof Error
          ? caught.message
          : 'Δοκίμασε ξανά.',
      );
    } finally {
      setDnaBusyId(null);
    }
  };

  const renderProposal = (
    proposal: TripCopilotProposal,
  ): ReactNode => {
    if (proposal.kind === 'readiness') {
      return (
        <View key={proposal.id} style={styles.card}>
          <Text style={styles.eyebrow}>ΕΤΟΙΜΟΤΗΤΑ</Text>
          <Text style={styles.title}>{proposal.title}</Text>
          <Text style={styles.body}>{proposal.body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${proposal.actionLabel} ${proposal.title}`}
            style={styles.primaryButton}
            onPress={() => openRoute(proposal.route)}
          >
            <Text style={styles.primaryLabel}>
              {proposal.actionLabel}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (proposal.kind === 'packing') {
      return (
        <View key={proposal.id} style={styles.card}>
          <Text style={styles.eyebrow}>ΑΠΟΣΚΕΥΕΣ</Text>
          <Text style={styles.title}>{proposal.title}</Text>
          <Text style={styles.body}>{proposal.body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Άνοιγμα αποσκευών"
            style={styles.primaryButton}
            onPress={() =>
              openRoute('/trip/[tripId]/packing')
            }
          >
            <Text style={styles.primaryLabel}>Άνοιγμα</Text>
          </Pressable>
          {packingTotal === 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Αποδοχή βασικής λίστας αποσκευών"
              disabled={acceptingStarter}
              style={styles.secondaryButton}
              onPress={() => {
                void acceptStarterPacking();
              }}
            >
              {acceptingStarter ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <Text style={styles.secondaryLabel}>
                  Αποδοχή βασικής λίστας
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      );
    }

    if (proposal.kind === 'import_review') {
      return (
        <View key={proposal.id} style={styles.card}>
          <Text style={styles.eyebrow}>ΕΙΣΑΓΩΓΗ</Text>
          <Text style={styles.title}>{proposal.title}</Text>
          <Text style={styles.body}>{proposal.body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Άνοιγμα ελέγχου εισαγωγής"
            style={styles.primaryButton}
            onPress={() => openRoute('/import')}
          >
            <Text style={styles.primaryLabel}>
              Έλεγχος claims
            </Text>
          </Pressable>
        </View>
      );
    }

    if (proposal.kind === 'plan_assist') {
      return (
        <View key={proposal.id} style={styles.card}>
          <Text style={styles.eyebrow}>
            ΒΟΗΘΕΙΑ ΠΛΑΝΟΥ · {proposal.dayLabel}
          </Text>
          <Text style={styles.title}>
            Προτάσεις για κενή μέρα
          </Text>
          <Text style={styles.body}>
            Μόνο theme στιγμές. Η αποδοχή προσθέτει πραγματικό
            stop μέσω του Plan — χωρίς εφευρεμένα venues.
          </Text>
          {proposal.candidates.map((candidate) => (
            <View
              key={candidate.id}
              style={styles.candidateRow}
            >
              <View style={styles.candidateCopy}>
                <Text style={styles.candidateTitle}>
                  {candidate.title}
                </Text>
                <Text style={styles.candidateBody}>
                  {candidate.reason}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Αποδοχή ${candidate.title}`}
                disabled={acceptingId === candidate.id}
                style={styles.acceptButton}
                onPress={() => {
                  void acceptCandidate(proposal, candidate);
                }}
              >
                {acceptingId === candidate.id ? (
                  <ActivityIndicator
                    color={colors.textInverse}
                  />
                ) : (
                  <Text style={styles.acceptLabel}>
                    Αποδοχή
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Άνοιγμα πλάνου"
            onPress={() =>
              openRoute('/trip/[tripId]/plan')
            }
          >
            <Text style={styles.link}>Άνοιγμα πλάνου</Text>
          </Pressable>
        </View>
      );
    }

    const day = workspace.days.find(
      (item) => item.id === proposal.dayId,
    );

    if (!day) {
      return null;
    }

    const adviceKey = freeTimeAdviceKey(day.id, proposal.gap);

    return (
      <View key={proposal.id}>
        <FreeTimeAdviceCard
          day={day}
          gap={proposal.gap}
          advice={freeTimeAdvice.adviceByKey[adviceKey]}
          error={freeTimeAdvice.errorByKey[adviceKey]}
          loading={freeTimeAdvice.loadingKey === adviceKey}
          onAsk={() => {
            void freeTimeAdvice.requestAdvice(day, proposal.gap);
          }}
          onOpenPlan={() =>
            openRoute('/trip/[tripId]/plan')
          }
        />
      </View>
    );
  };

  return (
    <Screen scroll>
      <UtilityScreenHeader
        eyebrow="TRIP COPILOT"
        title="Επόμενα χρήσιμα βήματα"
        subtitle="Προτάσεις από τα αποθηκευμένα facts του ταξιδιού. Τίποτα δεν γράφεται πριν την επιβεβαίωση."
        leading={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Πίσω στο More"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.textPrimary}
            />
          </Pressable>
        )}
      />

      {evidenceSummary ? (
        <View style={styles.evidenceCard}>
          <Text style={styles.eyebrow}>ΑΠΟΘΗΚΕΥΜΕΝΑ FACTS</Text>
          <Text style={styles.evidenceBody}>
            {evidenceSummary}
          </Text>
        </View>
      ) : null}

      {proposals.length === 0 ? (
        <Text style={styles.empty}>
          Το ταξίδι φαίνεται έτοιμο από όσα έχουν αποθηκευτεί.
          Άνοιξε Plan ή Companion για free-time ιδέες.
        </Text>
      ) : null}

      {buildQueue.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.sectionEyebrow}>
            BUILD · ΕΠΟΜΕΝΑ 3
          </Text>
          {buildQueue.map((proposal) => renderProposal(proposal))}
        </View>
      ) : null}

      {moreProposals.length > 0 ? (
        <View style={styles.moreList}>
          <Text style={styles.sectionEyebrow}>ΠΕΡΙΣΣΟΤΕΡΑ</Text>
          {moreProposals.map((proposal) =>
            renderProposal(proposal),
          )}
        </View>
      ) : null}

      <DnaReflectionCards
        proposals={dnaProposals}
        busyId={dnaBusyId}
        onAccept={(proposal) => {
          void acceptDnaProposal(proposal);
        }}
        onDismiss={(proposal) => {
          setDismissedDnaIds((current) => [
            ...current,
            proposal.id,
          ]);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  empty: {
    marginTop: spacing[4],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
  },
  evidenceCard: {
    marginTop: spacing[4],
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  evidenceBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textMuted,
  },
  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.teal,
  },
  list: {
    marginTop: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  moreList: {
    marginTop: spacing[2],
    gap: spacing[3],
    paddingBottom: spacing[8],
  },
  card: {
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing[2],
    ...shadows.subtle,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  primaryLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minWidth: 120,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.brand,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  candidateCopy: {
    flex: 1,
    gap: 2,
  },
  candidateTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  candidateBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  acceptButton: {
    minWidth: 72,
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.teal,
  },
  acceptLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.textInverse,
  },
  link: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.teal,
  },
});
