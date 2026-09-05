import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  FREE_TIME_ACTIVITY_COPY,
  formatFreeTimeDuration,
  freeTimeAdviceKey,
} from '@/features/copilot/free-time-activity-copy';
import { PressableScale } from '@/features/motion/pressable-scale';
import type { TripDay } from '@/domain/entities';
import type { FreeTimeAdviceResult } from '@/services/ai-api-client';
import type { FreeTimeGap } from '@/services/itinerary-flexibility';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

type FreeTimeAdviceCardProps = {
  day: TripDay;
  gap: FreeTimeGap;
  advice: FreeTimeAdviceResult | undefined;
  error: string | undefined;
  loading: boolean;
  disabled?: boolean;
  onAsk: () => void;
  onOpenPlan?: () => void;
};

/**
 * Display-only free-time ideas with provider provenance.
 * Never writes itinerary truth.
 */
export function FreeTimeAdviceCard({
  day,
  gap,
  advice,
  error,
  loading,
  disabled,
  onAsk,
  onOpenPlan,
}: FreeTimeAdviceCardProps) {
  const adviceKey = freeTimeAdviceKey(day.id, gap);

  return (
    <View style={styles.card} accessibilityLabel={`Free time ideas for ${gap.startTime} to ${gap.endTime}`}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>OPEN TIME</Text>
          <Text style={styles.range}>
            {gap.startTime}–{gap.endTime}
          </Text>
          <Text style={styles.duration}>
            {formatFreeTimeDuration(gap.durationMinutes)}
          </Text>
        </View>
        <Ionicons
          name="sparkles-outline"
          size={20}
          color={colors.brass}
        />
      </View>

      <Text style={styles.body}>
        A verified gap between saved moments. Ideas stay suggestions until you
        edit Plan.
      </Text>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Ask TravelOS how to use free time from ${gap.startTime} to ${gap.endTime}`}
        disabled={disabled || loading}
        style={[
          styles.askButton,
          (disabled || loading) && styles.askButtonDisabled,
        ]}
        onPress={onAsk}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <Ionicons
            name="sparkles-outline"
            size={16}
            color={colors.textInverse}
          />
        )}
        <Text style={styles.askButtonText}>
          {loading
            ? 'Thinking…'
            : advice
              ? 'Refresh ideas'
              : 'Ask TravelOS'}
        </Text>
      </PressableScale>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {advice ? (
        <View style={styles.ideas}>
          <View style={styles.ideasHeadingRow}>
            <Text style={styles.ideasHeading}>TRAVELOS IDEAS</Text>
            <Text style={styles.provenance}>
              {advice.provider} · {advice.model}
            </Text>
          </View>
          <Text style={styles.ideasNote}>
            These stay ideas. Nothing is saved as a stop.
          </Text>

          {advice.suggestions.map((suggestion) => {
            const copy =
              FREE_TIME_ACTIVITY_COPY[suggestion.activityType];

            return (
              <View
                key={`${adviceKey}:${suggestion.activityType}`}
                style={styles.suggestion}
              >
                <View style={styles.suggestionIcon}>
                  <Ionicons
                    name={copy.icon}
                    size={17}
                    color={colors.teal}
                  />
                </View>
                <View style={styles.suggestionCopy}>
                  <Text style={styles.suggestionTitle}>
                    {copy.title}
                  </Text>
                  <Text style={styles.suggestionBody}>
                    {copy.body} · about{' '}
                    {formatFreeTimeDuration(
                      suggestion.suggestedMinutes,
                    )}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {onOpenPlan ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Plan for this day"
          onPress={onOpenPlan}
          style={styles.planLink}
        >
          <Text style={styles.planLinkText}>Open in Plan</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.teal}
          />
        </Pressable>
      ) : null}
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerCopy: {
    gap: spacing[1],
    flex: 1,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },
  range: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },
  duration: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  askButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  askButtonDisabled: {
    opacity: 0.55,
  },
  askButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
  error: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.danger,
  },
  ideas: {
    gap: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ideasHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  ideasHeading: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.brass,
  },
  provenance: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.micro,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  ideasNote: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  suggestion: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionCopy: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  suggestionBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  planLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
    paddingTop: spacing[1],
  },
  planLinkText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.teal,
  },
});
