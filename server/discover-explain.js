const { z } = require('zod');

const DISCOVER_EXPLANATION_SENTENCE_LIMIT = 2;
const DISCOVER_EXPLANATION_MAX_CHARS = 180;

const briefSchema = z.object({
  intent: z.string().trim().min(1).max(40).optional(),
  pace: z.string().trim().min(1).max(40).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(12),
  party: z.string().trim().min(1).max(40).optional(),
  travelStyle: z.string().trim().min(1).max(40).optional(),
  dailyRhythm: z.string().trim().min(1).max(40).optional(),
});

const fitSchema = z.object({
  intents: z.array(z.string()),
  interests: z.array(z.string()),
  paces: z.array(z.string()),
  travelStyles: z.array(z.string()),
  dailyRhythms: z.array(z.string()),
  parties: z.array(z.string()),
});

const explainRequestSchema = z.object({
  identity: z.string().trim().min(3).max(80),
  brief: briefSchema,
  record: z.object({
    name: z.string().trim().min(1).max(80),
    countryCode: z.string().trim().min(2).max(8).optional(),
    fit: fitSchema.optional(),
    evidenceLabels: z.array(z.string().trim().min(1).max(120)).max(8),
  }),
  forbiddenNames: z.array(z.string().trim().min(1).max(80)).max(50),
});

const explainResponseFormat = {
  type: 'object',
  properties: {
    identity: {
      type: 'string',
    },
    sentences: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['identity', 'sentences'],
};

function parseDiscoverExplainRequest(body) {
  const parsed = explainRequestSchema.parse(body);

  if (!parsed.identity.includes(':')) {
    throw new Error('Discover explanation identity is invalid');
  }

  return parsed;
}

function buildDiscoverExplainPrompt(request) {
  const briefLines = [
    `Intent: ${request.brief.intent || 'not specified'}`,
    `Pace: ${request.brief.pace || 'not specified'}`,
    `Interests: ${
      request.brief.interests.length > 0
        ? request.brief.interests.join(', ')
        : 'not specified'
    }`,
    `Party: ${request.brief.party || 'not specified'}`,
    `Travel style: ${request.brief.travelStyle || 'not specified'}`,
    `Daily rhythm: ${request.brief.dailyRhythm || 'not specified'}`,
  ];

  const fit = request.record.fit
    ? [
        `Intents: ${joinOrNone(request.record.fit.intents)}`,
        `Interests: ${joinOrNone(request.record.fit.interests)}`,
        `Pace: ${joinOrNone(request.record.fit.paces)}`,
        `Travel style: ${joinOrNone(request.record.fit.travelStyles)}`,
        `Daily rhythm: ${joinOrNone(request.record.fit.dailyRhythms)}`,
        `Typical party: ${joinOrNone(request.record.fit.parties)}`,
      ].join('\n')
    : 'none';

  return `
You are the TravelOS contextual travel copilot.

Explain why ONE grounded catalogue destination fits an explicit trip brief.

TRUTH RULES:
- Use only GROUNDED RECORD facts and explicit BRIEF values.
- Never mention another destination.
- Never invent neighborhoods, venues, restaurants, beaches, weather, seasons, prices, coordinates, or travel times.
- Never invent fit tags that are not listed on the grounded record.
- If GROUNDED RECORD fit is none, say only that this is a catalogue destination known by name and country. Do not claim why it fits.
- Do not mention evidence URLs. Evidence labels are provenance, not attractions.
- Do not output markdown.

BRIEF:
${briefLines.join('\n')}

GROUNDED RECORD:
Identity: ${request.identity}
Name: ${request.record.name}
Country: ${request.record.countryCode || 'not specified'}
Fit tags:
${fit}
Evidence labels: ${joinOrNone(request.record.evidenceLabels)}

Return only JSON:
- identity: must be exactly ${request.identity}
- sentences: 1 or 2 short sentences, each under ${DISCOVER_EXPLANATION_MAX_CHARS} characters
`.trim();
}

function parseDiscoverExplainResponse(content, request) {
  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    parsed.identity !== request.identity ||
    !Array.isArray(parsed.sentences)
  ) {
    throw new Error('AI returned invalid JSON');
  }

  if (
    parsed.sentences.length < 1 ||
    parsed.sentences.length > DISCOVER_EXPLANATION_SENTENCE_LIMIT
  ) {
    throw new Error('AI returned an invalid explanation');
  }

  const sentences = parsed.sentences.map((sentence) => {
    if (typeof sentence !== 'string' || !sentence.trim()) {
      throw new Error('AI returned an invalid explanation');
    }

    const text = sentence.trim();

    if (text.length > DISCOVER_EXPLANATION_MAX_CHARS) {
      throw new Error('AI returned an invalid explanation');
    }

    if (
      /https?:\/\//i.test(text) ||
      /www\./i.test(text) ||
      /[€$£]\s*\d/.test(text) ||
      /-?\d{1,3}\.\d{3,}/.test(text)
    ) {
      throw new Error('AI explanation invented unsupported facts');
    }

    const lower = text.toLowerCase();
    const allowedName = request.record.name.toLowerCase();

    for (const name of request.forbiddenNames) {
      if (
        name &&
        name.toLowerCase() !== allowedName &&
        lower.includes(name.toLowerCase())
      ) {
        throw new Error('AI explanation mentioned another destination');
      }
    }

    return text;
  });

  return {
    identity: request.identity,
    sentences,
  };
}

function joinOrNone(values) {
  return values.length > 0 ? values.join(', ') : 'none';
}

module.exports = {
  DISCOVER_EXPLANATION_MAX_CHARS,
  DISCOVER_EXPLANATION_SENTENCE_LIMIT,
  buildDiscoverExplainPrompt,
  explainRequestSchema,
  explainResponseFormat,
  parseDiscoverExplainRequest,
  parseDiscoverExplainResponse,
};
