export type TravelerId = string;

export type TravelerType =
  | 'adult'
  | 'child'
  | 'infant';

export type TripTravelerRole =
  | 'owner'
  | 'member';

export interface Traveler {
  id: TravelerId;

  firstName: string;
  lastName?: string;

  type: TravelerType;

  email?: string;
  phone?: string;

  avatarUri?: string;

  createdAt: string;
  updatedAt: string;
}