const { z } = require('zod');

const ACTIVITY_TYPES = [
  'slow_walk',
  'coffee_or_rest',
  'food_browse',
  'culture_browse',
  'local_browse',
  'photo_walk',
  'shopping_browse',
  'wellness_pause',
  'scenic_pause',
  'flexible_buffer',
];

const activityTypeSchema =
  z.enum(ACTIVITY_TYPES);

const freeTimeRequestSchema = z.object({
  context: z.object({
    version: z.literal(1),

    trip: z.object({
      title: z.string(),
      intent: z.string().optional(),
      pace: z.string().optional(),

      destinations: z.array(
        z.object({
          name: z.string(),
        }),
      ),
    }),

    travelDNA: z
      .object({
        pace: z.string().optional(),
        interests: z.array(z.string()),
        travelStyle:
          z.string().optional(),
        budgetStyle:
          z.string().optional(),
        dailyRhythm:
          z.string().optional(),
        typicalParty:
          z.string().optional(),
      })
      .nullable(),

    itinerary: z.array(
      z.object({
        id: z.string(),
        date: z.string(),
        dayNumber: z.number(),

        stops: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            type: z.string(),
            order: z.number(),

            startTime:
              z.string().optional(),

            endTime:
              z.string().optional(),

            location: z
              .object({
                name: z.string(),
              })
              .optional(),
          }),
        ),

        freeTime: z.array(
          z.object({
            afterStopId: z.string(),
            beforeStopId: z.string(),

            startTime: z.string(),
            endTime: z.string(),

            durationMinutes:
              z.number().positive(),
          }),
        ),
      }),
    ),
  }),

  dayId: z.string(),
  afterStopId: z.string(),
  beforeStopId: z.string(),
});

const freeTimeSuggestionSchema =
  z.object({
    activityType:
      activityTypeSchema,

    suggestedMinutes:
      z.number()
        .int()
        .positive(),
  });

const freeTimeResponseSchema =
  z.object({
    suggestions: z.array(
      freeTimeSuggestionSchema,
    ).length(3),
  });

const freeTimeResponseFormat = {
  type: 'object',

  properties: {
    suggestions: {
      type: 'array',

      minItems: 3,
      maxItems: 3,

      items: {
        type: 'object',

        properties: {
          activityType: {
            type: 'string',
            enum: ACTIVITY_TYPES,
          },

          suggestedMinutes: {
            type: 'integer',
            minimum: 1,
          },
        },

        required: [
          'activityType',
          'suggestedMinutes',
        ],

        additionalProperties: false,
      },
    },
  },

  required: [
    'suggestions',
  ],

  additionalProperties: false,
};

function findRequestedGap(input) {
  const day =
    input.context.itinerary.find(
      (candidate) =>
        candidate.id === input.dayId,
    );

  if (!day) {
    throw new Error(
      'Requested itinerary day was not found',
    );
  }

  const gap =
    day.freeTime.find(
      (candidate) =>
        candidate.afterStopId ===
          input.afterStopId &&
        candidate.beforeStopId ===
          input.beforeStopId,
    );

  if (!gap) {
    throw new Error(
      'Requested free-time gap was not found',
    );
  }

  const previousStop =
    day.stops.find(
      (stop) =>
        stop.id === gap.afterStopId,
    );

  const nextStop =
    day.stops.find(
      (stop) =>
        stop.id === gap.beforeStopId,
    );

  if (
    !previousStop ||
    !nextStop
  ) {
    throw new Error(
      'Free-time boundary moments were not found',
    );
  }

  return {
    day,
    gap,
    previousStop,
    nextStop,
  };
}

function buildFreeTimeAdvisorPrompt(
  rawInput,
) {
  const input =
    freeTimeRequestSchema.parse(
      rawInput,
    );

  const {
    day,
    gap,
    previousStop,
    nextStop,
  } = findRequestedGap(input);

  const trip =
    input.context.trip;

  const travelDNA =
    input.context.travelDNA;

  const destinations =
    trip.destinations
      .map(
        (destination) =>
          destination.name,
      )
      .join(', ');

  const interests =
    travelDNA?.interests?.length
      ? travelDNA.interests.join(', ')
      : 'not specified';

  const prompt = `
You are the TravelOS contextual travel copilot.

Choose exactly THREE activity directions for ONE VERIFIED free-time gap.

Use ONLY explicit TravelOS context.

TRUTH RULES:
- Never invent a place, venue, neighborhood, restaurant, cafe, attraction, shop or business.
- Never invent reservations, timings, prices, opening hours, availability, ratings or travel times.
- Do not output natural-language recommendations.
- Do not output location names.
- Select only from the allowed activityType values.
- Keep every suggestion shorter than the verified free-time gap.
- Prefer suggestions that fit the explicit trip intent, trip pace and Travel DNA.
- Trip-specific intent and pace take priority over global Travel DNA when relevant.

ALLOWED ACTIVITY TYPES:
${ACTIVITY_TYPES.join(', ')}

TRIP:
Title: ${trip.title}
Destination: ${destinations || 'not specified'}
Trip intent: ${trip.intent || 'not specified'}
Trip pace: ${trip.pace || 'not specified'}

TRAVEL DNA:
Global pace: ${travelDNA?.pace || 'not specified'}
Interests: ${interests}
Travel style: ${travelDNA?.travelStyle || 'not specified'}
Budget style: ${travelDNA?.budgetStyle || 'not specified'}
Daily rhythm: ${travelDNA?.dailyRhythm || 'not specified'}
Typical party: ${travelDNA?.typicalParty || 'not specified'}

VERIFIED FREE TIME:
Day: ${day.dayNumber}
Date: ${day.date}
From: ${gap.startTime}
Until: ${gap.endTime}
Duration: ${gap.durationMinutes} minutes

PREVIOUS MOMENT:
Title: ${previousStop.title}
Type: ${previousStop.type}

NEXT MOMENT:
Title: ${nextStop.title}
Type: ${nextStop.type}

Return only:
- activityType
- suggestedMinutes

Return exactly three different activityType values.

Every suggestedMinutes value must be strictly less than ${gap.durationMinutes}.
`.trim();

  return {
    prompt,
    gap,
  };
}

function parseFreeTimeAdvisorResponse(
  rawContent,
  gapDurationMinutes,
) {
  let parsedJson;

  try {
    parsedJson =
      JSON.parse(rawContent);
  } catch {
    throw new Error(
      'AI returned invalid JSON',
    );
  }

  const result =
    freeTimeResponseSchema.parse(
      parsedJson,
    );

  const invalidSuggestion =
    result.suggestions.find(
      (suggestion) =>
        suggestion.suggestedMinutes >=
        gapDurationMinutes,
    );

  if (invalidSuggestion) {
    throw new Error(
      'AI suggestion exceeds the verified free-time gap',
    );
  }

  const uniqueTypes =
    new Set(
      result.suggestions.map(
        (suggestion) =>
          suggestion.activityType,
      ),
    );

  if (
    uniqueTypes.size !==
    result.suggestions.length
  ) {
    throw new Error(
      'AI returned duplicate activity types',
    );
  }

  return result;
}

module.exports = {
  ACTIVITY_TYPES,
  buildFreeTimeAdvisorPrompt,
  findRequestedGap,
  freeTimeRequestSchema,
  freeTimeResponseFormat,
  freeTimeResponseSchema,
  parseFreeTimeAdvisorResponse,
};