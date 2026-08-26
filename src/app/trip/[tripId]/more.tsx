import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
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
import { isCanonicalDateKey } from '@/services/trip-details';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

function formatMoney(
  amount: number,
  currencyCode: string,
): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatTripDate(value: string): string {
  if (!isCanonicalDateKey(value)) {
    return 'Date needs review';
  }

  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    'en-GB',
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
  );
  const destinationLabel = tripDestinationLabel(trip.destinations);
  const budgetSummary = summary.hasBudgetCurrencyConflict
    ? 'Budget currency needs review'
    : workspace.budget
      ? `${formatMoney(summary.spentAmount, summary.accountingCurrency)} spent${
          summary.plannedAmount === null
            ? ''
            : ` of ${formatMoney(
                summary.plannedAmount,
                summary.accountingCurrency,
              )}`
        }`
      : `Set a budget in ${summary.accountingCurrency}`;

  const open = (
    pathname:
      | '/trip/[tripId]/details'
      | '/trip/[tripId]/budget'
      | '/trip/[tripId]/accommodation'
      | '/trip/[tripId]/travelers'
      | '/trip/[tripId]/memories'
      | '/trip/[tripId]/travel-book',
  ) => {
    router.push({ pathname, params: { tripId } });
  };

  return (
    <Screen scroll>
      <UtilityScreenHeader
        eyebrow={destinationLabel.toUpperCase()}
        title="Trip hub"
        subtitle="Details and tools for this journey."
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
            {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
          </Text>
          <View style={styles.metaDot} />
          <Text style={styles.tripMeta}>{trip.accountingCurrency}</Text>
        </View>
      </View>

      <HubSection title="Trip">
        <HubRow
          icon="create-outline"
          title="Trip details"
          body="Dates, destination, status and currency"
          onPress={() => open('/trip/[tripId]/details')}
        />
        <HubDivider />
        <HubRow
          icon="people-outline"
          title="Travelers"
          body={`${workspace.travelers.length} ${
            workspace.travelers.length === 1 ? 'traveler' : 'travelers'
          }`}
          onPress={() => open('/trip/[tripId]/travelers')}
        />
      </HubSection>

      <HubSection title="Planning">
        <HubRow
          icon="wallet-outline"
          title="Budget & expenses"
          body={budgetSummary}
          accent="brass"
          onPress={() => open('/trip/[tripId]/budget')}
        />
        <HubDivider />
        <HubRow
          icon="bed-outline"
          title="Accommodation"
          body={`${workspace.accommodations.length} ${
            workspace.accommodations.length === 1 ? 'stay' : 'stays'
          }`}
          onPress={() => open('/trip/[tripId]/accommodation')}
        />
      </HubSection>

      <HubSection title="Your journey">
        <HubRow
          icon="images-outline"
          title="Memories"
          body={`${workspace.memories.length} ${
            workspace.memories.length === 1 ? 'moment saved' : 'moments saved'
          }`}
          accent="brass"
          onPress={() => open('/trip/[tripId]/memories')}
        />
        <HubDivider />
        <HubRow
          icon="book-outline"
          title="Travel Book"
          body={
            workspace.memories.length === 0
              ? 'Add memories first, then shape the story of this trip'
              : `Shape ${workspace.memories.length} ${
                  workspace.memories.length === 1 ? 'saved moment' : 'saved moments'
                } into your trip story`
          }
          onPress={() => open('/trip/[tripId]/travel-book')}
        />
      </HubSection>

      <View style={styles.plannedSection}>
        <Text style={styles.groupLabel}>COMING LATER</Text>
        <View style={styles.plannedRow}>
          <View style={styles.plannedIcon}>
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={colors.textMuted}
            />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.plannedTitle}>Trip readiness</Text>
            <Text style={styles.rowBody}>
              A focused pre-departure checklist
            </Text>
          </View>
          <Text style={styles.plannedBadge}>PLANNED</Text>
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
      accessibilityLabel={`Open ${title}`}
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
  plannedSection: {
    marginTop: spacing[7],
  },
  plannedRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
  },
  plannedIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundSoft,
  },
  plannedTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textSecondary,
  },
  plannedBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.brassSoft,
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: colors.brass,
  },
  pressed: {
    opacity: 0.72,
  },
  bottomSpace: {
    height: spacing[16],
  },
});
