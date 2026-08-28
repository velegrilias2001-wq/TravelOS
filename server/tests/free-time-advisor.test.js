const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIVITY_TYPES,
  buildFreeTimeAdvisorPrompt,
  findRequestedGap,
  freeTimeRequestSchema,
  parseFreeTimeAdvisorResponse,
} = require('../free-time-advisor');

function createValidRequest() {
  return {
    context: {
      version: 1,

      trip: {
        title: 'Tokyo Escape',
        intent: 'culture',
        pace: 'balanced',

        destinations: [
          {
            name: 'Tokyo',
          },
        ],
      },

      travelDNA: {
        pace: 'slow',
        interests: [
          'food',
          'culture',
          'photography',
        ],
        travelStyle: 'independent',
        budgetStyle: 'mid_range',
        dailyRhythm: 'early',
        typicalParty: 'couple',
      },

      itinerary: [
        {
          id: 'day-1',
          date: '2026-10-10',
          dayNumber: 1,

          stops: [
            {
              id: 'stop-1',
              title: 'Museum',
              type: 'culture',
              order: 1,
              startTime: '09:00',
              endTime: '10:00',
            },

            {
              id: 'stop-2',
              title: 'Lunch',
              type: 'food',
              order: 2,
              startTime: '11:30',
              endTime: '12:30',
            },
          ],

          freeTime: [
            {
              afterStopId: 'stop-1',
              beforeStopId: 'stop-2',
              startTime: '10:00',
              endTime: '11:30',
              durationMinutes: 90,
            },
          ],
        },
      ],
    },

    dayId: 'day-1',
    afterStopId: 'stop-1',
    beforeStopId: 'stop-2',
  };
}

test(
  'activity types remain restricted to the TravelOS allowlist',
  () => {
    assert.deepEqual(
      ACTIVITY_TYPES,
      [
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
      ],
    );
  },
);

test(
  'valid free-time request is accepted',
  () => {
    const request =
      createValidRequest();

    const parsed =
      freeTimeRequestSchema.parse(
        request,
      );

    assert.equal(
      parsed.dayId,
      'day-1',
    );

    assert.equal(
      parsed.afterStopId,
      'stop-1',
    );

    assert.equal(
      parsed.beforeStopId,
      'stop-2',
    );
  },
);

test(
  'findRequestedGap returns the verified gap and its exact boundaries',
  () => {
    const request =
      freeTimeRequestSchema.parse(
        createValidRequest(),
      );

    const result =
      findRequestedGap(request);

    assert.equal(
      result.day.id,
      'day-1',
    );

    assert.equal(
      result.gap.startTime,
      '10:00',
    );

    assert.equal(
      result.gap.endTime,
      '11:30',
    );

    assert.equal(
      result.gap.durationMinutes,
      90,
    );

    assert.equal(
      result.previousStop.id,
      'stop-1',
    );

    assert.equal(
      result.nextStop.id,
      'stop-2',
    );
  },
);

test(
  'findRequestedGap rejects an unknown itinerary day',
  () => {
    const request =
      freeTimeRequestSchema.parse(
        createValidRequest(),
      );

    request.dayId =
      'missing-day';

    assert.throws(
      () =>
        findRequestedGap(request),

      /Requested itinerary day was not found/,
    );
  },
);

test(
  'findRequestedGap rejects an unknown free-time gap',
  () => {
    const request =
      freeTimeRequestSchema.parse(
        createValidRequest(),
      );

    request.afterStopId =
      'missing-stop';

    assert.throws(
      () =>
        findRequestedGap(request),

      /Requested free-time gap was not found/,
    );
  },
);

test(
  'prompt contains only verified context and strict truth rules',
  () => {
    const {
      prompt,
      gap,
    } =
      buildFreeTimeAdvisorPrompt(
        createValidRequest(),
      );

    assert.equal(
      gap.durationMinutes,
      90,
    );

    assert.match(
      prompt,
      /Tokyo Escape/,
    );

    assert.match(
      prompt,
      /Destination: Tokyo/,
    );

    assert.match(
      prompt,
      /Trip intent: culture/,
    );

    assert.match(
      prompt,
      /Trip pace: balanced/,
    );

    assert.match(
      prompt,
      /From: 10:00/,
    );

    assert.match(
      prompt,
      /Until: 11:30/,
    );

    assert.match(
      prompt,
      /Duration: 90 minutes/,
    );

    assert.match(
      prompt,
      /Title: Museum/,
    );

    assert.match(
      prompt,
      /Title: Lunch/,
    );

    assert.match(
      prompt,
      /Never invent a place/,
    );

    assert.match(
      prompt,
      /Do not output location names/,
    );

    assert.match(
      prompt,
      /exactly three different activityType values/,
    );

    assert.match(
      prompt,
      /strictly less than 90/,
    );
  },
);

test(
  'valid AI response with three unique activity types is accepted',
  () => {
    const rawContent =
      JSON.stringify({
        suggestions: [
          {
            activityType:
              'food_browse',
            suggestedMinutes: 45,
          },

          {
            activityType:
              'culture_browse',
            suggestedMinutes: 30,
          },

          {
            activityType:
              'photo_walk',
            suggestedMinutes: 15,
          },
        ],
      });

    const result =
      parseFreeTimeAdvisorResponse(
        rawContent,
        90,
      );

    assert.equal(
      result.suggestions.length,
      3,
    );

    assert.equal(
      result.suggestions[0]
        .activityType,
      'food_browse',
    );
  },
);

test(
  'invalid JSON is rejected',
  () => {
    assert.throws(
      () =>
        parseFreeTimeAdvisorResponse(
          'not-json',
          90,
        ),

      /AI returned invalid JSON/,
    );
  },
);

test(
  'unknown activity types are rejected',
  () => {
    const rawContent =
      JSON.stringify({
        suggestions: [
          {
            activityType:
              'visit_specific_cafe',
            suggestedMinutes: 30,
          },

          {
            activityType:
              'culture_browse',
            suggestedMinutes: 25,
          },

          {
            activityType:
              'photo_walk',
            suggestedMinutes: 20,
          },
        ],
      });

    assert.throws(
      () =>
        parseFreeTimeAdvisorResponse(
          rawContent,
          90,
        ),
    );
  },
);

test(
  'duplicate activity types are rejected',
  () => {
    const rawContent =
      JSON.stringify({
        suggestions: [
          {
            activityType:
              'slow_walk',
            suggestedMinutes: 30,
          },

          {
            activityType:
              'slow_walk',
            suggestedMinutes: 20,
          },

          {
            activityType:
              'coffee_or_rest',
            suggestedMinutes: 15,
          },
        ],
      });

    assert.throws(
      () =>
        parseFreeTimeAdvisorResponse(
          rawContent,
          90,
        ),

      /AI returned duplicate activity types/,
    );
  },
);

test(
  'suggestion equal to the full gap duration is rejected',
  () => {
    const rawContent =
      JSON.stringify({
        suggestions: [
          {
            activityType:
              'slow_walk',
            suggestedMinutes: 90,
          },

          {
            activityType:
              'coffee_or_rest',
            suggestedMinutes: 30,
          },

          {
            activityType:
              'photo_walk',
            suggestedMinutes: 20,
          },
        ],
      });

    assert.throws(
      () =>
        parseFreeTimeAdvisorResponse(
          rawContent,
          90,
        ),

      /AI suggestion exceeds the verified free-time gap/,
    );
  },
);

test(
  'suggestion longer than the verified gap is rejected',
  () => {
    const rawContent =
      JSON.stringify({
        suggestions: [
          {
            activityType:
              'slow_walk',
            suggestedMinutes: 91,
          },

          {
            activityType:
              'coffee_or_rest',
            suggestedMinutes: 30,
          },

          {
            activityType:
              'photo_walk',
            suggestedMinutes: 20,
          },
        ],
      });

    assert.throws(
      () =>
        parseFreeTimeAdvisorResponse(
          rawContent,
          90,
        ),

      /AI suggestion exceeds the verified free-time gap/,
    );
  },
);
