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

export interface DiscoverRetrieveHit {
  identity: string;
  score: number;
}

export interface DiscoverRetrieveRequest {
  query: string;
  contentHash: string;
  limit?: number;
}

export interface DiscoverRetrieveResult {
  provider: string;
  model: string;
  matches: DiscoverRetrieveHit[];
}

export interface TravelChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  contentHash: string;
  travelDNA?: {
    pace?: string;
    interests?: string[];
    travelStyle?: string;
    budgetStyle?: string;
    dailyRhythm?: string;
    typicalParty?: string;
  } | null;
  brief?: {
    intent?: string;
    pace?: string;
    interests?: string[];
    party?: string;
  } | null;
  limit?: number;
}

export interface TravelChatResult {
  provider: string;
  model: string;
  reply: string;
  matches: DiscoverRetrieveHit[];
  toolsUsed: string[];
}

export interface DiscoverExplainRequest {
  identity: string;
  brief: {
    intent?: string;
    pace?: string;
    interests: string[];
    party?: string;
    travelStyle?: string;
    dailyRhythm?: string;
  };
  record: {
    name: string;
    countryCode?: string;
    fit?: {
      intents: string[];
      interests: string[];
      paces: string[];
      travelStyles: string[];
      dailyRhythms: string[];
      parties: string[];
    };
    evidenceLabels: string[];
  };
  forbiddenNames: string[];
}

export interface DiscoverExplainResult {
  provider: string;
  model: string;
  identity: string;
  sentences: string[];
}

export interface DiscoverRerankCandidate {
  identity: string;
  text: string;
}

export interface DiscoverRerankRequest {
  query: string;
  candidates: DiscoverRerankCandidate[];
}

export interface DiscoverRerankResult {
  provider: string;
  model: string;
  identities: string[];
}

interface DiscoverRetrieveResponse {
  ok: boolean;

  provider?: unknown;
  model?: unknown;
  matches?: unknown;

  error?: unknown;
}

interface DiscoverExplainResponse {
  ok: boolean;

  provider?: unknown;
  model?: unknown;
  identity?: unknown;
  sentences?: unknown;

  error?: unknown;
}

interface DiscoverRerankResponse {
  ok: boolean;

  provider?: unknown;
  model?: unknown;
  identities?: unknown;

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

function parseDiscoverHits(
  value: unknown,
): DiscoverRetrieveHit[] {
  if (!Array.isArray(value)) {
    throw new Error(
      'AI backend returned invalid Discover matches',
    );
  }

  if (value.length > 20) {
    throw new Error(
      'AI backend returned too many Discover matches',
    );
  }

  const matches = value.map(
    (item): DiscoverRetrieveHit => {
      if (
        !item ||
        typeof item !== 'object'
      ) {
        throw new Error(
          'AI backend returned an invalid Discover match',
        );
      }

      const candidate =
        item as Record<
          string,
          unknown
        >;

      if (
        typeof candidate.identity !==
          'string' ||
        !candidate.identity.includes(
          ':',
        ) ||
        typeof candidate.score !==
          'number' ||
        !Number.isFinite(
          candidate.score,
        )
      ) {
        throw new Error(
          'AI backend returned an invalid Discover match',
        );
      }

      return {
        identity: candidate.identity,
        score: candidate.score,
      };
    },
  );

  const uniqueIdentities = new Set(
    matches.map((match) => match.identity),
  );

  if (uniqueIdentities.size !== matches.length) {
    throw new Error(
      'AI backend returned duplicate Discover matches',
    );
  }

  return matches;
}

function parseExplainSentences(
  identity: unknown,
  sentences: unknown,
): {
  identity: string;
  sentences: string[];
} {
  if (
    typeof identity !== 'string' ||
    !identity.includes(':')
  ) {
    throw new Error(
      'AI backend returned an invalid Discover explanation',
    );
  }

  if (
    !Array.isArray(sentences) ||
    sentences.length < 1 ||
    sentences.length > 2
  ) {
    throw new Error(
      'AI backend returned an invalid Discover explanation',
    );
  }

  const parsed = sentences.map(
    (sentence) => {
      if (
        typeof sentence !== 'string' ||
        !sentence.trim() ||
        sentence.trim().length > 180
      ) {
        throw new Error(
          'AI backend returned an invalid Discover explanation',
        );
      }

      return sentence.trim();
    },
  );

  return {
    identity,
    sentences: parsed,
  };
}

function normalizeBaseUrl(
  value: string,
): string {
  return value.replace(
    /\/+$/,
    '',
  );
}

export type AIAPIClientOptions = {
  beforeRequest?: () => void | Promise<void>;
};

export class AIAPIClient {
  private readonly beforeRequest?:
    AIAPIClientOptions['beforeRequest'];

  constructor(
    private readonly baseUrl: string,
    options?: AIAPIClientOptions,
  ) {
    this.beforeRequest = options?.beforeRequest;
  }

  private async request(
    path: string,
    init?: RequestInit,
  ): Promise<Response> {
    if (this.beforeRequest) {
      await this.beforeRequest();
    }

    return fetch(
      `${normalizeBaseUrl(this.baseUrl)}${path}`,
      init,
    );
  }

  async suggestForFreeTime(
    request: FreeTimeAdviceRequest,
    signal?: AbortSignal,
  ): Promise<FreeTimeAdviceResult> {
    const response = await this.request(
      '/ai/free-time',
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

  async retrieveDiscoverMatches(
    request: DiscoverRetrieveRequest,
    signal?: AbortSignal,
  ): Promise<DiscoverRetrieveResult> {
    const response = await this.request(
      '/ai/discover-retrieve',
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
      DiscoverRetrieveResponse;

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

    return {
      provider: payload.provider,
      model: payload.model,
      matches: parseDiscoverHits(
        payload.matches,
      ),
    };
  }

  async explainDiscoverMatch(
    request: DiscoverExplainRequest,
    signal?: AbortSignal,
  ): Promise<DiscoverExplainResult> {
    const response = await this.request(
      '/ai/discover-explain',
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
      DiscoverExplainResponse;

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

    const explanation =
      parseExplainSentences(
        payload.identity,
        payload.sentences,
      );

    return {
      provider: payload.provider,
      model: payload.model,
      identity: explanation.identity,
      sentences: explanation.sentences,
    };
  }

  async rerankDiscoverMatches(
    request: DiscoverRerankRequest,
    signal?: AbortSignal,
  ): Promise<DiscoverRerankResult> {
    const response = await this.request(
      '/ai/discover-rerank',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal,
      },
    );

    let payload: DiscoverRerankResponse;

    try {
      payload = await response.json();
    } catch {
      throw new Error(
        'AI backend returned an unreadable response',
      );
    }

    if (!response.ok || payload.ok !== true) {
      const errorCode =
        typeof payload.error === 'string'
          ? payload.error
          : 'ai_request_failed';

      throw new Error(errorCode);
    }

    if (
      typeof payload.provider !== 'string' ||
      typeof payload.model !== 'string' ||
      !Array.isArray(payload.identities)
    ) {
      throw new Error(
        'AI backend returned invalid rerank payload',
      );
    }

    const identities = payload.identities.filter(
      (value): value is string =>
        typeof value === 'string' && value.length > 0,
    );

    if (identities.length !== payload.identities.length) {
      throw new Error(
        'AI backend returned invalid rerank identities',
      );
    }

    return {
      provider: payload.provider,
      model: payload.model,
      identities,
    };
  }

  async travelChat(
    request: TravelChatRequest,
    signal?: AbortSignal,
  ): Promise<TravelChatResult> {
    const response = await this.request('/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    });

    let payload: {
      ok?: unknown;
      provider?: unknown;
      model?: unknown;
      reply?: unknown;
      matches?: unknown;
      toolsUsed?: unknown;
      error?: unknown;
    };

    try {
      payload = await response.json();
    } catch {
      throw new Error(
        'AI backend returned an unreadable response',
      );
    }

    if (!response.ok || payload.ok !== true) {
      const errorCode =
        typeof payload.error === 'string'
          ? payload.error
          : 'ai_request_failed';

      throw new Error(errorCode);
    }

    if (
      typeof payload.provider !== 'string' ||
      typeof payload.model !== 'string' ||
      typeof payload.reply !== 'string' ||
      !payload.reply.trim()
    ) {
      throw new Error(
        'AI backend returned invalid travel chat payload',
      );
    }

    const toolsUsed = Array.isArray(payload.toolsUsed)
      ? payload.toolsUsed.filter(
          (value): value is string =>
            typeof value === 'string',
        )
      : [];

    return {
      provider: payload.provider,
      model: payload.model,
      reply: payload.reply.trim(),
      matches: parseDiscoverHits(payload.matches),
      toolsUsed,
    };
  }
}
