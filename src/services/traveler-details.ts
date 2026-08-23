import type {
  Traveler,
  TravelerType,
} from '@/domain/entities';

export const TRAVELER_TYPES: TravelerType[] = [
  'adult',
  'child',
  'infant',
];

export interface TravelerInput {
  firstName: string;
  lastName?: string;
  type: TravelerType;
  email?: string;
  phone?: string;
}

function optionalText(
  value: string | undefined,
): string | undefined {
  return value?.trim() || undefined;
}

export function cleanTravelerInput(
  input: TravelerInput,
): TravelerInput {
  const firstName = input.firstName.trim();
  const lastName = optionalText(input.lastName);
  const email = optionalText(input.email);
  const phone = optionalText(input.phone);

  if (!firstName) {
    throw new Error('First name is required');
  }

  if (!TRAVELER_TYPES.includes(input.type)) {
    throw new Error('Traveler type is not supported');
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+$/.test(email)
  ) {
    throw new Error('Email address is not valid');
  }

  return {
    firstName,
    lastName,
    type: input.type,
    email,
    phone,
  };
}

export function travelerDisplayName(
  traveler: Pick<
    Traveler,
    'firstName' | 'lastName'
  >,
): string {
  return [
    traveler.firstName,
    traveler.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

export function travelerInitials(
  traveler: Pick<
    Traveler,
    'firstName' | 'lastName'
  >,
): string {
  return [
    traveler.firstName,
    traveler.lastName,
  ]
    .filter(Boolean)
    .map((part) => part?.trim().charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
