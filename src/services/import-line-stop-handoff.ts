import type { ImportClaim } from '@/domain/entities/import-claim';

import { parseBookingTemporalValue } from './booking-time';

/**
 * Route params when an itinerary_line claim opens Plan.
 * Never writes a TripStop by itself — Plan save is the write.
 */
export interface ImportLineStopRouteParams
  extends Record<string, string | undefined> {
  source: 'import_line';
  importClaimId: string;
  importTitle: string;
  importStartTime?: string;
  importEndTime?: string;
  importDayDate?: string;
  importLocationName?: string;
  importBatchId?: string;
}

/**
 * Prefer local wall-clock parts when the claim stores
 * timezone-free local time. Absolute instants stay blank —
 * Plan uses trip-day local HH:mm and must not invent a zone.
 */
function localWallClockParts(
  value: string | undefined,
): { date?: string; time?: string } {
  if (!value) {
    return {};
  }

  const parsed = parseBookingTemporalValue(value);

  if (parsed.kind !== 'local-wall-time') {
    return {};
  }

  return {
    date: parsed.date,
    time: parsed.time,
  };
}

export function buildImportLineStopHandoff(
  claim: ImportClaim,
): ImportLineStopRouteParams {
  if (claim.kind !== 'itinerary_line') {
    throw new Error(
      'Only itinerary line claims can open Plan as a stop draft.',
    );
  }

  const title = claim.title.trim();

  if (title.length < 1) {
    throw new Error(
      'This itinerary line has no title to prefill.',
    );
  }

  const startParts = localWallClockParts(claim.startAt);
  const endParts = localWallClockParts(claim.endAt);

  // Day matching uses local-wall date or explicit evidence only.
  // Absolute instants do not contribute a calendar day (zone unknown).
  const dayDate =
    startParts.date ?? claim.evidence.calendarDate;

  const locationName = claim.locationText?.trim() || undefined;

  return {
    source: 'import_line',
    importClaimId: claim.id,
    importTitle: title,
    importStartTime: startParts.time,
    importEndTime: endParts.time,
    importDayDate: dayDate,
    importLocationName: locationName,
    importBatchId: claim.batchId,
  };
}
