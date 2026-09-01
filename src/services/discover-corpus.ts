import {
  DEFAULT_DISCOVER_PACKS,
} from '../data/discover';

import {
  isDiscoverMatchableRecord,
  type DiscoverCatalogueRecord,
  type DiscoverMatchableRecord,
} from './discover-catalogue';

import {
  validateDiscoverCatalogueRecord,
} from './discover-catalogue-validation';

import type {
  DiscoverGroundedPack,
} from './discover-source';

export interface GroundedDiscoverRecord
  extends DiscoverCatalogueRecord {
  source: DiscoverGroundedPack['source'];
  packId: string;
}

export interface DiscoverCorpus {
  records: GroundedDiscoverRecord[];
  matchableRecords: Array<
    GroundedDiscoverRecord & DiscoverMatchableRecord
  >;
}

function groundedIdentity(
  source: GroundedDiscoverRecord['source'],
  recordId: string,
): string {
  return `${source}:${recordId}`;
}

/**
 * Load and validate grounded Discover packs.
 *
 * Identity is (source, record id), never destination name.
 * Invalid packs fail closed.
 * AI is not involved.
 */
export function loadGroundedDiscoverCorpus(
  packs: readonly DiscoverGroundedPack[] =
    DEFAULT_DISCOVER_PACKS,
): DiscoverCorpus {
  const records: GroundedDiscoverRecord[] = [];
  const identities = new Set<string>();

  for (const pack of packs) {
    if (!pack.id.trim()) {
      throw new Error(
        'Discover pack id must not be empty.',
      );
    }

    for (const record of pack.records) {
      validateDiscoverCatalogueRecord(
        record,
      );

      const identity =
        groundedIdentity(
          pack.source,
          record.id,
        );

      if (identities.has(identity)) {
        throw new Error(
          `Discover corpus: duplicate grounded identity "${identity}".`,
        );
      }

      identities.add(identity);

      records.push({
        ...record,
        source: pack.source,
        packId: pack.id,
      });
    }
  }

  return {
    records,
    matchableRecords: records.filter(
      (
        record,
      ): record is GroundedDiscoverRecord &
        DiscoverMatchableRecord =>
        isDiscoverMatchableRecord(
          record,
        ),
    ),
  };
}
