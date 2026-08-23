import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import {
  useTripWorkspace,
  useTripWorkspaceFocusRefresh,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  calculateBudgetSummary,
} from '@/services/budget-calculations';
import {
  isCanonicalDateKey,
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

  const [year, month, day] = value
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
  ).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MoreScreen() {
  const router = useRouter();
  const { tripId, workspace } =
    useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const trip = workspace.trip;
  const summary = calculateBudgetSummary(
    workspace.budget,
    trip.accountingCurrency,
  );

  const destinationLabel =
    trip.destinations.length === 0
      ? 'Destination not set'
      : trip.destinations.length === 1
        ? trip.destinations[0].name
        : `${trip.destinations[0].name} +${trip.destinations.length - 1} more`;

  const mappedStopCount =
    workspace.stops.filter(
      (stop) =>
        stop.location?.latitude !==
          undefined &&
        stop.location?.longitude !==
          undefined,
    ).length;

  const budgetSummary = summary.hasBudgetCurrencyConflict
    ? `Saved budget currency needs review before ${summary.accountingCurrency} totals can be trusted`
    : workspace.budget
      ? `${formatMoney(
          summary.spentAmount,
          summary.accountingCurrency,
        )} spent${
          summary.plannedAmount === null
            ? ' · planned amount not set'
            : ` of ${formatMoney(
                summary.plannedAmount,
                summary.accountingCurrency,
              )}`
        }`
      : `Plan and track spending in ${summary.accountingCurrency}`;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          {destinationLabel.toUpperCase()}
        </Text>
        <Text style={styles.title}>
          More
        </Text>
        <Text style={styles.subtitle}>
          The practical heart of {trip.title}—facts, money and the tools that keep the journey together.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Trip Details"
        style={({ pressed }) => [
          styles.tripCard,
          pressed && styles.pressed,
        ]}
        onPress={() => {
          router.push({
            pathname: '/trip/[tripId]/details',
            params: { tripId },
          });
        }}
      >
        <View style={styles.tripCardTop}>
          <View style={styles.tripIcon}>
            <Ionicons
              name="compass-outline"
              size={25}
              color={colors.brand}
            />
          </View>
          <View style={styles.arrowButton}>
            <Ionicons
              name="arrow-forward"
              size={19}
              color={colors.brand}
            />
          </View>
        </View>

        <Text style={styles.cardEyebrow}>
          CANONICAL TRIP
        </Text>
        <Text style={styles.tripCardTitle}>
          Trip Details
        </Text>
        <Text style={styles.tripCardBody}>
          {trip.title}
        </Text>

        <View style={styles.tripFacts}>
          <View style={styles.tripFact}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.teal}
            />
            <Text style={styles.tripFactText}>
              {formatTripDate(trip.startDate)} — {formatTripDate(trip.endDate)}
            </Text>
          </View>
          <View style={styles.tripFact}>
            <Ionicons
              name="flag-outline"
              size={16}
              color={colors.teal}
            />
            <Text style={styles.tripFactText}>
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)} · {trip.accountingCurrency}
            </Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open trip budget"
        style={({ pressed }) => [
          styles.walletCard,
          pressed && styles.pressed,
        ]}
        onPress={() => {
          router.push({
            pathname: '/trip/[tripId]/budget',
            params: { tripId },
          });
        }}
      >
        <View style={styles.walletTopRow}>
          <View style={styles.walletIcon}>
            <Ionicons
              name="wallet-outline"
              size={24}
              color={colors.brass}
            />
          </View>
          <View style={styles.walletArrow}>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.textInverse}
            />
          </View>
        </View>

        <Text style={styles.walletEyebrow}>
          TRIP MONEY
        </Text>
        <Text style={styles.walletTitle}>
          Budget & expenses
        </Text>
        <Text style={styles.walletBody}>
          {budgetSummary}
        </Text>

        {summary.foreignCurrencyExpenses.length > 0 && (
          <View style={styles.walletNote}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={colors.brass}
            />
            <Text style={styles.walletNoteText}>
              {summary.foreignCurrencyExpenses.length} foreign-currency {summary.foreignCurrencyExpenses.length === 1 ? 'expense is' : 'expenses are'} kept separate.
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>
          WORK WITH THE TRIP
        </Text>
        <Text style={styles.sectionTitle}>
          Organize
        </Text>
      </View>

      <View style={styles.toolGrid}>
        <ToolCard
          icon="calendar-outline"
          title="Itinerary"
          body={`${workspace.days.length} ${workspace.days.length === 1 ? 'day' : 'days'} · ${workspace.stops.length} ${workspace.stops.length === 1 ? 'stop' : 'stops'}`}
          onPress={() => {
            router.push({
              pathname: '/trip/[tripId]/plan',
              params: { tripId },
            });
          }}
        />
        <ToolCard
          icon="briefcase-outline"
          title="Bookings"
          body={`${workspace.bookings.length} saved ${workspace.bookings.length === 1 ? 'booking' : 'bookings'}`}
          onPress={() => {
            router.push({
              pathname: '/trip/[tripId]/bookings',
              params: { tripId },
            });
          }}
        />
        <ToolCard
          icon="map-outline"
          title="Trip map"
          body={`${mappedStopCount} mapped ${mappedStopCount === 1 ? 'stop' : 'stops'}`}
          onPress={() => {
            router.push({
              pathname: '/trip/[tripId]/map',
              params: { tripId },
            });
          }}
        />
        <ToolCard
          icon="today-outline"
          title="Today"
          body="Trip-aware daily context"
          onPress={() => {
            router.push({
              pathname: '/trip/[tripId]',
              params: { tripId },
            });
          }}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>
          NEXT IN TRIP SPACE
        </Text>
        <Text style={styles.sectionTitle}>
          Planned modules
        </Text>
      </View>

      <View style={styles.futureCard}>
        <FutureRow
          icon="people-outline"
          title="Travelers"
          body="Membership and roles need explicit rules."
        />
        <View style={styles.futureDivider} />
        <FutureRow
          icon="bed-outline"
          title="Accommodations"
          body="Persisted foundation; management UI is next."
        />
        <View style={styles.futureDivider} />
        <FutureRow
          icon="checkmark-done-outline"
          title="Readiness"
          body="Will use confirmed trip facts, never guesses."
        />
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function ToolCard({
  icon,
  title,
  body,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      style={({ pressed }) => [
        styles.toolCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.toolIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.brand}
        />
      </View>
      <Text style={styles.toolTitle}>
        {title}
      </Text>
      <Text style={styles.toolBody}>
        {body}
      </Text>
      <Ionicons
        name="arrow-forward"
        size={17}
        color={colors.brass}
        style={styles.toolArrow}
      />
    </Pressable>
  );
}

function FutureRow({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.futureRow}>
      <View style={styles.futureIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={colors.textMuted}
        />
      </View>
      <View style={styles.futureCopy}>
        <Text style={styles.futureTitle}>
          {title}
        </Text>
        <Text style={styles.futureBody}>
          {body}
        </Text>
      </View>
      <View style={styles.plannedBadge}>
        <Text style={styles.plannedBadgeText}>
          PLANNED
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.textPrimary,
  },
  subtitle: {
    maxWidth: 355,
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.textSecondary,
  },
  tripCard: {
    padding: spacing[6],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    ...shadows.card,
  },
  tripCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  tripIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  arrowButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  cardEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },
  tripCardTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
  },
  tripCardBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodySmall,
    color: colors.textSecondary,
  },
  tripFacts: {
    marginTop: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripFact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  tripFactText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  walletCard: {
    marginTop: spacing[5],
    padding: spacing[6],
    borderRadius: radius.xl,
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  walletIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  walletArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  walletEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.6,
    color: colors.brass,
  },
  walletTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textInverse,
  },
  walletBody: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: 'rgba(255,255,255,0.72)',
  },
  walletNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[5],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  walletNoteText: {
    flex: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    color: 'rgba(255,255,255,0.72)',
  },
  sectionHeader: {
    marginTop: spacing[10],
    marginBottom: spacing[4],
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
    color: colors.textPrimary,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  toolCard: {
    width: '48%',
    minHeight: 180,
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
  },
  toolTitle: {
    marginTop: spacing[5],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  toolBody: {
    marginTop: spacing[2],
    paddingRight: spacing[4],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  toolArrow: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
  },
  futureCard: {
    paddingHorizontal: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  futureRow: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  futureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
  },
  futureCopy: {
    flex: 1,
  },
  futureTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  futureBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    color: colors.textMuted,
  },
  plannedBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: colors.brassSoft,
  },
  plannedBadgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.brass,
  },
  futureDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  pressed: {
    opacity: 0.82,
  },
  bottomSpace: {
    height: spacing[16],
  },
});
