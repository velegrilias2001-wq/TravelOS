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

export default function MoreScreen() {
  const router = useRouter();
  const { tripId, workspace } =
    useTripWorkspace();

  useTripWorkspaceFocusRefresh();

  const summary = calculateBudgetSummary(
    workspace.budget,
    workspace.trip.accountingCurrency,
  );

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
          {
            workspace.trip.destinations[0]
              ?.name.toUpperCase() ??
            'YOUR TRIP'
          }
        </Text>

        <Text style={styles.title}>
          More
        </Text>

        <Text style={styles.subtitle}>
          The practical details behind a calm journey.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open trip budget"
        style={styles.walletCard}
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
              {
                summary.foreignCurrencyExpenses
                  .length
              } foreign-currency {
                summary.foreignCurrencyExpenses
                  .length === 1
                  ? 'expense is'
                  : 'expenses are'
              } kept separate.
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.comingSoonCard}>
        <Text style={styles.comingSoonEyebrow}>
          TRIP SPACE
        </Text>

        <Text style={styles.comingSoonTitle}>
          More trip tools will live here.
        </Text>

        <Text style={styles.comingSoonBody}>
          Travelers, accommodations, trip details and readiness will join this space as their data rules are completed.
        </Text>
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
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
    maxWidth: 330,
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: colors.textSecondary,
  },

  walletCard: {
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

  comingSoonCard: {
    marginTop: spacing[5],
    padding: spacing[6],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  comingSoonEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.textMuted,
  },

  comingSoonTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  comingSoonBody: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
