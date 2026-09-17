/**
 * Curated per-trip visual packs.
 * Packs never invent destinations — they only style confirmed trips.
 */

import { strings } from '../i18n';

export type TripThemePackId = string;

export interface TripThemePack {
  id: TripThemePackId;
  label: string;
  moodEyebrow: string;
  accent: string;
  accentSoft: string;
  countryCodes: readonly string[];
}

export const TRIP_THEME_PACKS: readonly TripThemePack[] = [
  {
    id: 'ink-default',
    label: 'Ink',
    moodEyebrow: strings.tripTheme.inkMood,
    accent: '#0E2421',
    accentSoft: '#D5E4DF',
    countryCodes: [],
  },
  {
    id: 'mediterranean-coast',
    label: 'Mediterranean',
    moodEyebrow: strings.tripTheme.mediterraneanMood,
    accent: '#1B3A4B',
    accentSoft: '#E4EEF2',
    countryCodes: ['IT', 'ES', 'PT', 'GR', 'HR'],
  },
  {
    id: 'central-europe',
    label: 'Central Europe',
    moodEyebrow: strings.tripTheme.centralEuropeMood,
    accent: '#3D2C2E',
    accentSoft: '#F0E6E4',
    countryCodes: ['AT', 'CZ', 'PL', 'HU', 'DE', 'SK'],
  },
  {
    id: 'nordic',
    label: 'Nordic',
    moodEyebrow: strings.tripTheme.nordicMood,
    accent: '#243B4A',
    accentSoft: '#E6EEF2',
    countryCodes: ['NO', 'DK', 'SE', 'FI', 'IS'],
  },
  {
    id: 'atlantic-isles',
    label: 'Atlantic',
    moodEyebrow: strings.tripTheme.atlanticMood,
    accent: '#2F4A3C',
    accentSoft: '#E5EFE8',
    countryCodes: ['GB', 'IE', 'IS'],
  },
] as const;

export function getTripThemePack(
  packId: string | null | undefined,
): TripThemePack {
  if (!packId) {
    return TRIP_THEME_PACKS[0]!;
  }

  return (
    TRIP_THEME_PACKS.find((pack) => pack.id === packId) ??
    TRIP_THEME_PACKS[0]!
  );
}

/**
 * Suggest a pack from confirmed destination country codes only.
 */
export function suggestTripThemePackId(
  countryCodes: readonly (string | undefined)[],
): TripThemePackId {
  const codes = countryCodes
    .map((code) => code?.trim().toUpperCase())
    .filter((code): code is string => Boolean(code));

  for (const pack of TRIP_THEME_PACKS) {
    if (pack.id === 'ink-default') {
      continue;
    }

    if (codes.some((code) => pack.countryCodes.includes(code))) {
      return pack.id;
    }
  }

  return 'ink-default';
}

export function listTripThemePacks(): readonly TripThemePack[] {
  return TRIP_THEME_PACKS;
}
