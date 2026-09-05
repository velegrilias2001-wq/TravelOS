import { useCallback, useState } from 'react';

import type { TripDay } from '@/domain/entities';
import { freeTimeAdviceKey } from '@/features/copilot/free-time-activity-copy';
import type {
  FreeTimeAdviceResult,
} from '@/services/ai-api-client';
import { aiAPIClient } from '@/services/ai-api-runtime';
import { aiContextService } from '@/services/ai-context-runtime';
import type { FreeTimeGap } from '@/services/itinerary-flexibility';

/**
 * Shared free-time advice requests for Plan and Companion.
 * Suggestions never write SQLite.
 */
export function useFreeTimeAdvice(tripId: string) {
  const [adviceByKey, setAdviceByKey] = useState<
    Record<string, FreeTimeAdviceResult>
  >({});
  const [errorByKey, setErrorByKey] = useState<
    Record<string, string>
  >({});
  const [loadingKey, setLoadingKey] = useState<string | null>(
    null,
  );

  const requestAdvice = useCallback(
    async (day: TripDay, gap: FreeTimeGap) => {
      if (loadingKey) {
        return;
      }

      const adviceKey = freeTimeAdviceKey(day.id, gap);
      setLoadingKey(adviceKey);
      setErrorByKey((current) => {
        const next = { ...current };
        delete next[adviceKey];
        return next;
      });

      try {
        const context =
          await aiContextService.getSnapshot(tripId);

        if (!context) {
          throw new Error('Trip context is unavailable');
        }

        const result = await aiAPIClient.suggestForFreeTime({
          context,
          dayId: day.id,
          afterStopId: gap.afterStopId,
          beforeStopId: gap.beforeStopId,
        });

        if (
          result.verifiedGap.startTime !== gap.startTime ||
          result.verifiedGap.endTime !== gap.endTime ||
          result.verifiedGap.durationMinutes !==
            gap.durationMinutes
        ) {
          throw new Error(
            'Free-time context changed before the AI response returned',
          );
        }

        setAdviceByKey((current) => ({
          ...current,
          [adviceKey]: result,
        }));
      } catch (error) {
        console.error(
          '[TravelOS Copilot] Free-time AI error:',
          error,
        );

        setErrorByKey((current) => ({
          ...current,
          [adviceKey]:
            'TravelOS AI is unavailable right now. Your plan has not changed.',
        }));
      } finally {
        setLoadingKey((current) =>
          current === adviceKey ? null : current,
        );
      }
    },
    [loadingKey, tripId],
  );

  return {
    adviceByKey,
    errorByKey,
    loadingKey,
    requestAdvice,
  };
}
