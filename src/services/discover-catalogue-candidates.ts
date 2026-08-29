import type {
    DiscoverCandidate,
} from '@/domain/entities';

import {
    CURATED_DISCOVER_CATALOGUE,
    type DiscoverCatalogueRecord,
} from './discover-catalogue';

import {
    validateDiscoverCatalogue,
} from './discover-catalogue-validation';

/**
 * Convert one grounded curated catalogue record into
 * the canonical candidate shape understood by Discover.
 *
 * No facts are added here.
 * The candidate contains only destination truth that
 * already exists in the curated record.
 */
export function mapCatalogueRecordToCandidate(
  record: DiscoverCatalogueRecord,
): DiscoverCandidate {
  return {
    id: `curated:${record.id}`,

    destination: {
      ...record.destination,
    },

    source: 'curated',

    sourceId: record.id,
  };
}

/**
 * Return the grounded destination candidates currently
 * available from the TravelOS curated catalogue.
 *
 * The catalogue is validated before anything reaches
 * Discover.
 *
 * AI is not involved in this step.
 */
export function getCuratedDiscoverCandidates():
  DiscoverCandidate[] {
  const catalogue =
    validateDiscoverCatalogue(
      CURATED_DISCOVER_CATALOGUE,
    );

  return catalogue.map(
    mapCatalogueRecordToCandidate,
  );
}