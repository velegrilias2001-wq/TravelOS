import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FreeTimeAdviceCard } from '@/features/copilot/free-time-advice-card';
import { freeTimeAdviceKey } from '@/features/copilot/free-time-activity-copy';
import { useFreeTimeAdvice } from '@/features/copilot/use-free-time-advice';
import type { TripDay, TripStop } from '@/domain/entities';
import { deriveDayFreeTimeGaps } from '@/services/itinerary-flexibility';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
} from '@/theme';

type CompanionFreeTimeCopilotProps = {
  tripId: string;
  day: TripDay;
  stops: TripStop[];
  onOpenPlan: () => void;
};

/**
 * Active Companion: surface the next verified free-time gap with
 * local-dev AI ideas. Display-only; never writes Plan.
 */
export function CompanionFreeTimeCopilot({
  tripId,
  day,
  stops,
  onOpenPlan,
}: CompanionFreeTimeCopilotProps) {
  const { adviceByKey, errorByKey, loadingKey, requestAdvice } =
    useFreeTimeAdvice(tripId);

  const gaps = useMemo(
    () => deriveDayFreeTimeGaps(day, stops),
    [day, stops],
  );

  const featuredGap = gaps[0];

  if (!featuredGap) {
    return null;
  }

  const adviceKey = freeTimeAdviceKey(day.id, featuredGap);

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>COPILOT</Text>
      <Text style={styles.title}>Use open time well</Text>
      <FreeTimeAdviceCard
        day={day}
        gap={featuredGap}
        advice={adviceByKey[adviceKey]}
        error={errorByKey[adviceKey]}
        loading={loadingKey === adviceKey}
        disabled={loadingKey !== null && loadingKey !== adviceKey}
        onAsk={() => {
          void requestAdvice(day, featuredGap);
        }}
        onOpenPlan={onOpenPlan}
      />
      {gaps.length > 1 ? (
        <Text style={styles.more}>
          {gaps.length - 1} more open gap
          {gaps.length - 1 === 1 ? '' : 's'} on Plan.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
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
    color: colors.textPrimary,
  },
  more: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
});
