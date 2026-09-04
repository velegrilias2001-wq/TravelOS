const { loadAiConfig } = require('./ai-config');
const {
  chatWithOllama,
  embedWithOllama,
} = require('./ollama-provider');

class AiProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
  }
}

function createAiProvider(env = process.env) {
  const config = loadAiConfig(env);

  async function assertEnabled() {
    if (!config.enabled) {
      throw new AiProviderError(
        'ai_disabled',
        'AI is disabled by AI_ENABLED=false',
      );
    }
  }

  async function chat({
    messages,
    format,
    model = config.chatModel,
  }) {
    await assertEnabled();

    if (config.provider === 'ollama') {
      return chatWithOllama({
        messages,
        format,
        model,
        baseUrl: config.baseUrl,
      });
    }

    if (config.provider === 'openai_compatible') {
      return chatWithOpenAiCompatible({
        baseUrl: config.baseUrl,
        apiKey: env.AI_API_KEY || env.HF_TOKEN || '',
        model,
        messages,
        format,
      });
    }

    throw new AiProviderError(
      'ai_provider_unavailable',
      `Unsupported AI_PROVIDER: ${config.provider}`,
    );
  }

  async function embed({
    input,
    model = config.embeddingModel,
  }) {
    await assertEnabled();

    if (!config.semanticSearchEnabled) {
      throw new AiProviderError(
        'embeddings_unavailable',
        'Semantic search is disabled by AI_SEMANTIC_SEARCH_ENABLED=false',
      );
    }

    if (config.provider === 'ollama') {
      return embedWithOllama({
        input,
        model,
        baseUrl: config.baseUrl,
      });
    }

    if (config.provider === 'openai_compatible') {
      return embedWithOpenAiCompatible({
        baseUrl: config.baseUrl,
        apiKey: env.AI_API_KEY || env.HF_TOKEN || '',
        model,
        input,
      });
    }

    throw new AiProviderError(
      'ai_provider_unavailable',
      `Unsupported AI_PROVIDER: ${config.provider}`,
    );
  }

  function describe() {
    return {
      provider: config.provider,
      chatModel: config.chatModel,
      embeddingModel: config.embeddingModel,
      rerankerModel: config.rerankerModel || null,
      enabled: config.enabled,
      semanticSearchEnabled: config.semanticSearchEnabled,
      visionEnabled: config.visionEnabled,
      voiceEnabled: config.voiceEnabled,
      productionProvider: config.productionProvider,
      baseUrlConfigured: Boolean(config.baseUrl),
    };
  }

  return {
    config,
    chat,
    embed,
    describe,
  };
}

async function chatWithOpenAiCompatible({
  baseUrl,
  apiKey,
  model,
  messages,
  format,
}) {
  if (!baseUrl) {
    throw new AiProviderError(
      'ai_provider_unavailable',
      'AI_BASE_URL is required for openai_compatible providers (for example a Hugging Face Inference Endpoint)',
    );
  }

  if (!apiKey) {
    throw new AiProviderError(
      'ai_provider_unavailable',
      'AI_API_KEY or HF_TOKEN is required for openai_compatible providers',
    );
  }

  const body = {
    model,
    messages,
    stream: false,
  };

  if (format) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'travelos_structured',
        schema: format,
      },
    };
  }

  const response = await fetch(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new AiProviderError(
      'ai_provider_unavailable',
      `OpenAI-compatible chat failed: ${response.status}`,
    );
  }

  const result = await response.json();
  const content =
    result?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new AiProviderError(
      'invalid_ai_response',
      'OpenAI-compatible provider returned an empty response',
    );
  }

  return {
    provider: 'openai_compatible',
    model: result.model || model,
    content: content.trim(),
  };
}

async function embedWithOpenAiCompatible({
  baseUrl,
  apiKey,
  model,
  input,
}) {
  if (!baseUrl) {
    throw new AiProviderError(
      'ai_provider_unavailable',
      'AI_BASE_URL is required for openai_compatible providers',
    );
  }

  if (!apiKey) {
    throw new AiProviderError(
      'ai_provider_unavailable',
      'AI_API_KEY or HF_TOKEN is required for openai_compatible providers',
    );
  }

  const inputs = Array.isArray(input) ? input : [input];

  const response = await fetch(
    `${baseUrl}/embeddings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: inputs,
      }),
    },
  );

  if (!response.ok) {
    throw new AiProviderError(
      'ai_provider_unavailable',
      `OpenAI-compatible embed failed: ${response.status}`,
    );
  }

  const result = await response.json();
  const embeddings = Array.isArray(result.data)
    ? result.data
        .slice()
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        .map((row) => row.embedding)
    : null;

  if (
    !embeddings ||
    embeddings.length !== inputs.length
  ) {
    throw new AiProviderError(
      'invalid_ai_response',
      'OpenAI-compatible provider returned an invalid embedding batch',
    );
  }

  return {
    provider: 'openai_compatible',
    model: result.model || model,
    embeddings,
  };
}

module.exports = {
  AiProviderError,
  createAiProvider,
};
