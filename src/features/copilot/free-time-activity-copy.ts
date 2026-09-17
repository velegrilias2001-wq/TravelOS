import { Ionicons } from '@expo/vector-icons';

import type { FreeTimeActivityType } from '@/services/ai-api-client';
import { strings } from '@/i18n';

export const FREE_TIME_ACTIVITY_COPY: Record<
  FreeTimeActivityType,
  {
    title: string;
    body: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }
> = {
  slow_walk: {
    title: strings.activity.slow_walk.title,
    body: strings.activity.slow_walk.body,
    icon: 'walk-outline',
  },
  coffee_or_rest: {
    title: strings.activity.coffee_or_rest.title,
    body: strings.activity.coffee_or_rest.body,
    icon: 'cafe-outline',
  },
  food_browse: {
    title: strings.activity.food_browse.title,
    body: strings.activity.food_browse.body,
    icon: 'restaurant-outline',
  },
  culture_browse: {
    title: strings.activity.culture_browse.title,
    body: strings.activity.culture_browse.body,
    icon: 'library-outline',
  },
  local_browse: {
    title: strings.activity.local_browse.title,
    body: strings.activity.local_browse.body,
    icon: 'compass-outline',
  },
  photo_walk: {
    title: strings.activity.photo_walk.title,
    body: strings.activity.photo_walk.body,
    icon: 'camera-outline',
  },
  shopping_browse: {
    title: strings.activity.shopping_browse.title,
    body: strings.activity.shopping_browse.body,
    icon: 'bag-outline',
  },
  wellness_pause: {
    title: strings.activity.wellness_pause.title,
    body: strings.activity.wellness_pause.body,
    icon: 'leaf-outline',
  },
  scenic_pause: {
    title: strings.activity.scenic_pause.title,
    body: strings.activity.scenic_pause.body,
    icon: 'sunny-outline',
  },
  flexible_buffer: {
    title: strings.activity.flexible_buffer.title,
    body: strings.activity.flexible_buffer.body,
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
