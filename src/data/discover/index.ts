import {
  CURATED_SOUTH_CENTRAL_EUROPE_PACK,
} from './curated-south-central-europe';

import {
  CURATED_WESTERN_EUROPE_PACK,
} from './curated-western-europe';

import type {
  DiscoverGroundedPack,
} from '../../services/discover-source';

export const DEFAULT_DISCOVER_PACKS:
  readonly DiscoverGroundedPack[] = [
    CURATED_WESTERN_EUROPE_PACK,
    CURATED_SOUTH_CENTRAL_EUROPE_PACK,
  ];

export {
  CURATED_SOUTH_CENTRAL_EUROPE_PACK,
  CURATED_WESTERN_EUROPE_PACK,
};
