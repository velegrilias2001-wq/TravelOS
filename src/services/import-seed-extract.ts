import type {
  ImportClaimConfidence,
  ImportClaimEvidence,
  ImportClaimKind,
} from '../domain/entities/import-claim';
import { hashImportText } from './import-ics';

/**
 * Heuristic seed extraction from plain document text.
 * Never invents destinations or coordinates.
 * Claims stay PENDING until the traveler confirms.
 */

export type SeedExtractedClaim = {
  kind: Extract<ImportClaimKind, 'trip_seed' | 'itinerary_line'>;
  title: string;
  startAt?: string;
  endAt?: string;
  locationText?: string;
  confidence: ImportClaimConfidence;
  evidence: ImportClaimEvidence;
};

export type SeedExtractResult = {
  contentHash: string;
  skippedCount: number;
  claims: SeedExtractedClaim[];
};

const ISO_DATE =
  /\b(20\d{2}|19\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;

const DAY_LINE =
  /^(?:day\s*(\d+)|ημέρα\s*(\d+))\s*[:.\-–—]?\s*(.+)$/i;

const BULLET_LINE =
  /^[-*•]\s+(.+)$/;

const TIME_PREFIX =
  /^(\d{1,2}:\d{2})\s+(.+)$/;

export const IMPORT_SEED_EMPTY_ERROR =
  'No trip dates or itinerary lines were found in this document.';

export function hashImportSeedContent(text: string): string {
  return hashImportText(text);
}

/**
 * Extract reviewable seed claims from document prose.
 * Fail closed when nothing structured is found.
 */
export function extractImportSeedClaims(
  rawText: string,
): SeedExtractResult {
  const text = rawText.replace(/\r\n/g, '\n').trim();

  if (!text) {
    throw new Error(IMPORT_SEED_EMPTY_ERROR);
  }

  const dates = [...text.matchAll(ISO_DATE)].map(
    (match) => match[0],
  );
  const uniqueDates = [...new Set(dates)].sort();

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const claims: SeedExtractedClaim[] = [];
  let skippedCount = 0;

  const titleLine =
    lines.find(
      (line) =>
        line.length >= 4 &&
        line.length <= 80 &&
        !ISO_DATE.test(line) &&
        !BULLET_LINE.test(line) &&
        !DAY_LINE.test(line),
    ) ?? 'Imported trip idea';

  // Reset lastIndex after .test on global-ish patterns
  ISO_DATE.lastIndex = 0;

  if (uniqueDates.length >= 1 || titleLine) {
    claims.push({
      kind: 'trip_seed',
      title: sanitizeTitle(titleLine),
      startAt: uniqueDates[0],
      endAt:
        uniqueDates.length >= 2
          ? uniqueDates[uniqueDates.length - 1]
          : uniqueDates[0],
      confidence:
        uniqueDates.length >= 2 ? 'medium' : 'low',
      evidence: {
        fieldsPresent: [
          'title',
          ...(uniqueDates[0] ? ['startAt'] : []),
          ...(uniqueDates.length >= 2 ? ['endAt'] : []),
        ],
        calendarDate: uniqueDates[0],
      },
    });
  }

  for (const line of lines) {
    const dayMatch = line.match(DAY_LINE);
    if (dayMatch) {
      const body = (dayMatch[3] ?? '').trim();
      if (body.length < 2) {
        skippedCount += 1;
        continue;
      }

      claims.push({
        kind: 'itinerary_line',
        title: sanitizeTitle(body),
        confidence: 'medium',
        evidence: {
          fieldsPresent: ['title', 'dayHint'],
        },
      });
      continue;
    }

    const bulletMatch = line.match(BULLET_LINE);
    if (bulletMatch) {
      const body = bulletMatch[1].trim();
      const timed = body.match(TIME_PREFIX);
      const title = sanitizeTitle(
        timed ? timed[2] : body,
      );

      if (title.length < 2) {
        skippedCount += 1;
        continue;
      }

      claims.push({
        kind: 'itinerary_line',
        title,
        confidence: 'low',
        evidence: {
          fieldsPresent: timed
            ? ['title', 'timeHint']
            : ['title'],
        },
      });
      continue;
    }
  }

  // Cap itinerary noise
  const tripSeeds = claims.filter((c) => c.kind === 'trip_seed');
  const linesOnly = claims
    .filter((c) => c.kind === 'itinerary_line')
    .slice(0, 24);

  const limited = [...tripSeeds, ...linesOnly];

  if (limited.length === 0) {
    throw new Error(IMPORT_SEED_EMPTY_ERROR);
  }

  return {
    contentHash: hashImportSeedContent(text),
    skippedCount,
    claims: limited,
  };
}

function sanitizeTitle(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 120);
}
