import type {
  DiscoverBrief,
  TravelDNA,
} from '@/domain/entities';

import {
  loadGroundedDiscoverCorpus,
  type GroundedDiscoverRecord,
} from './discover-corpus';

import {
  groundedDiscoverIdentity,
} from './discover-semantic';

import {
  resolveDiscoverPersonalization,
} from './discover-personalization';

export const DISCOVER_EXPLANATION_SENTENCE_LIMIT = 2;

export const DISCOVER_EXPLANATION_MAX_CHARS = 180;

const FIT_TOKENS = [
  'relax',
  'explore',
  'food',
  'nature',
  'event',
  'social',
  'romantic',
  'family',
  'work_leisure',
  'slow',
  'balanced',
  'full',
  'culture',
  'beaches',
  'nightlife',
  'shopping',
  'wellness',
  'adventure',
  'local',
  'iconic',
  'mix',
  'value',
  'comfortable',
  'premium',
  'morning',
  'flexible',
  'night',
  'solo',
  'couple',
  'friends',
] as const;

export interface DiscoverExplanationBrief {
  intent?: string;
  pace?: string;
  interests: string[];
  party?: string;
  travelStyle?: string;
  dailyRhythm?: string;
}

export interface DiscoverExplanationRecord {
  name: string;
  countryCode?: string;
  fit?: {
    intents: string[];
    interests: string[];
    paces: string[];
    travelStyles: string[];
    dailyRhythms: string[];
    parties: string[];
  };
  evidenceLabels: string[];
}

export interface DiscoverExplanationRequest {
  identity: string;
  brief: DiscoverExplanationBrief;
  record: DiscoverExplanationRecord;
  forbiddenNames: string[];
}

export interface DiscoverExplanationResult {
  identity: string;
  sentences: string[];
}

export function findGroundedDiscoverRecord(
  identity: string,
): GroundedDiscoverRecord | null {
  return (
    loadGroundedDiscoverCorpus().records.find(
      (record) =>
        groundedDiscoverIdentity(
          record.source,
          record.id,
        ) === identity,
    ) ?? null
  );
}

export function prepareDiscoverExplanationRequest(
  brief: DiscoverBrief,
  travelDNA: TravelDNA | null,
  identity: string,
): DiscoverExplanationRequest | null {
  const record = findGroundedDiscoverRecord(identity);

  if (!record) {
    return null;
  }

  const personalization =
    resolveDiscoverPersonalization(
      brief,
      travelDNA,
    );

  const forbiddenNames = loadGroundedDiscoverCorpus()
    .records
    .map((entry) => entry.destination.name)
    .filter(
      (name) =>
        name.toLowerCase() !==
        record.destination.name.toLowerCase(),
    );

  return {
    identity,
    brief: {
      intent: personalization.brief.intent,
      pace: personalization.pace.value,
      interests: [...personalization.interests.values],
      party: personalization.party.value,
      travelStyle: personalization.travelStyle.value,
      dailyRhythm: personalization.dailyRhythm.value,
    },
    record: {
      name: record.destination.name,
      countryCode: record.destination.countryCode,
      fit: record.fit
        ? {
            intents: [...record.fit.intents],
            interests: [...record.fit.interests],
            paces: [...record.fit.paces],
            travelStyles: [...record.fit.travelStyles],
            dailyRhythms: [...record.fit.dailyRhythms],
            parties: [...record.fit.parties],
          }
        : undefined,
      evidenceLabels: record.evidence.map(
        (evidence) => evidence.label,
      ),
    },
    forbiddenNames,
  };
}

export function assertGroundedDiscoverExplanation(
  result: DiscoverExplanationResult,
  request: DiscoverExplanationRequest,
): string[] {
  if (result.identity !== request.identity) {
    throw new Error(
      'Explanation identity does not match the grounded record',
    );
  }

  return assertExplanationSentences(
    result.sentences,
    request,
  );
}

export function assertExplanationSentences(
  sentences: unknown,
  request: DiscoverExplanationRequest,
): string[] {
  if (
    !Array.isArray(sentences) ||
    sentences.length < 1 ||
    sentences.length >
      DISCOVER_EXPLANATION_SENTENCE_LIMIT
  ) {
    throw new Error(
      'Explanation must contain one or two sentences',
    );
  }

  const parsed = sentences.map((sentence) => {
    if (
      typeof sentence !== 'string' ||
      !sentence.trim()
    ) {
      throw new Error(
        'Explanation contains an empty sentence',
      );
    }

    const text = sentence.trim();

    if (text.length > DISCOVER_EXPLANATION_MAX_CHARS) {
      throw new Error(
        'Explanation sentence exceeds the grounded length limit',
      );
    }

    assertSentenceIsGrounded(text, request);

    return text;
  });

  return parsed;
}

function assertSentenceIsGrounded(
  text: string,
  request: DiscoverExplanationRequest,
) {
  if (
    /https?:\/\//i.test(text) ||
    /www\./i.test(text)
  ) {
    throw new Error(
      'Explanation invented a URL',
    );
  }

  if (
    /[€$£]\s*\d/.test(text) ||
    /\d[\d,]*(?:\.\d+)?\s*(?:eur|usd|gbp)/i.test(
      text,
    )
  ) {
    throw new Error(
      'Explanation invented a price',
    );
  }

  if (
    /-?\d{1,3}\.\d{3,}/.test(text)
  ) {
    throw new Error(
      'Explanation invented coordinates',
    );
  }

  const lower = text.toLowerCase();
  const allowedName = request.record.name.toLowerCase();

  for (const name of request.forbiddenNames) {
    if (
      name &&
      name.toLowerCase() !== allowedName &&
      lower.includes(name.toLowerCase())
    ) {
      throw new Error(
        `Explanation mentioned another destination "${name}"`,
      );
    }
  }

  const allowedTags = new Set<string>();

  if (request.record.fit) {
    for (const values of Object.values(request.record.fit)) {
      for (const value of values) {
        allowedTags.add(value);
      }
    }
  }

  for (const token of FIT_TOKENS) {
    if (!containsToken(lower, token)) {
      continue;
    }

    if (!request.record.fit) {
      throw new Error(
        `Explanation invented a fit tag "${token}"`,
      );
    }

    if (!allowedTags.has(token)) {
      throw new Error(
        `Explanation invented a fit tag "${token}"`,
      );
    }
  }
}

function containsToken(
  haystack: string,
  token: string,
): boolean {
  const pattern = token.replaceAll('_', '[\\s_-]+');

  return new RegExp(
    `(^|[^a-z])${pattern}([^a-z]|$)`,
    'i',
  ).test(haystack);
}
