import type {
  DiscoverCandidate,
} from '@/domain/entities';

import {
  loadGroundedDiscoverCorpus,
  type GroundedDiscoverRecord,
} from './discover-corpus';

/**
 * Convert one grounded corpus record into the canonical
 * candidate shape understood by Discover.
 *
 * No facts are added here.
 */
export function mapGroundedRecordToCandidate(
  record: GroundedDiscoverRecord,
): DiscoverCandidate {
  return {
    id: `${record.source}:${record.id}`,

    destination: {
      ...record.destination,
    },

    source: record.source,

    sourceId: record.id,
  };
}

/**
 * Return every grounded destination currently in the corpus,
 * including records that have no editorial fit.
 *
 * The corpus is validated before anything reaches Discover.
 * AI is not involved in this step.
 */
export function getGroundedDiscoverCandidates():
  DiscoverCandidate[] {
  return loadGroundedDiscoverCorpus()
    .records
    .map(mapGroundedRecordToCandidate);
}
