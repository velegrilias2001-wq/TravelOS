import type {
  ImportClaimConfidence,
  ImportClaimEvidence,
  ImportClaimKind,
} from '../domain/entities/import-claim';
import { hashImportText } from './import-ics';

/**
 * Build reviewable claims from OCR text of a confirmation photo.
 * Never invents destinations, coordinates, or missing times.
 * Claims stay PENDING until the traveler confirms.
 */

export type OcrExtractedClaim = {
  kind: Extract<ImportClaimKind, 'booking' | 'itinerary_line'>;
  title: string;
  startAt?: string;
  endAt?: string;
  locationText?: string;
  confidence: ImportClaimConfidence;
  evidence: ImportClaimEvidence;
};

export type OcrExtractResult = {
  contentHash: string;
  skippedCount: number;
  claims: OcrExtractedClaim[];
};

export const IMPORT_OCR_EMPTY_ERROR =
  'No confirmation details were readable in this photo.';

const ISO_DATE =
  /\b(20\d{2}|19\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;

const CONFIRMATION_CODE =
  /\b(?:confirmation(?:\s+code)?|booking(?:\s+ref(?:erence)?)?|reservation|ref(?:erence)?|pnr)\s*[:=#-]\s*([A-Z0-9]{5,12})\b|\b(?:confirmation|booking|reservation|ref|pnr)\s+([A-Z0-9]*\d[A-Z0-9]{4,11})\b/i;

const FLIGHT_CODE =
  /\b([A-Z]{2}\s?\d{2,4})\b/;

const HOTEL_LINE =
  /\b(?:hotel|hostel|resort|inn)\s+([A-Za-z0-9][A-Za-z0-9 .'-]{2,40})/i;

export function hashImportOcrContent(text: string): string {
  return hashImportText(`ocr:${text}`);
}

export function extractImportOcrClaims(
  rawText: string,
): OcrExtractResult {
  const text = rawText.replace(/\r\n/g, '\n').trim();

  if (!text) {
    throw new Error(IMPORT_OCR_EMPTY_ERROR);
  }

  const claims: OcrExtractedClaim[] = [];
  let skippedCount = 0;

  const dates = [...text.matchAll(ISO_DATE)].map(
    (match) => match[0],
  );
  const uniqueDates = [...new Set(dates)].sort();
  ISO_DATE.lastIndex = 0;

  const confirmationMatch = CONFIRMATION_CODE.exec(text);
  const confirmationCode = (
    confirmationMatch?.[1] ||
    confirmationMatch?.[2] ||
    ''
  )
    .trim()
    .toUpperCase();
  const confirmation =
    confirmationCode && /\d/.test(confirmationCode)
      ? confirmationCode
      : null;
  const flight = FLIGHT_CODE.exec(text);
  const hotel = HOTEL_LINE.exec(text);

  const hasSignal =
    Boolean(confirmation) ||
    Boolean(flight) ||
    Boolean(hotel) ||
    uniqueDates.length > 0 ||
    /\b(confirmation|booking|reservation|itinerary|check[- ]?in)\b/i.test(
      text,
    );

  if (!hasSignal) {
    throw new Error(IMPORT_OCR_EMPTY_ERROR);
  }

  const title =
    (hotel?.[1] && `Stay · ${sanitizeTitle(hotel[1])}`) ||
    (flight?.[1] && `Flight · ${flight[1].replace(/\s+/g, '')}`) ||
    (confirmation &&
      `Confirmation · ${confirmation}`) ||
    firstShortLine(text) ||
    'Confirmation photo';

  const fieldsPresent = ['ocr_text'];

  if (uniqueDates[0]) {
    fieldsPresent.push('startAt');
  }

  if (uniqueDates.length >= 2) {
    fieldsPresent.push('endAt');
  }

  if (confirmation) {
    fieldsPresent.push('confirmationCode');
  }

  if (hotel?.[1] || /location|address|airport/i.test(text)) {
    fieldsPresent.push('locationText');
  }

  claims.push({
    kind: hotel || confirmation || flight ? 'booking' : 'itinerary_line',
    title: sanitizeTitle(title),
    startAt: uniqueDates[0],
    endAt:
      uniqueDates.length >= 2
        ? uniqueDates[uniqueDates.length - 1]
        : uniqueDates[0],
    locationText: hotel?.[1]
      ? sanitizeTitle(hotel[1])
      : undefined,
    confidence: confidenceFor(fieldsPresent),
    evidence: {
      fieldsPresent,
      ...(confirmation ? { icsUid: `ocr:${confirmation}` } : {}),
    },
  });

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 8 && line.length <= 90);

  for (const line of lines.slice(0, 8)) {
    if (
      sanitizeTitle(line).toLowerCase() ===
      sanitizeTitle(title).toLowerCase()
    ) {
      continue;
    }

    if (
      !/\b(flight|train|ferry|hotel|check[- ]?in|depart|arrive|gate|seat)\b/i.test(
        line,
      )
    ) {
      skippedCount += 1;
      continue;
    }

    claims.push({
      kind: 'itinerary_line',
      title: sanitizeTitle(line),
      confidence: 'low',
      evidence: {
        fieldsPresent: ['ocr_text', 'title'],
        dayHint: true,
      },
    });
  }

  if (claims.length === 0) {
    throw new Error(IMPORT_OCR_EMPTY_ERROR);
  }

  return {
    contentHash: hashImportOcrContent(text),
    skippedCount,
    claims,
  };
}

function confidenceFor(
  fieldsPresent: string[],
): ImportClaimConfidence {
  if (
    fieldsPresent.includes('confirmationCode') &&
    fieldsPresent.includes('startAt')
  ) {
    return 'medium';
  }

  if (fieldsPresent.includes('startAt')) {
    return 'low';
  }

  return 'low';
}

function firstShortLine(text: string): string | null {
  const line = text
    .split('\n')
    .map((value) => value.trim())
    .find((value) => value.length >= 4 && value.length <= 60);

  return line ?? null;
}

function sanitizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 80);
}
