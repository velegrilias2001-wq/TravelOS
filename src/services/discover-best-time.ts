import type {
  DiscoverBrief,
  DiscoverDestination,
} from '@/domain/entities';

import type {
  DiscoverCatalogueEvidence,
} from './discover-catalogue';

import {
  loadGroundedDiscoverCorpus,
} from './discover-corpus';

import {
  normalizeDiscoverBrief,
} from './discover-brief';

import {
  findGroundedDiscoverRecord,
} from './discover-explain';

import {
  groundedDiscoverIdentity,
} from './discover-semantic';

import {
  buildDiscoverTripPrefill,
  type DiscoverTripPrefill,
} from './discover-trip-handoff';

export const DISCOVER_CALENDAR_MONTHS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

export const DISCOVER_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface DiscoverBestTimeDestinationOption {
  identity: string;
  destination: DiscoverDestination;
  hasSeasonGuidance: boolean;
}

export interface DiscoverBestTimeUnknownAdvice {
  kind: 'unknown';
  identity: string;
  destination: DiscoverDestination;
}

export interface DiscoverBestTimeGuidedAdvice {
  kind: 'guided';
  identity: string;
  destination: DiscoverDestination;
  supportedMonths: number[];
  yearRound: boolean;
  evidence: DiscoverCatalogueEvidence[];
  freshness: string;
}

export type DiscoverBestTimeAdvice =
  | DiscoverBestTimeUnknownAdvice
  | DiscoverBestTimeGuidedAdvice;

function latestCheckedAt(
  evidence: readonly DiscoverCatalogueEvidence[],
): string {
  const dates = evidence
    .map((item) => item.checkedAt)
    .sort();
  const latest = dates[dates.length - 1];

  if (!latest) {
    throw new Error(
      'Best time guidance requires cited source freshness.',
    );
  }

  return latest;
}

export function isDiscoverYearRoundMonths(
  months: readonly number[],
): boolean {
  if (months.length !== 12) {
    return false;
  }

  const unique = new Set(months);

  return DISCOVER_CALENDAR_MONTHS.every(
    (month) => unique.has(month),
  );
}

export function formatDiscoverSupportedMonths(
  months: readonly number[],
): string {
  const uniqueSorted = [
    ...new Set(months),
  ].sort((left, right) => left - right);

  if (
    isDiscoverYearRoundMonths(
      uniqueSorted,
    )
  ) {
    return 'Throughout the year';
  }

  const labels = uniqueSorted.map(
    (month) =>
      DISCOVER_MONTH_LABELS[month - 1],
  );

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

export function listDiscoverBestTimeDestinations(): DiscoverBestTimeDestinationOption[] {
  return loadGroundedDiscoverCorpus()
    .records
    .map((record) => ({
      identity: groundedDiscoverIdentity(
        record.source,
        record.id,
      ),
      destination: record.destination,
      hasSeasonGuidance:
        record.timing !== undefined,
    }))
    .sort((left, right) =>
      left.destination.name.localeCompare(
        right.destination.name,
      ),
    );
}

export function adviseDiscoverBestTime(
  identity: string,
): DiscoverBestTimeAdvice | null {
  const record =
    findGroundedDiscoverRecord(
      identity,
    );

  if (!record) {
    return null;
  }

  if (!record.timing) {
    return {
      kind: 'unknown',
      identity,
      destination: record.destination,
    };
  }

  const supportedMonths = [
    ...record.timing.supportedMonths,
  ].sort((left, right) => left - right);

  return {
    kind: 'guided',
    identity,
    destination: record.destination,
    supportedMonths,
    yearRound: isDiscoverYearRoundMonths(
      supportedMonths,
    ),
    evidence: record.timing.evidence,
    freshness: latestCheckedAt(
      record.timing.evidence,
    ),
  };
}

/**
 * Best time is a Discover session, not a Trip.
 * Dates stay empty until the traveler chooses them
 * on Create Trip.
 */
export function buildDiscoverBestTimeBrief(
  destination: DiscoverDestination,
): DiscoverBrief {
  return normalizeDiscoverBrief({
    mode: 'best_time',
    destination,
    interests: [],
  });
}

export function buildDiscoverBestTimeTripPrefill(
  destination: DiscoverDestination,
): DiscoverTripPrefill {
  return buildDiscoverTripPrefill(
    buildDiscoverBestTimeBrief(
      destination,
    ),
    destination,
  );
}
