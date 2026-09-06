import type { DiscoverBrief } from '@/domain/entities';
import type { TravelDNA } from '@/domain/entities/travel-dna';

import { aiAPIClient } from './ai-api-runtime';
import { getGroundedDiscoverCandidates } from './discover-catalogue-candidates';
import { getDiscoverEmbeddingContentHash } from './discover-semantic';
import type {
  TravelChatDestinationCard,
} from '@/store/travel-chat-store';

export interface TravelChatTurnResult {
  reply: string;
  cards: TravelChatDestinationCard[];
  provider: string;
  model: string;
  toolsUsed: string[];
}

export async function sendTravelChatTurn(input: {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  brief: DiscoverBrief | null;
  travelDNA: TravelDNA | null;
  signal?: AbortSignal;
}): Promise<TravelChatTurnResult> {
  const contentHash = getDiscoverEmbeddingContentHash();

  const result = await aiAPIClient.travelChat(
    {
      messages: input.messages,
      contentHash,
      travelDNA: input.travelDNA
        ? {
            pace: input.travelDNA.pace,
            interests: [...input.travelDNA.interests],
            travelStyle: input.travelDNA.travelStyle,
            budgetStyle: input.travelDNA.budgetStyle,
            dailyRhythm: input.travelDNA.dailyRhythm,
            typicalParty: input.travelDNA.typicalParty,
          }
        : null,
      brief: input.brief
        ? {
            intent: input.brief.intent,
            pace: input.brief.pace,
            interests: [...input.brief.interests],
            party: input.brief.party,
          }
        : null,
      limit: 5,
    },
    input.signal,
  );

  const byIdentity = new Map(
    getGroundedDiscoverCandidates().map(
      (candidate) => [candidate.id, candidate],
    ),
  );

  const cards: TravelChatDestinationCard[] = [];

  for (const match of result.matches) {
    const candidate = byIdentity.get(match.identity);

    if (!candidate) {
      continue;
    }

    cards.push({
      identity: match.identity,
      score: match.score,
      name: candidate.destination.name,
      countryCode: candidate.destination.countryCode,
    });
  }

  return {
    reply: result.reply,
    cards,
    provider: result.provider,
    model: result.model,
    toolsUsed: result.toolsUsed,
  };
}
