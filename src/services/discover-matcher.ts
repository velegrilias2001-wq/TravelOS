import type {
    DiscoverBrief,
    DiscoverCandidate,
    TravelDNA,
    TravelInterest,
} from '@/domain/entities';

import {
    type DiscoverMatchableRecord,
} from './discover-catalogue';

import {
    mapGroundedRecordToCandidate,
} from './discover-catalogue-candidates';

import {
    loadGroundedDiscoverCorpus,
    type GroundedDiscoverRecord,
} from './discover-corpus';

import {
    resolveDiscoverPersonalization,
    type DiscoverPreferenceSource,
} from './discover-personalization';

export type DiscoverMatchDimension =
  | 'intent'
  | 'interests'
  | 'pace'
  | 'party'
  | 'travel_style'
  | 'budget_style'
  | 'daily_rhythm';

export interface DiscoverMatchReason {
  dimension: DiscoverMatchDimension;

  /**
   * Canonical values that actually matched.
   *
   * These values come from the user's explicit context
   * and the grounded catalogue metadata.
   */
  matchedValues: string[];

  /**
   * Where the user's preference came from.
   */
  source: DiscoverPreferenceSource;
}

export interface DiscoverMatch {
  candidate: DiscoverCandidate;

  /**
   * Deterministic V1 score.
   *
   * Higher means more explicit preference overlap.
   * This is not an AI confidence score.
   */
  score: number;

  reasons: DiscoverMatchReason[];
}

/**
 * V1 weights deliberately stay simple and inspectable.
 *
 * There are no hidden model weights.
 */
const WEIGHTS = {
  intent: 4,
  interest: 1,
  interestMaximum: 4,
  pace: 2,
  party: 2,
  travelStyle: 2,
  budgetStyle: 2,
  dailyRhythm: 1,
} as const;

type MatchableGroundedRecord =
  GroundedDiscoverRecord &
    DiscoverMatchableRecord;

function matchingInterests(
  requested: TravelInterest[],
  record: MatchableGroundedRecord,
): TravelInterest[] {
  return requested.filter(
    (interest) =>
      record.fit.interests.includes(
        interest,
      ),
  );
}

function scoreRecord(
  record: MatchableGroundedRecord,
  brief: DiscoverBrief,
  travelDNA: TravelDNA | null,
): DiscoverMatch {
  const personalization =
    resolveDiscoverPersonalization(
      brief,
      travelDNA,
    );

  let score = 0;

  const reasons:
    DiscoverMatchReason[] = [];

  if (
    brief.intent &&
    record.fit.intents.includes(
      brief.intent,
    )
  ) {
    score += WEIGHTS.intent;

    reasons.push({
      dimension: 'intent',
      matchedValues: [
        brief.intent,
      ],
      source: 'discover_brief',
    });
  }

  const interests =
    matchingInterests(
      personalization.interests
        .values,
      record,
    );

  if (interests.length > 0) {
    score += Math.min(
      interests.length *
        WEIGHTS.interest,
      WEIGHTS.interestMaximum,
    );

    reasons.push({
      dimension: 'interests',
      matchedValues: interests,
      source:
        personalization.interests
          .source,
    });
  }

  if (
    personalization.pace.value &&
    record.fit.paces.includes(
      personalization.pace.value,
    )
  ) {
    score += WEIGHTS.pace;

    reasons.push({
      dimension: 'pace',
      matchedValues: [
        personalization.pace.value,
      ],
      source:
        personalization.pace
          .source,
    });
  }

  if (
    personalization.party.value &&
    record.fit.parties.includes(
      personalization.party.value,
    )
  ) {
    score += WEIGHTS.party;

    reasons.push({
      dimension: 'party',
      matchedValues: [
        personalization.party.value,
      ],
      source:
        personalization.party
          .source,
    });
  }

  if (
    personalization.travelStyle
      .value &&
    record.fit.travelStyles.includes(
      personalization.travelStyle
        .value,
    )
  ) {
    score += WEIGHTS.travelStyle;

    reasons.push({
      dimension: 'travel_style',
      matchedValues: [
        personalization.travelStyle
          .value,
      ],
      source:
        personalization.travelStyle
          .source,
    });
  }

  /**
   * Budget style is only scored when the catalogue itself
   * explicitly supports budget-style classification.
   *
   * The current V1 catalogue intentionally leaves this
   * empty, so no destination receives a fabricated
   * affordability signal.
   */
  if (
    personalization.budgetStyle
      .value &&
    record.fit.budgetStyles.length >
      0 &&
    record.fit.budgetStyles.includes(
      personalization.budgetStyle
        .value,
    )
  ) {
    score += WEIGHTS.budgetStyle;

    reasons.push({
      dimension: 'budget_style',
      matchedValues: [
        personalization.budgetStyle
          .value,
      ],
      source:
        personalization.budgetStyle
          .source,
    });
  }

  if (
    personalization.dailyRhythm
      .value &&
    record.fit.dailyRhythms.includes(
      personalization.dailyRhythm
        .value,
    )
  ) {
    score += WEIGHTS.dailyRhythm;

    reasons.push({
      dimension: 'daily_rhythm',
      matchedValues: [
        personalization.dailyRhythm
          .value,
      ],
      source:
        personalization.dailyRhythm
          .source,
    });
  }

  return {
    candidate:
      mapGroundedRecordToCandidate(
        record,
      ),

    score,

    reasons,
  };
}

/**
 * Rank grounded destinations that have editorial fit
 * against the user's explicit Discover context.
 *
 * Rules:
 * - only corpus records with fit can be ranked
 * - grounded records without fit stay in the corpus
 * - AI creates no destinations
 * - AI creates no matching facts
 * - mismatches are not penalised in V1
 * - equal scores use destination name for stable ordering
 */
export function matchCuratedDiscoverDestinations(
  brief: DiscoverBrief,
  travelDNA: TravelDNA | null,
): DiscoverMatch[] {
  const corpus =
    loadGroundedDiscoverCorpus();

  return corpus.matchableRecords
    .map((record) =>
      scoreRecord(
        record,
        brief,
        travelDNA,
      ),
    )
    .sort((left, right) => {
      if (
        right.score !== left.score
      ) {
        return (
          right.score - left.score
        );
      }

      return left.candidate.destination.name.localeCompare(
        right.candidate.destination
          .name,
      );
    });
}