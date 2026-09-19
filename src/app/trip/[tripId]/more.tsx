import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import { UtilityScreenHeader } from '@/components/ui/utility-screen';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import { calculateBudgetSummary } from '@/services/budget-calculations';
import { tripDestinationLabel } from '@/services/destination-authoring';
import {
  formatCurrencyAmount,
  resolveDisplayLocale,
} from '@/services/locale-format';
import { packingProgress } from '@/services/packing-progress';
import { repositories } from '@/services/repository-registry';
import { isCanonicalDateKey } from '@/services/trip-details';
import { selectTripReadiness } from '@/services/trip-readiness';
import { shareTripSnapshot } from '@/services/trip-share-runtime';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';
import { strings } from '@/i18n';

function formatMoney(
  amount: number,
  currencyCode: string,
): string {
  try {
    return formatCurrencyAmount(amount, currencyCode);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatTripDate(value: string): string {
  if (!isCanonicalDateKey(value)) {
    return strings.more.dateNeedsReview;
  }

  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    resolveDisplayLocale(),
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { tripId, workspace } = useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const trip = workspace.trip;
  const summary = calculateBudgetSummary(
    workspace.budget,
    trip.accountingCurrency,
    workspace.fxRates,
  );
  const destinationLabel = tripDestinationLabel(trip.destinations);
  const budgetSummary = summary.hasBudgetCurrencyConflict
    ? strings.more.currencyNeedsReview
    : workspace.budget
      ? summary.plannedAmount === null
        ? strings.more.spent(
            formatMoney(
              summary.spentAmount,
              summary.accountingCurrency,
            ),
          )
        : strings.more.spentOf(
            formatMoney(
              summary.spentAmount,
              summary.accountingCurrency,
            ),
            formatMoney(
              summary.plannedAmount,
              summary.accountingCurrency,
            ),
          )
      : strings.more.setBudget(summary.accountingCurrency);

  const readinessSelection = selectTripReadiness(workspace);
  const [isSharing, setIsSharing] = useState(false);

  const open = (
    pathname:
      | '/trip/[tripId]/details'
      | '/trip/[tripId]/packing'
      | '/trip/[tripId]/copilot'
      | '/trip/[tripId]/budget'
      | '/trip/[tripId]/accommodation'
      | '/trip/[tripId]/bookings'
      | '/trip/[tripId]/plan'
      | '/trip/[tripId]/travelers'
      | '/trip/[tripId]/memories'
      | '/trip/[tripId]/travel-book',
  ) => {
    router.push({ pathname, params: { tripId } });
  };

  const shareSnapshot = () => {
    if (isSharing) {
      return;
    }

    void (async () => {
      setIsSharing(true);

      try {
        const packingItems =
          await repositories.packing.listByTripId(trip.id);
        const progress = packingProgress(packingItems);
        const result = await shareTripSnapshot({
          trip,
          days: workspace.days,
          stops: workspace.stops,
          bookings: workspace.bookings,
          accommodations: workspace.accommodations,
          packingTotal: progress.total,
          packingPacked: progress.packed,
        });

        if (result === 'saved') {
          Alert.alert(
            'Αποθηκεύτηκε στη συσκευή',
            'Το system share δεν είναι διαθέσιμο. Το μη-μυστικό snapshot γράφτηκε τοπικά.',
          );
        }
      } catch (error) {
        Alert.alert(
          'Δεν έγινε share',
          error instanceof Error
            ? error.message
            : 'Δοκίμασε ξανά.',
        );
      } finally {
        setIsSharing(false);
      }
    })();
  };

  return (
    <Screen scroll clearTabBar>
      <UtilityScreenHeader
        eyebrow={destinationLabel.toUpperCase()}
        title={strings.more.title}
        subtitle={strings.more.subtitle}
      />

      <View style={styles.tripSummary}>
        <View style={styles.tripSummaryTop}>
          <View style={styles.tripMark}>
            <Ionicons
              name="compass-outline"
              size={21}
              color={colors.brand}
            />
          </View>
          <View style={styles.tripSummaryCopy}>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            <Text style={styles.tripDates}>
              {formatTripDate(trip.startDate)} — {formatTripDate(trip.endDate)}
            </Text>
          </View>
        </View>
        <View style={styles.tripMetaRow}>
          <Text style={styles.tripMeta}>
            {strings.tripStatusLabel[trip.status]}
          </Text>
          <View style={styles.metaDot} />
          <Text style={styles.tripMeta}>{trip.accountingCurrency}</Text>
        </View>
      </View>

      <HubSection title={strings.more.sectionTrip}>
        <HubRow
          icon="create-outline"
          title={strings.more.tripDetails}
          body={strings.more.tripDetailsBody}
          onPress={() => open('/trip/[tripId]/details')}
        />
        <HubDivider />
        <HubRow
          icon="people-outline"
          title={strings.more.travelers}
          body={strings.more.travelerCount(
            workspace.travelers.length,
          )}
          onPress={() => open('/trip/[tripId]/travelers')}
        />
      </HubSection>

      <HubSection title={strings.more.sectionPlanning}>
        <HubRow
          icon="sparkles-outline"
          title={strings.more.copilot}
          body={strings.more.copilotBody}
          accent="brass"
          onPress={() => open('/trip/[tripId]/copilot')}
        />
        <HubDivider />
        <HubRow
          icon="wallet-outline"
          title={strings.more.budget}
          body={budgetSummary}
          accent="brass"
          onPress={() => open('/trip/[tripId]/budget')}
        />
        <HubDivider />
        <HubRow
          icon="bed-outline"
          title={strings.more.accommodation}
          body={strings.more.stayCount(
            workspace.accommodations.length,
          )}
          onPress={() => open('/trip/[tripId]/accommodation')}
        />
        <HubDivider />
        <HubRow
          icon="bag-handle-outline"
          title={strings.more.packing}
          body={strings.more.packingBody}
          onPress={() => open('/trip/[tripId]/packing')}
        />
        <HubDivider />
        <HubRow
          icon="share-outline"
          title={
            isSharing
              ? strings.more.sharePreparing
              : strings.more.share
          }
          body={strings.more.shareBody}
          onPress={shareSnapshot}
        />
      </HubSection>

      <HubSection title={strings.more.sectionJourney}>
        <HubRow
          icon="images-outline"
          title={strings.more.memories}
          body={strings.more.memoryCount(
            workspace.memories.length,
          )}
          accent="brass"
          onPress={() => open('/trip/[tripId]/memories')}
        />
        <HubDivider />
        <HubRow
          icon="book-outline"
          title={strings.more.travelBook}
          body={
            workspace.memories.length === 0
              ? strings.more.travelBookEmpty
              : strings.more.travelBookBody(
                  workspace.memories.length,
                )
          }
          onPress={() => open('/trip/[tripId]/travel-book')}
        />
      </HubSection>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>BEFORE YOU GO</Text>
        <View style={styles.readinessHeader}>
          <View style={styles.readinessHeaderCopy}>
            <Text style={styles.readinessTitle}>Trip readiness</Text>
            <Text style={styles.rowBody}>
              {readinessSelection.readyCount} of{' '}
              {readinessSelection.totalCheckCount} checklist items
              ready · {readinessSelection.percentReady}%
            </Text>
          </View>
          <Text
            accessibilityLabel={`${readinessSelection.percentReady} percent ready`}
            style={styles.readinessPercent}
          >
            {readinessSelection.percentReady}%
          </Text>
        </View>
        <View style={styles.groupSurface}>
          {readinessSelection.checklist.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <HubDivider /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${strings.readiness.action[item.actionLabel]} ${item.title}. ${item.body}`}
                style={({ pressed }) => [
                  styles.hubRow,
                  pressed && styles.pressed,
                ]}
                onPress={() => open(item.route)}
              >
                <View
                  style={[
                    styles.rowIcon,
                    item.ready
                      ? styles.rowIconReady
                      : styles.rowIconBrass,
                  ]}
                >
                  <Ionicons
                    name={
                      item.ready
                        ? 'checkmark'
                        : 'ellipse-outline'
                    }
                    size={19}
                    color={
                      item.ready ? colors.teal : colors.brass
                    }
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.rowBody}>
                    {item.body}
                  </Text>
                </View>
                <Text style={styles.readinessAction}>
                  {strings.readiness.action[
                    item.actionLabel
                  ].toUpperCase()}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function HubSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{title.toUpperCase()}</Text>
      <View style={styles.groupSurface}>{children}</View>
    </View>
  );
}

function HubRow({
  icon,
  title,
  body,
  accent = 'teal',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  accent?: 'teal' | 'brass';
  onPress(): void;
}) {
  const brass = accent === 'brass';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.a11y.open(title)}
      style={({ pressed }) => [
        styles.hubRow,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, brass && styles.rowIconBrass]}>
        <Ionicons
          name={icon}
          size={19}
          color={brass ? colors.brass : colors.teal}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.rowBody}>{body}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

function HubDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  tripSummary: {
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
  },
  tripSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripMark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  tripSummaryCopy: {
    flex: 1,
    marginLeft: spacing[3],
  },
  tripTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  tripDates: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripMeta: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.brass,
  },
  group: {
    marginTop: spacing[7],
  },
  groupLabel: {
    marginBottom: spacing[2],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },
  groupSurface: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  hubRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  rowIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
  },
  rowIconBrass: {
    backgroundColor: colors.brassSoft,
  },
  rowIconReady: {
    backgroundColor: colors.tealSoft,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  rowBody: {
    marginTop: 2,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    marginLeft: spacing[4] + 38 + spacing[3],
    backgroundColor: colors.border,
  },
  readinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[1],
  },
  readinessHeaderCopy: {
    flex: 1,
  },
  readinessTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  readinessPercent: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.titleSmall,
    color: colors.teal,
  },
  readinessAction: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.brass,
  },
  pressed: {
    opacity: 0.72,
  },
  bottomSpace: {
    height: spacing[16],
  },
});
