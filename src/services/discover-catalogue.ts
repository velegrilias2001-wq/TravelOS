import type {
  BudgetStyle,
  DailyRhythm,
  DiscoverDestination,
  TravelInterest,
  TravelStyle,
  TripIntent,
  TripPace,
  TypicalTravelParty,
} from '@/domain/entities';

/**
 * A source that supports one or more facts used in the
 * curated Discover catalogue.
 *
 * Curated does not mean invented.
 * Every catalogue destination must retain explicit provenance.
 */
export interface DiscoverCatalogueEvidence {
  label: string;
  url: string;

  /**
   * ISO calendar date:
   * YYYY-MM-DD
   */
  checkedAt: string;
}

/**
 * Explicit editorial fit metadata used for matching.
 *
 * These are catalogue assertions, not AI-generated facts.
 */
export interface DiscoverCatalogueFitProfile {
  intents: TripIntent[];

  interests: TravelInterest[];

  paces: TripPace[];

  travelStyles: TravelStyle[];

  dailyRhythms: DailyRhythm[];

  parties: TypicalTravelParty[];

  /**
   * Empty means this dimension is not used for matching.
   */
  budgetStyles: BudgetStyle[];
}

/**
 * Optional source-backed timing information.
 */
export interface DiscoverCatalogueTimingProfile {
  /**
   * Calendar month numbers:
   * 1 = January, 12 = December.
   */
  supportedMonths: number[];
}

/**
 * One grounded destination in the TravelOS Discover catalogue.
 *
 * Place facts and evidence are required.
 * Editorial `fit` is optional: without it the record can live
 * in the grounded corpus but cannot be deterministically matched.
 */
export interface DiscoverCatalogueRecord {
  id: string;

  destination: DiscoverDestination;

  fit?: DiscoverCatalogueFitProfile;

  timing?: DiscoverCatalogueTimingProfile;

  evidence: DiscoverCatalogueEvidence[];
}

export type DiscoverMatchableRecord =
  DiscoverCatalogueRecord & {
    fit: DiscoverCatalogueFitProfile;
  };

export function isDiscoverMatchableRecord(
  record: DiscoverCatalogueRecord,
): record is DiscoverMatchableRecord {
  return record.fit !== undefined;
}
