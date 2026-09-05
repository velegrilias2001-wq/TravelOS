import { Ionicons } from '@expo/vector-icons';

import type { FreeTimeActivityType } from '@/services/ai-api-client';

export const FREE_TIME_ACTIVITY_COPY: Record<
  FreeTimeActivityType,
  {
    title: string;
    body: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }
> = {
  slow_walk: {
    title: 'Take a slow walk',
    body: 'Keep the gap easy and unstructured.',
    icon: 'walk-outline',
  },
  coffee_or_rest: {
    title: 'Pause for coffee or rest',
    body: 'Use the time as a low-pressure reset.',
    icon: 'cafe-outline',
  },
  food_browse: {
    title: 'Browse local food',
    body: 'Explore food casually without committing to a specific venue.',
    icon: 'restaurant-outline',
  },
  culture_browse: {
    title: 'Add a little culture',
    body: 'Use the gap for a light cultural detour.',
    icon: 'library-outline',
  },
  local_browse: {
    title: 'Explore the area',
    body: 'Wander locally without turning it into a fixed stop.',
    icon: 'compass-outline',
  },
  photo_walk: {
    title: 'Take a photo walk',
    body: 'Slow down and notice the surroundings through your camera.',
    icon: 'camera-outline',
  },
  shopping_browse: {
    title: 'Browse a little',
    body: 'Leave room for casual shopping without a fixed destination.',
    icon: 'bag-outline',
  },
  wellness_pause: {
    title: 'Take a wellness pause',
    body: 'Use the gap for a calm reset before the next moment.',
    icon: 'leaf-outline',
  },
  scenic_pause: {
    title: 'Take a scenic pause',
    body: 'Keep the time open for a quiet view or a slower moment.',
    icon: 'sunny-outline',
  },
  flexible_buffer: {
    title: 'Keep the buffer',
    body: 'Protect the free time instead of filling every minute.',
    icon: 'time-outline',
  },
};

export function formatFreeTimeDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

export function freeTimeAdviceKey(
  dayId: string,
  gap: {
    afterStopId: string;
    beforeStopId: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  },
): string {
  return [
    dayId,
    gap.afterStopId,
    gap.beforeStopId,
    gap.startTime,
    gap.endTime,
    gap.durationMinutes,
  ].join(':');
}
