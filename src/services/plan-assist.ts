import type {
  TravelInterest,
  TripDestination,
  TripIntent,
  TripPace,
  TripStop,
  TripStopType,
} from '../domain/entities';

import type {
  FreeTimeActivityType,
} from './ai-api-client';
import {
  loadGroundedDiscoverCorpus,
  type GroundedDiscoverRecord,
} from './discover-corpus';

/** Plain copy so Node tests do not pull React Native icons. */
const PLAN_ASSIST_ACTIVITY_COPY: Record<
  FreeTimeActivityType,
  { title: string; body: string }
> = {
  slow_walk: {
    title: 'Take a slow walk',
    body: 'Keep the gap easy and unstructured.',
  },
  coffee_or_rest: {
    title: 'Pause for coffee or rest',
    body: 'Use the time as a low-pressure reset.',
  },
  food_browse: {
    title: 'Browse local food',
    body: 'Explore food casually without committing to a specific venue.',
  },
  culture_browse: {
    title: 'Add a little culture',
    body: 'Use the gap for a light cultural detour.',
  },
  local_browse: {
    title: 'Explore the area',
    body: 'Wander locally without turning it into a fixed stop.',
  },
  photo_walk: {
    title: 'Take a photo walk',
    body: 'Slow down and notice the surroundings through your camera.',
  },
  shopping_browse: {
    title: 'Browse a little',
    body: 'Leave room for casual shopping without a fixed destination.',
  },
  wellness_pause: {
    title: 'Take a wellness pause',
    body: 'Use the gap for a calm reset before the next moment.',
  },
  scenic_pause: {
    title: 'Take a scenic pause',
    body: 'Keep the time open for a quiet view or a slower moment.',
  },
  flexible_buffer: {
    title: 'Keep the buffer',
    body: 'Protect the free time instead of filling every minute.',
  },
};

/**
 * Session-only Plan Assist candidates.
 * They are not TripStops until the traveler accepts one
 * through the existing addStop path.
 *
 * The Discover corpus is city-level only — V1 never invents
 * named venues or POIs.
 */

export type PlanAssistProvenance =
  | {
      kind: 'catalogue';
      identity: string;
      packId: string;
      label: string;
    }
  | {
      kind: 'theme';
      label: string;
    };

export interface PlanAssistCandidate {
  id: string;
  activityType: FreeTimeActivityType;
  title: string;
  body: string;
  stopType: TripStopType;
  reason: string;
  provenance: PlanAssistProvenance;
  /**
   * Optional city-center pin from a catalogue match by
   * exact saved coordinates. Never guessed from a title.
   */
  location?: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

export interface PlanAssistPreferences {
  tripIntent?: TripIntent;
  tripPace?: TripPace;
  interests?: readonly TravelInterest[];
}

const INTEREST_TO_ACTIVITY: Partial<
  Record<TravelInterest, FreeTimeActivityType>
> = {
  food: 'food_browse',
  culture: 'culture_browse',
  nature: 'scenic_pause',
  beaches: 'scenic_pause',
  nightlife: 'local_browse',
  shopping: 'shopping_browse',
  wellness: 'wellness_pause',
  adventure: 'local_browse',
};

const INTENT_TO_ACTIVITY: Partial<
  Record<TripIntent, FreeTimeActivityType>
> = {
  relax: 'coffee_or_rest',
  explore: 'local_browse',
  food: 'food_browse',
  nature: 'scenic_pause',
  event: 'flexible_buffer',
  social: 'local_browse',
  romantic: 'scenic_pause',
  family: 'slow_walk',
  work_leisure: 'coffee_or_rest',
  other: 'flexible_buffer',
};

const ACTIVITY_TO_STOP_TYPE: Record<
  FreeTimeActivityType,
  TripStopType
> = {
  slow_walk: 'activity',
  coffee_or_rest: 'food',
  food_browse: 'food',
  culture_browse: 'activity',
  local_browse: 'place',
  photo_walk: 'activity',
  shopping_browse: 'activity',
  wellness_pause: 'activity',
  scenic_pause: 'place',
  flexible_buffer: 'other',
};

const BASELINE_ACTIVITIES: FreeTimeActivityType[] = [
  'slow_walk',
  'local_browse',
  'flexible_buffer',
];

/**
 * Match a trip destination to a grounded catalogue city
 * only when both latitude and longitude are present and
 * equal. Never match by display name.
 */
export function findCatalogueRecordForDestination(
  destination: Pick<
    TripDestination,
    'latitude' | 'longitude'
  > | null | undefined,
  corpus = loadGroundedDiscoverCorpus(),
): GroundedDiscoverRecord | null {
  if (
    destination?.latitude == null ||
    destination.longitude == null
  ) {
    return null;
  }

  const latitude = destination.latitude;
  const longitude = destination.longitude;

  return (
    corpus.records.find(
      (record) =>
        record.destination.latitude === latitude &&
        record.destination.longitude === longitude,
    ) ?? null
  );
}

function groundedIdentity(
  record: GroundedDiscoverRecord,
): string {
  return `${record.source}:${record.id}`;
}

function activityFromInterest(
  interest: TravelInterest,
): FreeTimeActivityType | null {
  return INTEREST_TO_ACTIVITY[interest] ?? null;
}

function pushUniqueActivity(
  ordered: FreeTimeActivityType[],
  seen: Set<FreeTimeActivityType>,
  activity: FreeTimeActivityType | null | undefined,
): void {
  if (!activity || seen.has(activity)) {
    return;
  }

  seen.add(activity);
  ordered.push(activity);
}

/**
 * Deterministic theme-moment candidates for a Plan day.
 * Optional catalogue city only improves provenance and
 * city-center location — never invents POIs.
 */
export function buildPlanAssistCandidates(input: {
  dayDestination?: TripDestination | null;
  preferences?: PlanAssistPreferences;
  existingTitles?: readonly string[];
  limit?: number;
}): PlanAssistCandidate[] {
  const limit = Math.max(1, Math.min(input.limit ?? 5, 8));
  const preferences = input.preferences ?? {};
  const existing = new Set(
    (input.existingTitles ?? []).map((title) =>
      title.trim().toLowerCase(),
    ),
  );

  const catalogue = findCatalogueRecordForDestination(
    input.dayDestination,
  );

  const ordered: FreeTimeActivityType[] = [];
  const seen = new Set<FreeTimeActivityType>();

  if (preferences.tripIntent) {
    pushUniqueActivity(
      ordered,
      seen,
      INTENT_TO_ACTIVITY[preferences.tripIntent],
    );
  }

  for (const interest of preferences.interests ?? []) {
    pushUniqueActivity(
      ordered,
      seen,
      activityFromInterest(interest),
    );
  }

  if (catalogue?.fit) {
    for (const interest of catalogue.fit.interests) {
      pushUniqueActivity(
        ordered,
        seen,
        activityFromInterest(interest),
      );
    }
  }

  for (const activity of BASELINE_ACTIVITIES) {
    pushUniqueActivity(ordered, seen, activity);
  }

  if (preferences.tripPace === 'slow') {
    pushUniqueActivity(ordered, seen, 'coffee_or_rest');
    pushUniqueActivity(ordered, seen, 'wellness_pause');
  }

  const cityLocation =
    catalogue &&
    input.dayDestination?.latitude != null &&
    input.dayDestination.longitude != null
      ? {
          name: catalogue.destination.name,
          latitude: catalogue.destination.latitude,
          longitude: catalogue.destination.longitude,
        }
      : undefined;

  const candidates: PlanAssistCandidate[] = [];

  for (const activityType of ordered) {
    const copy = PLAN_ASSIST_ACTIVITY_COPY[activityType];
    if (existing.has(copy.title.toLowerCase())) {
      continue;
    }

    const provenance: PlanAssistProvenance = catalogue
      ? {
          kind: 'catalogue',
          identity: groundedIdentity(catalogue),
          packId: catalogue.packId,
          label: `curated · ${catalogue.packId}`,
        }
      : {
          kind: 'theme',
          label: 'theme · trip preferences',
        };

    const reason = reasonForCandidate({
      activityType,
      preferences,
      catalogue,
    });

    candidates.push({
      id: `${activityType}:${
        catalogue ? groundedIdentity(catalogue) : 'theme'
      }`,
      activityType,
      title: copy.title,
      body: copy.body,
      stopType: ACTIVITY_TO_STOP_TYPE[activityType],
      reason,
      provenance,
      location: cityLocation,
    });

    if (candidates.length >= limit) {
      break;
    }
  }

  return candidates;
}

function reasonForCandidate(input: {
  activityType: FreeTimeActivityType;
  preferences: PlanAssistPreferences;
  catalogue: GroundedDiscoverRecord | null;
}): string {
  const { activityType, preferences, catalogue } = input;

  if (
    preferences.tripIntent &&
    INTENT_TO_ACTIVITY[preferences.tripIntent] ===
      activityType
  ) {
    return `Fits this trip’s intent (${preferences.tripIntent}).`;
  }

  const matchingInterest = (
    preferences.interests ?? []
  ).find(
    (interest) =>
      activityFromInterest(interest) === activityType,
  );

  if (matchingInterest) {
    return `Matches your Travel DNA interest (${matchingInterest}).`;
  }

  if (
    catalogue?.fit?.interests.some(
      (interest) =>
        activityFromInterest(interest) === activityType,
    )
  ) {
    return `Suggested from catalogue fit for ${catalogue.destination.name}.`;
  }

  if (activityType === 'flexible_buffer') {
    return 'Keeps free time honest — incomplete plans are valid.';
  }

  return 'A calm theme moment — pick a venue later if you want.';
}

/**
 * Build a TripStop draft from an accepted candidate.
 * Caller supplies id/timestamps and persists via addStop.
 */
export function buildStopFromPlanAssistCandidate(input: {
  candidate: PlanAssistCandidate;
  tripId: string;
  dayId: string;
  order: number;
  id: string;
  nowIso: string;
}): TripStop {
  const { candidate } = input;
  const provenanceNote =
    candidate.provenance.kind === 'catalogue'
      ? `Plan Assist · ${candidate.provenance.identity} · ${candidate.activityType}`
      : `Plan Assist · theme · ${candidate.activityType}`;

  return {
    id: input.id,
    tripId: input.tripId,
    dayId: input.dayId,
    title: candidate.title,
    type: candidate.stopType,
    order: input.order,
    location: candidate.location
      ? {
          name: candidate.location.name,
          latitude: candidate.location.latitude,
          longitude: candidate.location.longitude,
        }
      : undefined,
    notes: provenanceNote,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}
