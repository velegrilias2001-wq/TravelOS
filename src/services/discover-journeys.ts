import type {
  DiscoverBrief,
  DiscoverDestination,
  TripIntent,
  TripPace,
} from '@/domain/entities';

import {
  CURATED_JOURNEY_RECORDS,
} from '../data/discover/curated-journeys';

import type {
  DiscoverCatalogueEvidence,
} from './discover-catalogue';

import {
  validateDiscoverCatalogueEvidence,
} from './discover-catalogue-validation';

import {
  loadGroundedDiscoverCorpus,
  type GroundedDiscoverRecord,
} from './discover-corpus';

import {
  normalizeDiscoverBrief,
} from './discover-brief';

import {
  groundedDiscoverIdentity,
} from './discover-semantic';

import {
  normalizeDestinationSelection,
} from './destination-authoring';

import {
  buildDiscoverTripPrefill,
  type DiscoverTripPrefill,
} from './discover-trip-handoff';

export interface DiscoverJourneyRecord {
  id: string;
  title: string;
  summary: string;
  destinationIdentities: string[];
  intent?: TripIntent;
  pace?: TripPace;
  evidence: DiscoverCatalogueEvidence[];
}

export interface DiscoverJourney {
  identity: string;
  title: string;
  summary: string;
  destinationIdentities: string[];
  destinations: DiscoverDestination[];
  intent?: TripIntent;
  pace?: TripPace;
  evidence: DiscoverCatalogueEvidence[];
}

function assertNonEmptyString(
  value: string,
  field: string,
): void {
  if (!value.trim()) {
    throw new Error(
      `Discover journey: ${field} must not be empty.`,
    );
  }
}

function findCorpusRecord(
  identity: string,
  records: readonly GroundedDiscoverRecord[],
): GroundedDiscoverRecord | undefined {
  return records.find(
    (record) =>
      groundedDiscoverIdentity(
        record.source,
        record.id,
      ) === identity,
  );
}

function validateJourneyIntentAndPace(
  record: DiscoverJourneyRecord,
  destinations: readonly GroundedDiscoverRecord[],
): void {
  const primary = destinations[0];

  if (!primary) {
    return;
  }

  if (record.intent) {
    if (!primary.fit) {
      throw new Error(
        `Discover journey: ${record.id} cannot claim intent without fit on the primary destination.`,
      );
    }

    if (!primary.fit.intents.includes(record.intent)) {
      throw new Error(
        `Discover journey: ${record.id} intent is not on the primary destination fit.`,
      );
    }
  }

  if (record.pace) {
    if (!primary.fit) {
      throw new Error(
        `Discover journey: ${record.id} cannot claim pace without fit on the primary destination.`,
      );
    }

    if (!primary.fit.paces.includes(record.pace)) {
      throw new Error(
        `Discover journey: ${record.id} pace is not on the primary destination fit.`,
      );
    }
  }
}

export function validateDiscoverJourneyRecord(
  record: DiscoverJourneyRecord,
  corpusRecords: readonly GroundedDiscoverRecord[] =
    loadGroundedDiscoverCorpus().records,
): DiscoverJourney {
  assertNonEmptyString(record.id, 'id');
  assertNonEmptyString(
    record.title,
    `${record.id}.title`,
  );
  assertNonEmptyString(
    record.summary,
    `${record.id}.summary`,
  );

  if (record.destinationIdentities.length === 0) {
    throw new Error(
      `Discover journey: ${record.id} must name at least one grounded destination.`,
    );
  }

  const uniqueIdentities = new Set(
    record.destinationIdentities,
  );

  if (
    uniqueIdentities.size !==
    record.destinationIdentities.length
  ) {
    throw new Error(
      `Discover journey: ${record.id} has duplicate destination identities.`,
    );
  }

  if (record.evidence.length === 0) {
    throw new Error(
      `Discover journey: ${record.id} must cite at least one source.`,
    );
  }

  for (const evidence of record.evidence) {
    validateDiscoverCatalogueEvidence(
      evidence,
      record.id,
    );
  }

  const destinations: GroundedDiscoverRecord[] = [];

  for (const identity of record.destinationIdentities) {
    const destination = findCorpusRecord(
      identity,
      corpusRecords,
    );

    if (!destination) {
      throw new Error(
        `Discover journey: ${record.id} references unknown destination "${identity}".`,
      );
    }

    destinations.push(destination);
  }

  validateJourneyIntentAndPace(record, destinations);

  return {
    identity: `curated:${record.id}`,
    title: record.title,
    summary: record.summary,
    destinationIdentities: [
      ...record.destinationIdentities,
    ],
    destinations: destinations.map(
      (entry) => entry.destination,
    ),
    intent: record.intent,
    pace: record.pace,
    evidence: record.evidence,
  };
}

export function loadDiscoverJourneys(
  records: readonly DiscoverJourneyRecord[] =
    CURATED_JOURNEY_RECORDS,
): DiscoverJourney[] {
  const corpus = loadGroundedDiscoverCorpus();
  const journeys: DiscoverJourney[] = [];
  const identities = new Set<string>();

  for (const record of records) {
    const journey = validateDiscoverJourneyRecord(
      record,
      corpus.records,
    );

    if (identities.has(journey.identity)) {
      throw new Error(
        `Discover journey: duplicate identity "${journey.identity}".`,
      );
    }

    identities.add(journey.identity);
    journeys.push(journey);
  }

  return journeys;
}

export function listDiscoverJourneys(): DiscoverJourney[] {
  return loadDiscoverJourneys();
}

export function findDiscoverJourney(
  identity: string,
): DiscoverJourney | null {
  return (
    loadDiscoverJourneys().find(
      (journey) => journey.identity === identity,
    ) ?? null
  );
}

/**
 * A journey idea is session state, not a Trip.
 * The primary grounded destination prefills Create Trip.
 * Extra catalogue cities can prefill additional destinations.
 * Dates stay empty.
 */
export function buildDiscoverJourneyBrief(
  journey: DiscoverJourney,
): DiscoverBrief {
  const primary = journey.destinations[0];

  if (!primary) {
    throw new Error(
      'Discover journey requires a primary destination.',
    );
  }

  return normalizeDiscoverBrief({
    mode: 'journey_ideas',
    destination: primary,
    intent: journey.intent,
    pace: journey.pace,
    interests: [],
  });
}

export function buildDiscoverJourneyTripPrefill(
  journey: DiscoverJourney,
): DiscoverTripPrefill {
  const primary = journey.destinations[0];

  if (!primary) {
    throw new Error(
      'Discover journey requires a primary destination.',
    );
  }

  const extraDestinations = journey.destinations
    .slice(1)
    .map((destination) => {
      const selection = normalizeDestinationSelection(
        destination,
      );

      return {
        ...selection,
        timezoneSource: selection.timezone
          ? ('catalogue' as const)
          : undefined,
      };
    });

  return {
    ...buildDiscoverTripPrefill(
      buildDiscoverJourneyBrief(journey),
      primary,
    ),
    ...(extraDestinations.length > 0
      ? { extraDestinations }
      : {}),
  };
}
