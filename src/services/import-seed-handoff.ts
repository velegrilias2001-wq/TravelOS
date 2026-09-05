import type { ImportClaim } from '@/domain/entities/import-claim';

/**
 * Route params when a trip_seed claim hands off to /new-trip.
 * Never creates a Trip by itself.
 */
export interface ImportSeedTripRouteParams
  extends Record<string, string | undefined> {
  source: 'import_seed';
  title?: string;
  startDate?: string;
  endDate?: string;
  seedClaimId?: string;
}

function calendarDateOnly(
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1];
}

export function buildImportSeedTripHandoff(
  claim: ImportClaim,
): ImportSeedTripRouteParams {
  if (claim.kind !== 'trip_seed') {
    throw new Error(
      'Only trip seed claims can open Create Trip.',
    );
  }

  return {
    source: 'import_seed',
    title: claim.title,
    startDate: calendarDateOnly(claim.startAt),
    endDate: calendarDateOnly(claim.endAt),
    seedClaimId: claim.id,
  };
}
