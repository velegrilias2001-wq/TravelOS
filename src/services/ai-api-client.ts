import type {
    AIContextSnapshot,
} from './ai-context';

export const FREE_TIME_ACTIVITY_TYPES = [
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
] as const;

export type FreeTimeActivityType =
  typeof FREE_TIME_ACTIVITY_TYPES[number];

export interface FreeTimeAdviceSuggestion {
  activityType: FreeTimeActivityType;
  suggestedMinutes: number;
}

export interface VerifiedFreeTimeGap {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface FreeTimeAdviceResult {
  provider: string;
  model: string;

  verifiedGap: VerifiedFreeTimeGap;

  suggestions:
    FreeTimeAdviceSuggestion[];
}

export interface FreeTimeAdviceRequest {
  context: AIContextSnapshot;

  dayId: string;
  afterStopId: string;
  beforeStopId: string;
}

interface FreeTimeAdviceResponse {
  ok: boolean;

  provider?: unknown;
  model?: unknown;

  verifiedGap?: unknown;
  suggestions?: unknown;

  error?: unknown;
}

function isActivityType(
  value: unknown,
): value is FreeTimeActivityType {
  return (
    typeof value === 'string' &&
    (
      FREE_TIME_ACTIVITY_TYPES as
        readonly string[]
    ).includes(value)
  );
}

function parseVerifiedGap(
  value: unknown,
): VerifiedFreeTimeGap {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    throw new Error(
      'AI backend returned an invalid verified gap',
    );
  }

  const candidate =
    value as Record<string, unknown>;

  if (
    typeof candidate.startTime !==
      'string' ||
    typeof candidate.endTime !==
      'string' ||
    typeof candidate.durationMinutes !==
      'number' ||
    !Number.isFinite(
      candidate.durationMinutes,
    ) ||
    candidate.durationMinutes <= 0
  ) {
    throw new Error(
      'AI backend returned an invalid verified gap',
    );
  }

  return {
    startTime:
      candidate.startTime,

    endTime:
      candidate.endTime,

    durationMinutes:
      candidate.durationMinutes,
  };
}

function parseSuggestions(
  value: unknown,
  gapDurationMinutes: number,
): FreeTimeAdviceSuggestion[] {
  if (
    !Array.isArray(value) ||
    value.length !== 3
  ) {
    throw new Error(
      'AI backend returned invalid suggestions',
    );
  }

  const suggestions =
    value.map(
      (
        item,
      ): FreeTimeAdviceSuggestion => {
        if (
          !item ||
          typeof item !== 'object'
        ) {
          throw new Error(
            'AI backend returned an invalid suggestion',
          );
        }

        const candidate =
          item as Record<
            string,
            unknown
          >;

        if (
          !isActivityType(
            candidate.activityType,
          ) ||
          typeof candidate.suggestedMinutes !==
            'number' ||
          !Number.isInteger(
            candidate.suggestedMinutes,
          ) ||
          candidate.suggestedMinutes <= 0 ||
          candidate.suggestedMinutes >=
            gapDurationMinutes
        ) {
          throw new Error(
            'AI backend returned an invalid suggestion',
          );
        }

        return {
          activityType:
            candidate.activityType,

          suggestedMinutes:
            candidate.suggestedMinutes,
        };
      },
    );

  const uniqueTypes =
    new Set(
      suggestions.map(
        (suggestion) =>
          suggestion.activityType,
      ),
    );

  if (
    uniqueTypes.size !==
    suggestions.length
  ) {
    throw new Error(
      'AI backend returned duplicate suggestions',
    );
  }

  return suggestions;
}

function normalizeBaseUrl(
  value: string,
): string {
  return value.replace(
    /\/+$/,
    '',
  );
}

export class AIAPIClient {
  constructor(
    private readonly baseUrl: string,
  ) {}

  async suggestForFreeTime(
    request: FreeTimeAdviceRequest,
    signal?: AbortSignal,
  ): Promise<FreeTimeAdviceResult> {
    const response = await fetch(
      `${normalizeBaseUrl(
        this.baseUrl,
      )}/ai/free-time`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify(
          request,
        ),

        signal,
      },
    );

    let payload:
      FreeTimeAdviceResponse;

    try {
      payload =
        await response.json();
    } catch {
      throw new Error(
        'AI backend returned an unreadable response',
      );
    }

    if (
      !response.ok ||
      payload.ok !== true
    ) {
      const errorCode =
        typeof payload.error ===
        'string'
          ? payload.error
          : 'ai_request_failed';

      throw new Error(
        errorCode,
      );
    }

    if (
      typeof payload.provider !==
        'string' ||
      typeof payload.model !==
        'string'
    ) {
      throw new Error(
        'AI backend returned invalid provider metadata',
      );
    }

    const verifiedGap =
      parseVerifiedGap(
        payload.verifiedGap,
      );

    const suggestions =
      parseSuggestions(
        payload.suggestions,
        verifiedGap.durationMinutes,
      );

    return {
      provider:
        payload.provider,

      model:
        payload.model,

      verifiedGap,

      suggestions,
    };
  }
}
