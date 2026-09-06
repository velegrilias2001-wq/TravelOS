import type { PackingItem } from '@/domain/entities/packing-item';
import type { TravelDNA } from '@/domain/entities/travel-dna';

import { packingProgress } from './packing-progress';
import {
  selectTripReadiness,
} from './trip-readiness';
import type { TripWorkspace } from './trip-service';

/**
 * Read-only evidence assembled for Travel Intelligence.
 * Never invents facts; missing fields stay missing.
 */
export type TripEvidencePack = {
  tripId: string;
  title: string;
  startDate: string;
  endDate: string;
  destinationNames: string[];
  intent: string | null;
  pace: string | null;
  readinessPercent: number | null;
  readinessGaps: string[];
  packingTotal: number;
  packingPacked: number;
  pendingImportClaims: number;
  travelDnaSummary: {
    pace: string | null;
    interests: string[];
    travelStyle: string | null;
  } | null;
};

export function buildTripEvidencePack(input: {
  workspace: TripWorkspace;
  packingItems?: readonly PackingItem[];
  pendingImportClaims?: number;
  travelDNA?: TravelDNA | null;
}): TripEvidencePack {
  const { workspace } = input;
  const readiness = selectTripReadiness(workspace);
  const packing = packingProgress(input.packingItems ?? []);

  return {
    tripId: workspace.trip.id,
    title: workspace.trip.title,
    startDate: workspace.trip.startDate,
    endDate: workspace.trip.endDate,
    destinationNames: workspace.trip.destinations.map(
      (destination) => destination.name,
    ),
    intent: workspace.trip.intent ?? null,
    pace: workspace.trip.pace ?? null,
    readinessPercent: readiness.percentReady,
    readinessGaps: readiness.checklist
      .filter((item) => !item.ready)
      .map((item) => item.id),
    packingTotal: packing.total,
    packingPacked: packing.packed,
    pendingImportClaims: input.pendingImportClaims ?? 0,
    travelDnaSummary: input.travelDNA
      ? {
          pace: input.travelDNA.pace ?? null,
          interests: [...input.travelDNA.interests],
          travelStyle: input.travelDNA.travelStyle ?? null,
        }
      : null,
  };
}

export function summarizeTripEvidencePack(
  pack: TripEvidencePack,
): string {
  const destinations =
    pack.destinationNames.length > 0
      ? pack.destinationNames.join(', ')
      : 'No destination names saved';

  const readiness =
    pack.readinessPercent == null
      ? 'Readiness unknown'
      : `${pack.readinessPercent}% ready · gaps: ${
          pack.readinessGaps.length > 0
            ? pack.readinessGaps.join(', ')
            : 'none'
        }`;

  const packing =
    pack.packingTotal === 0
      ? 'Packing empty'
      : `${pack.packingPacked}/${pack.packingTotal} packed`;

  const imports =
    pack.pendingImportClaims > 0
      ? `${pack.pendingImportClaims} pending import claim(s)`
      : 'No pending import claims';

  return [
    `${pack.title} · ${pack.startDate} → ${pack.endDate}`,
    destinations,
    readiness,
    packing,
    imports,
  ].join('\n');
}
