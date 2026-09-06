const { z } = require('zod');

const {
  TRAVELOS_COPILOT_SYSTEM_PROMPT,
} = require('./prompts/travelos-copilot');

const {
  rankDiscoverEmbeddings,
} = require('./discover-retrieve');

/**
 * Travel Chat V1 tool allow-list.
 * Only server-executed tools. No SQLite writes.
 */
const TRAVEL_CHAT_ALLOWED_TOOLS = Object.freeze([
  'searchGroundedDiscoverCandidates',
  'readTravelDNA',
  'proposeDiscoverBriefUpdate',
  'explainGroundedDiscoverCandidate',
]);

const travelChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
  contentHash: z.string().trim().min(1).max(64),
  travelDNA: z
    .object({
      pace: z.string().optional(),
      interests: z.array(z.string()).optional(),
      travelStyle: z.string().optional(),
      budgetStyle: z.string().optional(),
      dailyRhythm: z.string().optional(),
      typicalParty: z.string().optional(),
    })
    .nullable()
    .optional(),
  brief: z
    .object({
      intent: z.string().optional(),
      pace: z.string().optional(),
      interests: z.array(z.string()).optional(),
      party: z.string().optional(),
    })
    .nullable()
    .optional(),
  limit: z.number().int().min(1).max(8).optional(),
});

function parseTravelChatRequest(body) {
  return travelChatRequestSchema.parse(body);
}

function latestUserMessage(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return messages[index].content;
    }
  }

  throw new Error('Travel chat requires a user message');
}

function travelChatResponseFormat() {
  return {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
      },
    },
    required: ['reply'],
  };
}

function buildTravelChatPrompt({
  messages,
  travelDNA,
  brief,
  matches,
}) {
  const dnaLine = travelDNA
    ? JSON.stringify(travelDNA)
    : 'null';
  const briefLine = brief
    ? JSON.stringify(brief)
    : 'null';
  const matchLines =
    matches.length === 0
      ? 'None. Say you need a clearer preference or Discover Brief. Do not invent destinations.'
      : matches
          .map(
            (match, index) =>
              `${index + 1}. identity=${match.identity} score=${match.score.toFixed(3)}`,
          )
          .join('\n');

  const history = messages
    .map(
      (message) =>
        `${message.role.toUpperCase()}: ${message.content}`,
    )
    .join('\n\n');

  return `${TRAVELOS_COPILOT_SYSTEM_PROMPT}

This turn is Travel Chat for destination discovery.
You may discuss ONLY the grounded catalogue identities listed below.
Never invent cities, countries, prices, or coordinates.
If the list is empty, say so honestly and ask for clearer preferences.
Destination cards are shown separately from your reply — do not invent extra places.
Confirming a trip is the traveler's action in the app, never yours.

Explicit Travel DNA JSON: ${dnaLine}
Session Discover Brief JSON: ${briefLine}

Grounded candidate identities for this turn:
${matchLines}

Conversation:
${history}

Return JSON {"reply":"..."} only.`;
}

function parseTravelChatModelResponse(raw) {
  let parsed = raw;

  if (typeof raw === 'string') {
    parsed = JSON.parse(raw);
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.reply !== 'string'
  ) {
    throw new Error('invalid_ai_response');
  }

  const reply = parsed.reply.trim();

  if (!reply || reply.length > 4000) {
    throw new Error('invalid_ai_response');
  }

  return { reply };
}

function filterGroundedMatches(matches, allowedIdentities) {
  const allowed = new Set(allowedIdentities);

  return matches.filter(
    (match) =>
      typeof match.identity === 'string' &&
      allowed.has(match.identity),
  );
}

async function runTravelChatTurn({
  ai,
  embeddings,
  request,
}) {
  if (!embeddings) {
    const error = new Error('embeddings_unavailable');
    error.code = 'embeddings_unavailable';
    throw error;
  }

  if (request.contentHash !== embeddings.contentHash) {
    const error = new Error('stale_embeddings');
    error.code = 'stale_embeddings';
    throw error;
  }

  const query = latestUserMessage(request.messages);
  const limit = request.limit ?? 5;

  const embedded = await ai.embed({
    input: query,
    model: embeddings.model,
  });

  const ranked = rankDiscoverEmbeddings({
    artifact: embeddings,
    queryVector: embedded.embeddings[0],
    limit,
  });

  const allowedIdentities = embeddings.documents.map(
    (document) => document.identity,
  );
  const matches = filterGroundedMatches(
    ranked,
    allowedIdentities,
  );

  const prompt = buildTravelChatPrompt({
    messages: request.messages,
    travelDNA: request.travelDNA ?? null,
    brief: request.brief ?? null,
    matches,
  });

  const chatResult = await ai.chat({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    format: travelChatResponseFormat(),
  });

  const { reply } = parseTravelChatModelResponse(
    chatResult.content,
  );

  return {
    reply,
    matches,
    toolsUsed: ['searchGroundedDiscoverCandidates'],
    allowedTools: [...TRAVEL_CHAT_ALLOWED_TOOLS],
    provider: chatResult.provider,
    model: chatResult.model,
  };
}

module.exports = {
  TRAVEL_CHAT_ALLOWED_TOOLS,
  parseTravelChatRequest,
  parseTravelChatModelResponse,
  filterGroundedMatches,
  buildTravelChatPrompt,
  travelChatResponseFormat,
  runTravelChatTurn,
  latestUserMessage,
};
