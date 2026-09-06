import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter, type Href } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
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
import { freeTimeAdviceKey } from '@/features/copilot/free-time-activity-copy';
import { FreeTimeAdviceCard } from '@/features/copilot/free-time-advice-card';
import { useFreeTimeAdvice } from '@/features/copilot/use-free-time-advice';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import type { TravelInterest } from '@/domain/entities';
import {
  buildStopFromPlanAssistCandidate,
  type PlanAssistCandidate,
} from '@/services/plan-assist';
import {
  buildTripEvidencePack,
  summarizeTripEvidencePack,
} from '@/services/trip-evidence-pack';
import { packingProgress } from '@/services/packing-progress';
import { repositories } from '@/services/repository-registry';
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

  const [interests, setInterests] = useState<
    readonly TravelInterest[]
  >([]);
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

  const freeTimeAdvice = useFreeTimeAdvice(
    workspace.trip.id,
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [dna, batches, packingItems] = await Promise.all([
          travelDNAService.get(),
          repositories.imports.listBatches(),
          repositories.packing.listByTripId(workspace.trip.id),
        ]);

        let pending = 0;

        for (const batch of batches) {
          const claims =
            await repositories.imports.listClaims(
              batch.id,
            );
          pending += claims.filter(
            (claim) => claim.status === 'pending',
          ).length;
        }

        const progress = packingProgress(packingItems);
        const pack = buildTripEvidencePack({
          workspace,
          packingItems,
          pendingImportClaims: pending,
          travelDNA: dna,
        });

        if (!cancelled) {
          setInterests(dna?.interests ?? []);
          setPendingImportCount(pending);
          setPackingTotal(progress.total);
          setPackingPacked(progress.packed);
          setEvidenceSummary(summarizeTripEvidencePack(pack));
        }
      } catch {
        if (!cancelled) {
          setInterests([]);
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
  }, [workspace]);

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
    } catch (error) {
      Alert.alert(
        'Could not add moment',
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <Screen scroll>
      <UtilityScreenHeader
        eyebrow="TRIP COPILOT"
        title="Next useful steps"
        subtitle="Suggestions from this trip’s saved facts. Nothing writes until you confirm."
        leading={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to More"
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
          <Text style={styles.eyebrow}>SAVED FACTS</Text>
          <Text style={styles.evidenceBody}>
            {evidenceSummary}
          </Text>
        </View>
      ) : null}

      {proposals.length === 0 ? (
        <Text style={styles.empty}>
          This trip looks prepared from what is saved. Open
          Plan or Companion when you need free-time ideas.
        </Text>
      ) : null}

      <View style={styles.list}>
        {proposals.map((proposal) => {
          if (proposal.kind === 'readiness') {
            return (
              <View key={proposal.id} style={styles.card}>
                <Text style={styles.eyebrow}>READINESS</Text>
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
                <Text style={styles.eyebrow}>PACKING</Text>
                <Text style={styles.title}>{proposal.title}</Text>
                <Text style={styles.body}>{proposal.body}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Packing"
                  style={styles.primaryButton}
                  onPress={() =>
                    openRoute('/trip/[tripId]/packing')
                  }
                >
                  <Text style={styles.primaryLabel}>
                    Open Packing
                  </Text>
                </Pressable>
              </View>
            );
          }

          if (proposal.kind === 'import_review') {
            return (
              <View key={proposal.id} style={styles.card}>
                <Text style={styles.eyebrow}>IMPORT</Text>
                <Text style={styles.title}>{proposal.title}</Text>
                <Text style={styles.body}>{proposal.body}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open import review"
                  style={styles.primaryButton}
                  onPress={() => openRoute('/import')}
                >
                  <Text style={styles.primaryLabel}>
                    Review claims
                  </Text>
                </Pressable>
              </View>
            );
          }

          if (proposal.kind === 'plan_assist') {
            return (
              <View key={proposal.id} style={styles.card}>
                <Text style={styles.eyebrow}>
                  PLAN ASSIST · {proposal.dayLabel}
                </Text>
                <Text style={styles.title}>
                  Empty day suggestions
                </Text>
                <Text style={styles.body}>
                  Theme moments only. Accept adds a real stop
                  through Plan’s path — no invented venues.
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
                      accessibilityLabel={`Accept ${candidate.title}`}
                      disabled={acceptingId === candidate.id}
                      style={styles.acceptButton}
                      onPress={() => {
                        void acceptCandidate(
                          proposal,
                          candidate,
                        );
                      }}
                    >
                      {acceptingId === candidate.id ? (
                        <ActivityIndicator
                          color={colors.textInverse}
                        />
                      ) : (
                        <Text style={styles.acceptLabel}>
                          Accept
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Plan"
                  onPress={() =>
                    openRoute('/trip/[tripId]/plan')
                  }
                >
                  <Text style={styles.link}>Open Plan</Text>
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

          const adviceKey = freeTimeAdviceKey(
            day.id,
            proposal.gap,
          );

          return (
            <View key={proposal.id}>
              <FreeTimeAdviceCard
                day={day}
                gap={proposal.gap}
                advice={
                  freeTimeAdvice.adviceByKey[adviceKey]
                }
                error={
                  freeTimeAdvice.errorByKey[adviceKey]
                }
                loading={
                  freeTimeAdvice.loadingKey === adviceKey
                }
                onAsk={() => {
                  void freeTimeAdvice.requestAdvice(
                    day,
                    proposal.gap,
                  );
                }}
                onOpenPlan={() =>
                  openRoute('/trip/[tripId]/plan')
                }
              />
            </View>
          );
        })}
      </View>
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
  list: {
    marginTop: spacing[4],
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
