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
import { strings } from '../i18n';

/** Plain copy so Node tests do not pull React Native icons. */
const PLAN_ASSIST_ACTIVITY_COPY: Record<
  FreeTimeActivityType,
  { title: string; body: string }
> = {
  slow_walk: {
    title: strings.activity.slow_walk.title,
    body: strings.activity.slow_walk.body,
  },
  coffee_or_rest: {
    title: strings.activity.coffee_or_rest.title,
    body: strings.activity.coffee_or_rest.body,
  },
  food_browse: {
    title: strings.activity.food_browse.title,
    body: strings.activity.food_browse.body,
  },
  culture_browse: {
    title: strings.activity.culture_browse.title,
    body: strings.activity.culture_browse.body,
  },
  local_browse: {
    title: strings.activity.local_browse.title,
    body: strings.activity.local_browse.body,
  },
  photo_walk: {
    title: strings.activity.photo_walk.title,
    body: strings.activity.photo_walk.body,
  },
  shopping_browse: {
    title: strings.activity.shopping_browse.title,
    body: strings.activity.shopping_browse.body,
  },
  wellness_pause: {
    title: strings.activity.wellness_pause.title,
    body: strings.activity.wellness_pause.body,
  },
  scenic_pause: {
    title: strings.activity.scenic_pause.title,
    body: strings.activity.scenic_pause.body,
  },
  flexible_buffer: {
    title: strings.activity.flexible_buffer.title,
    body: strings.activity.flexible_buffer.body,
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
          label: strings.planAssist.provenanceCurated(
            catalogue.packId,
          ),
        }
      : {
          kind: 'theme',
          label: strings.planAssist.provenanceTheme,
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
    // These are activity themes, never verified venues. This also rejects
    // city coordinates carried by a stale session candidate after an update.
    location: undefined,
    notes: provenanceNote,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}
