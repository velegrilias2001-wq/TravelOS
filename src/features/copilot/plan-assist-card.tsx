import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PressableScale } from '@/features/motion/pressable-scale';
import { RiseIn } from '@/features/motion/rise-in';
import type { PlanAssistCandidate } from '@/services/plan-assist';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

type PlanAssistCardProps = {
  cityLabel?: string | null;
  candidates: readonly PlanAssistCandidate[];
  acceptingId?: string | null;
  onAccept: (candidate: PlanAssistCandidate) => void;
  onAddManually: () => void;
};

/**
 * Empty-day Plan Assist: grounded theme moments only.
 * Accept writes a TripStop through the parent; never invents POIs.
 */
export function PlanAssistCard({
  cityLabel,
  candidates,
  acceptingId,
  onAccept,
  onAddManually,
}: PlanAssistCardProps) {
  if (candidates.length === 0) {
    return null;
  }

  const provenance =
    candidates[0]?.provenance.label ?? 'theme';

  return (
    <RiseIn factKey={`plan-assist:${cityLabel ?? 'day'}`}>
      <View
        style={styles.card}
        accessibilityLabel="Plan Assist suggestions for this day"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PLAN ASSIST</Text>
            <Text style={styles.title}>
              {cityLabel
                ? `Seed ${cityLabel}`
                : 'Seed this day'}
            </Text>
            <Text style={styles.body}>
              Theme moments only — no invented venues. Accept
              saves a real stop; you can add a place later.
            </Text>
          </View>
          <Ionicons
            name="sparkles-outline"
            size={20}
            color={colors.brass}
          />
        </View>

        <Text style={styles.provenance}>{provenance}</Text>

        <View style={styles.list}>
          {candidates.map((candidate, index) => {
            const busy = acceptingId === candidate.id;
            const disabled = Boolean(acceptingId);

            return (
              <RiseIn
                key={candidate.id}
                factKey={candidate.id}
                delayMs={index * 40}
              >
                <View style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>
                      {candidate.title}
                    </Text>
                    <Text style={styles.rowReason}>
                      {candidate.reason}
                    </Text>
                  </View>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Accept ${candidate.title}`}
                    disabled={disabled}
                    style={[
                      styles.accept,
                      disabled && !busy && styles.acceptDisabled,
                    ]}
                    onPress={() => onAccept(candidate)}
                  >
                    {busy ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.textInverse}
                      />
                    ) : (
                      <Text style={styles.acceptText}>Accept</Text>
                    )}
                  </PressableScale>
                </View>
              </RiseIn>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a moment manually"
          style={styles.manual}
          onPress={onAddManually}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={colors.teal}
          />
          <Text style={styles.manualText}>Add a moment</Text>
        </Pressable>
      </View>
    </RiseIn>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[1],
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },
  title: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  provenance: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  list: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  rowReason: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  accept: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptDisabled: {
    opacity: 0.45,
  },
  acceptText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  manual: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  manualText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.teal,
  },
});
