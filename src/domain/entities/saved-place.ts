import type {
  DiscoverCandidateSource,
} from './discover';

/**
 * A saved Discover candidate.
 *
 * This is not a Trip, not a World visited place, and not
 * planned itinerary truth. It is an explicit candidate
 * the traveler chose to keep.
 */
export type SavedPlaceKind =
  | 'destination'
  | 'journey';

export type SavedPlaceId = string;

export interface SavedPlace {
  id: SavedPlaceId;

  kind: SavedPlaceKind;

  /**
   * Grounded identity such as curated:pt-porto
   * or curated:slow-porto. Never a destination name.
   */
  groundedIdentity: string;

  source: DiscoverCandidateSource;

  createdAt: string;
  updatedAt: string;
}
