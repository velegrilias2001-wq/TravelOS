export type TravelDNAId = string;

export type TravelPace =
  | 'slow'
  | 'balanced'
  | 'full';

export type TravelInterest =
  | 'food'
  | 'culture'
  | 'nature'
  | 'beaches'
  | 'nightlife'
  | 'shopping'
  | 'wellness'
  | 'adventure';

export type TravelStyle =
  | 'local'
  | 'iconic'
  | 'mix';

export type BudgetStyle =
  | 'value'
  | 'comfortable'
  | 'premium';

export type DailyRhythm =
  | 'morning'
  | 'flexible'
  | 'night';

export type TypicalTravelParty =
  | 'solo'
  | 'couple'
  | 'friends'
  | 'family';

/**
 * Explicit, editable traveller preferences.
 *
 * V1 intentionally stores only facts the user chooses.
 * No inferred traits, scores or AI-generated profile data.
 */
export interface TravelDNA {
  id: TravelDNAId;

  pace?: TravelPace;
  interests: TravelInterest[];
  travelStyle?: TravelStyle;
  budgetStyle?: BudgetStyle;
  dailyRhythm?: DailyRhythm;
  typicalParty?: TypicalTravelParty;

  createdAt: string;
  updatedAt: string;
}
