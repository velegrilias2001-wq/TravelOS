import type {
  DiscoverBrief,
  DiscoverCandidate,
  TravelDNA,
} from '@/domain/entities';

import {
  getGroundedDiscoverCandidates,
} from './discover-catalogue-candidates';

import {
  loadGroundedDiscoverCorpus,
  type GroundedDiscoverRecord,
} from './discover-corpus';

import type {
  DiscoverMatch,
} from './discover-matcher';

import {
  resolveDiscoverPersonalization,
  type DiscoverPersonalization,
} from './discover-personalization';

/**
 * Current embedding-model candidate used to generate and
 * hash the committed corpus artifact.
 *
 * This is a measured local-dev candidate, not a locked
 * production architecture choice.
 */
export const DISCOVER_EMBEDDING_MODEL_CANDIDATE =
  'bge-m3';

export const DISCOVER_EMBEDDING_ARTIFACT_VERSION = 1;

export const DISCOVER_VISIBLE_MATCH_LIMIT = 5;

export const DISCOVER_SEMANTIC_RESULT_LIMIT = 3;

export const DISCOVER_SEMANTIC_RETRIEVE_LIMIT = 8;

export interface DiscoverEmbeddingDocument {
  identity: string;
  text: string;
}

export interface DiscoverSemanticHit {
  identity: string;
  score: number;
}

export interface DiscoverSemanticMatch {
  candidate: DiscoverCandidate;
  score: number;
  provenance: 'semantic_match';
}

export interface DiscoverSemanticQuery {
  query: string;
  contentHash: string;
  limit: number;
}

export function groundedDiscoverIdentity(
  source: string,
  recordId: string,
): string {
  return `${source}:${recordId}`;
}

export function buildDiscoverDocumentText(
  record: Pick<GroundedDiscoverRecord, 'destination' | 'fit'>,
): string {
  const heading = record.destination.countryCode
    ? `${record.destination.name}, ${record.destination.countryCode}`
    : record.destination.name;

  if (!record.fit) {
    return heading;
  }

  return [
    heading,
    `Trip intents: ${joinTags(record.fit.intents)}`,
    `Interests: ${joinTags(record.fit.interests)}`,
    `Pace: ${joinTags(record.fit.paces)}`,
    `Travel style: ${joinTags(record.fit.travelStyles)}`,
    `Daily rhythm: ${joinTags(record.fit.dailyRhythms)}`,
    `Typical party: ${joinTags(record.fit.parties)}`,
  ].join('. ');
}

export function buildDiscoverEmbeddingDocuments(
  records: readonly GroundedDiscoverRecord[],
): DiscoverEmbeddingDocument[] {
  return records.map((record) => ({
    identity: groundedDiscoverIdentity(
      record.source,
      record.id,
    ),
    text: buildDiscoverDocumentText(record),
  }));
}

/**
 * Build a retrieval query from explicit Discover context only.
 *
 * Missing preferences stay missing. Timing and budget ceilings
 * are not destination facts and are omitted.
 */
export function buildDiscoverQueryText(
  personalization: DiscoverPersonalization,
): string | null {
  const lines: string[] = [];

  if (personalization.brief.intent) {
    lines.push(
      `Trip intents: ${personalization.brief.intent}`,
    );
  }

  if (personalization.interests.values.length > 0) {
    lines.push(
      `Interests: ${joinTags(personalization.interests.values)}`,
    );
  }

  if (personalization.pace.value) {
    lines.push(
      `Pace: ${personalization.pace.value}`,
    );
  }

  if (personalization.travelStyle.value) {
    lines.push(
      `Travel style: ${personalization.travelStyle.value}`,
    );
  }

  if (personalization.dailyRhythm.value) {
    lines.push(
      `Daily rhythm: ${personalization.dailyRhythm.value}`,
    );
  }

  if (personalization.party.value) {
    lines.push(
      `Typical party: ${personalization.party.value}`,
    );
  }

  if (lines.length === 0) {
    return null;
  }

  return lines.join('. ');
}

export function hashDiscoverEmbeddingDocuments(
  model: string,
  documents: readonly DiscoverEmbeddingDocument[],
): string {
  const canonical = [
    `version:${DISCOVER_EMBEDDING_ARTIFACT_VERSION}`,
    `model:${model}`,
    ...[...documents]
      .sort((left, right) =>
        left.identity.localeCompare(right.identity),
      )
      .map(
        (document) =>
          `${document.identity}\n${document.text}`,
      ),
  ].join('\n');

  return fnv1a64Hex(canonical);
}

export function prepareDiscoverSemanticQuery(
  brief: DiscoverBrief,
  travelDNA: TravelDNA | null,
  model: string = DISCOVER_EMBEDDING_MODEL_CANDIDATE,
): DiscoverSemanticQuery | null {
  const personalization =
    resolveDiscoverPersonalization(
      brief,
      travelDNA,
    );

  const query =
    buildDiscoverQueryText(personalization);

  if (!query) {
    return null;
  }

  const corpus = loadGroundedDiscoverCorpus();
  const documents =
    buildDiscoverEmbeddingDocuments(corpus.records);

  return {
    query,
    contentHash: hashDiscoverEmbeddingDocuments(
      model,
      documents,
    ),
    limit: DISCOVER_SEMANTIC_RETRIEVE_LIMIT,
  };
}

/**
 * Content hash for the live grounded embedding corpus.
 * Used by Travel Chat so retrieve stays lockstep without
 * requiring a Discover Brief query.
 */
export function getDiscoverEmbeddingContentHash(
  model: string = DISCOVER_EMBEDDING_MODEL_CANDIDATE,
): string {
  const corpus = loadGroundedDiscoverCorpus();
  const documents =
    buildDiscoverEmbeddingDocuments(corpus.records);

  return hashDiscoverEmbeddingDocuments(
    model,
    documents,
  );
}

/**
 * Keep deterministic matches primary. Attach only extra
 * grounded identities from semantic retrieval.
 *
 * Unknown identities are dropped. Scores are never written
 * to SQLite.
 */
export function mergeSemanticDiscoverMatches(input: {
  deterministic: readonly DiscoverMatch[];
  semanticHits: readonly DiscoverSemanticHit[];
  candidatesByIdentity: ReadonlyMap<string, DiscoverCandidate>;
  visibleDeterministicCount?: number;
  semanticLimit?: number;
}): {
  primary: DiscoverMatch[];
  semantic: DiscoverSemanticMatch[];
} {
  const visibleDeterministicCount =
    input.visibleDeterministicCount ??
    DISCOVER_VISIBLE_MATCH_LIMIT;

  const semanticLimit =
    input.semanticLimit ??
    DISCOVER_SEMANTIC_RESULT_LIMIT;

  const primary = input.deterministic.slice(
    0,
    visibleDeterministicCount,
  );

  const shown = new Set(
    primary.map((match) => match.candidate.id),
  );

  const semantic: DiscoverSemanticMatch[] = [];

  for (const hit of input.semanticHits) {
    if (semantic.length >= semanticLimit) {
      break;
    }

    if (
      typeof hit.identity !== 'string' ||
      !hit.identity ||
      shown.has(hit.identity) ||
      !Number.isFinite(hit.score)
    ) {
      continue;
    }

    const candidate =
      input.candidatesByIdentity.get(hit.identity);

    if (!candidate) {
      continue;
    }

    semantic.push({
      candidate,
      score: hit.score,
      provenance: 'semantic_match',
    });

    shown.add(hit.identity);
  }

  return {
    primary,
    semantic,
  };
}

export function resolveSemanticDiscoverMatches(
  deterministic: readonly DiscoverMatch[],
  semanticHits: readonly DiscoverSemanticHit[],
): DiscoverSemanticMatch[] {
  const candidatesByIdentity = new Map(
    getGroundedDiscoverCandidates().map(
      (candidate) => [candidate.id, candidate],
    ),
  );

  return mergeSemanticDiscoverMatches({
    deterministic,
    semanticHits,
    candidatesByIdentity,
  }).semantic;
}

function joinTags(
  values: readonly string[],
): string {
  return values.join(', ');
}

function fnv1a64Hex(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, '0');
}
