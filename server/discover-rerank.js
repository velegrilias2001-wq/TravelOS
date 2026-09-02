const { z } = require('zod');

const rerankCandidateSchema = z.object({
  identity: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

const rerankRequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  candidates: z.array(rerankCandidateSchema).min(1).max(20),
});

const rerankResponseFormat = {
  type: 'object',
  properties: {
    identities: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['identities'],
};

function parseDiscoverRerankRequest(body) {
  return rerankRequestSchema.parse(body);
}

function buildDiscoverRerankPrompt({ query, candidates }) {
  const lines = candidates.map(
    (candidate) =>
      `- ${candidate.identity} — ${candidate.text}`,
  );

  return [
    'Reorder grounded TravelOS Discover destinations for this query.',
    'Use only the listed identities. Do not invent destinations, coordinates, prices, or new identities.',
    'You may omit identities. Do not repeat identities.',
    'Return only JSON with an identities array.',
    '',
    `Query: ${query}`,
    '',
    'Candidates:',
    ...lines,
  ].join('\n');
}

function parseDiscoverRerankResponse(content) {
  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(parsed.identities)
  ) {
    throw new Error('AI returned invalid JSON');
  }

  return parsed.identities;
}

module.exports = {
  buildDiscoverRerankPrompt,
  parseDiscoverRerankRequest,
  parseDiscoverRerankResponse,
  rerankRequestSchema,
  rerankResponseFormat,
};
