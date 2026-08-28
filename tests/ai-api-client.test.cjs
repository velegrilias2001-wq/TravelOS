const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AIAPIClient,
} = require('../.test-build/src/services/ai-api-client.js');

function makeRequest() {
  return {
    context: {
      version: 1,

      trip: {
        id: 'trip-1',
        title: 'Tokyo',
        intent: 'food',
        pace: 'balanced',
        destinations: [
          {
            id: 'destination-1',
            name: 'Tokyo',
            currencyCode: 'JPY',
          },
        ],
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        accountingCurrency: 'EUR',
      },

      travelDNA: {
        pace: 'slow',
        interests: [
          'food',
          'culture',
        ],
      },

      travelers: {
        total: 1,
        adults: 1,
        children: 0,
        infants: 0,
      },

      itinerary: [
        {
          id: 'day-2',
          date: '2026-09-02',
          dayNumber: 2,

          stops: [],

          freeTime: [
            {
              dayId: 'day-2',
              afterStopId: 'stop-a',
              beforeStopId: 'stop-b',
              startTime: '10:00',
              endTime: '11:30',
              durationMinutes: 90,
            },
          ],

          timeConflicts: [],
        },
      ],

      bookings: [],
      accommodations: [],
      budget: null,

      runtime: {
        mode: 'active',
        currentDate: '2026-09-02',
        localTime: '09:30',
        timingReliable: true,
        timeZone: 'Asia/Tokyo',
        timeZoneCertainty: 'canonical',
        timeZoneReason: 'destination-timezone',
        displayDayId: 'day-2',
        dayIndex: 2,
        totalDays: 3,
        countdownDays: null,
        currentStopId: null,
        nextStopId: null,
        remainingStopIds: [],
        untimedStopIds: [],
        currentAccommodationId: null,
        nextAccommodationId: null,
        relevantUnlinkedBookingIds: [],
      },

      readiness: {
        accommodationCount: 0,
        bookingCount: 0,
        populatedDayCount: 1,
        totalDayCount: 3,
        travelerCount: 1,
        budgetConfigured: false,
      },

      summary: {
        dayCount: 3,
        stopCount: 2,
        bookingCount: 0,
        accommodationCount: 0,
        travelerCount: 1,
      },
    },

    dayId: 'day-2',
    afterStopId: 'stop-a',
    beforeStopId: 'stop-b',
  };
}

function jsonResponse(
  payload,
  status = 200,
) {
  return {
    ok:
      status >= 200 &&
      status < 300,

    status,

    json: async () => payload,
  };
}

test(
  'AIAPIClient accepts a valid truth-safe free-time response',
  async () => {
    const originalFetch =
      global.fetch;

    global.fetch =
      async () =>
        jsonResponse({
          ok: true,
          provider: 'ollama',
          model: 'qwen3:4b',

          verifiedGap: {
            startTime: '10:00',
            endTime: '11:30',
            durationMinutes: 90,
          },

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

    try {
      const client =
        new AIAPIClient(
          'http://localhost:8789/',
        );

      const result =
        await client.suggestForFreeTime(
          makeRequest(),
        );

      assert.equal(
        result.provider,
        'ollama',
      );

      assert.equal(
        result.model,
        'qwen3:4b',
      );

      assert.deepEqual(
        result.verifiedGap,
        {
          startTime: '10:00',
          endTime: '11:30',
          durationMinutes: 90,
        },
      );

      assert.deepEqual(
        result.suggestions.map(
          (suggestion) =>
            suggestion.activityType,
        ),
        [
          'food_browse',
          'culture_browse',
          'photo_walk',
        ],
      );
    } finally {
      global.fetch =
        originalFetch;
    }
  },
);

test(
  'AIAPIClient rejects duplicate activity types',
  async () => {
    const originalFetch =
      global.fetch;

    global.fetch =
      async () =>
        jsonResponse({
          ok: true,
          provider: 'ollama',
          model: 'qwen3:4b',

          verifiedGap: {
            startTime: '10:00',
            endTime: '11:30',
            durationMinutes: 90,
          },

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
                'photo_walk',
              suggestedMinutes: 15,
            },
          ],
        });

    try {
      const client =
        new AIAPIClient(
          'http://localhost:8789',
        );

      await assert.rejects(
        () =>
          client.suggestForFreeTime(
            makeRequest(),
          ),
        /duplicate suggestions/,
      );
    } finally {
      global.fetch =
        originalFetch;
    }
  },
);

test(
  'AIAPIClient rejects suggestions that do not fit inside the verified gap',
  async () => {
    const originalFetch =
      global.fetch;

    global.fetch =
      async () =>
        jsonResponse({
          ok: true,
          provider: 'ollama',
          model: 'qwen3:4b',

          verifiedGap: {
            startTime: '10:00',
            endTime: '11:30',
            durationMinutes: 90,
          },

          suggestions: [
            {
              activityType:
                'food_browse',
              suggestedMinutes: 90,
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

    try {
      const client =
        new AIAPIClient(
          'http://localhost:8789',
        );

      await assert.rejects(
        () =>
          client.suggestForFreeTime(
            makeRequest(),
          ),
        /invalid suggestion/,
      );
    } finally {
      global.fetch =
        originalFetch;
    }
  },
);

test(
  'AIAPIClient rejects unknown activity types',
  async () => {
    const originalFetch =
      global.fetch;

    global.fetch =
      async () =>
        jsonResponse({
          ok: true,
          provider: 'ollama',
          model: 'qwen3:4b',

          verifiedGap: {
            startTime: '10:00',
            endTime: '11:30',
            durationMinutes: 90,
          },

          suggestions: [
            {
              activityType:
                'invented_place',
              suggestedMinutes: 20,
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

    try {
      const client =
        new AIAPIClient(
          'http://localhost:8789',
        );

      await assert.rejects(
        () =>
          client.suggestForFreeTime(
            makeRequest(),
          ),
        /invalid suggestion/,
      );
    } finally {
      global.fetch =
        originalFetch;
    }
  },
);

test(
  'AIAPIClient surfaces backend error codes',
  async () => {
    const originalFetch =
      global.fetch;

    global.fetch =
      async () =>
        jsonResponse(
          {
            ok: false,
            error:
              'invalid_free_time_context',
          },
          400,
        );

    try {
      const client =
        new AIAPIClient(
          'http://localhost:8789',
        );

      await assert.rejects(
        () =>
          client.suggestForFreeTime(
            makeRequest(),
          ),
        /invalid_free_time_context/,
      );
    } finally {
      global.fetch =
        originalFetch;
    }
  },
);