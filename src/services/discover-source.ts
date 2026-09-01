import type {
  DiscoverCandidateSource,
} from '@/domain/entities';

import type {
  DiscoverCatalogueRecord,
} from './discover-catalogue';

/**
 * One explicit grounded destination source.
 *
 * A pack is reviewed data with provenance.
 * AI is not a destination source.
 */
export interface DiscoverGroundedPack {
  id: string;
  source: DiscoverCandidateSource;
  records: readonly DiscoverCatalogueRecord[];
}
