import type { DiscoverBrief } from '@/domain/entities/discover';
import type {
  TravelDNA,
  TravelInterest,
  TravelPace,
  TypicalTravelParty,
} from '@/domain/entities/travel-dna';
import type { Trip, TripPace } from '@/domain/entities/trip';

import type { TravelDNAInput } from './travel-dna-service';

/**
 * Confirm-gated Travel DNA proposals from explicit Brief / trip
 * choices the traveler already made. Never invents traits.
 */
export type DnaReflectionProposal =
  | {
      id: 'pace';
      field: 'pace';
      title: string;
      body: string;
      value: TravelPace;
    }
  | {
      id: 'interests';
      field: 'interests';
      title: string;
      body: string;
      value: TravelInterest[];
    }
  | {
      id: 'party';
      field: 'party';
      title: string;
      body: string;
      value: TypicalTravelParty;
    };

function asTravelPace(
  pace: TripPace | TravelPace | undefined,
): TravelPace | null {
  if (
    pace === 'slow' ||
    pace === 'balanced' ||
    pace === 'full'
  ) {
    return pace;
  }

  return null;
}

export function selectDnaReflectionProposals(input: {
  travelDNA: TravelDNA | null;
  brief?: DiscoverBrief | null;
  trip?: Pick<Trip, 'pace' | 'partyType'> | null;
}): DnaReflectionProposal[] {
  const proposals: DnaReflectionProposal[] = [];
  const dna = input.travelDNA;
  const brief = input.brief ?? null;
  const trip = input.trip ?? null;

  const proposedPace =
    asTravelPace(brief?.pace) ?? asTravelPace(trip?.pace);

  if (proposedPace && !dna?.pace) {
    proposals.push({
      id: 'pace',
      field: 'pace',
      title: 'Να αποθηκευτεί αυτός ο ρυθμός στο Travel DNA;',
      body: `Επέλεξες ${proposedPace} για αυτό το ταξίδι. Να μείνει στις μόνιμες προτιμήσεις σου;`,
      value: proposedPace,
    });
  }

  const briefInterests = brief?.interests ?? [];
  const missingInterests = briefInterests.filter(
    (interest) => !(dna?.interests ?? []).includes(interest),
  );

  if (missingInterests.length > 0) {
    proposals.push({
      id: 'interests',
      field: 'interests',
      title: 'Να αποθηκευτούν αυτά τα ενδιαφέροντα στο Travel DNA;',
      body: `Πρόσθεσε ${missingInterests.join(', ')} από το Discover Brief. Τίποτα άλλο δεν συμπεραίνεται.`,
      value: missingInterests,
    });
  }

  const proposedParty = brief?.party ?? trip?.partyType ?? null;

  if (proposedParty && !dna?.typicalParty) {
    proposals.push({
      id: 'party',
      field: 'party',
      title: 'Να αποθηκευτεί αυτό το party στο Travel DNA;',
      body: `Επέλεξες ${proposedParty}. Να μείνει ως τυπικό party;`,
      value: proposedParty,
    });
  }

  return proposals;
}

export function applyDnaReflectionProposal(
  current: TravelDNA | null,
  proposal: DnaReflectionProposal,
): TravelDNAInput {
  const interests = [...(current?.interests ?? [])];

  if (proposal.field === 'interests') {
    for (const interest of proposal.value) {
      if (!interests.includes(interest)) {
        interests.push(interest);
      }
    }
  }

  return {
    pace:
      proposal.field === 'pace'
        ? proposal.value
        : current?.pace,
    interests,
    travelStyle: current?.travelStyle,
    budgetStyle: current?.budgetStyle,
    dailyRhythm: current?.dailyRhythm,
    typicalParty:
      proposal.field === 'party'
        ? proposal.value
        : current?.typicalParty,
  };
}
