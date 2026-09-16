import { Ionicons } from '@expo/vector-icons';

import type { TripStop, TripStopType } from '@/domain/entities';

/**
 * Stop type catalogue and location helpers shared by the Plan screen and its
 * stop editor. Extracted verbatim from plan.tsx.
 */
export const STOP_TYPES: {
  label: string;
  value: TripStopType;
  icon:
    keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: 'Place',
    value: 'place',
    icon: 'location-outline',
  },
  {
    label: 'Activity',
    value: 'activity',
    icon: 'sparkles-outline',
  },
  {
    label: 'Food',
    value: 'food',
    icon: 'restaurant-outline',
  },
  {
    label: 'Transport',
    value: 'transport',
    icon: 'car-outline',
  },
];

export type StopLocation =
  NonNullable<
    TripStop['location']
  >;

export type MappedLocation =
  StopLocation & {
    latitude: number;
    longitude: number;
  };

export function hasCoordinates(
  location:
    | TripStop['location']
    | null
    | undefined,
): location is MappedLocation {
  return (
    typeof location?.latitude ===
      'number' &&
    typeof location?.longitude ===
      'number'
  );
}
