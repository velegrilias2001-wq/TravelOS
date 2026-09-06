/**
 * Local-dev AI configuration.
 * Production provider remains none. Secrets never belong in the native client.
 *
 * Preferred env names (OLLAMA_* kept as aliases):
 *   AI_PROVIDER=ollama | openai_compatible
 *   AI_BASE_URL=
 *   AI_CHAT_MODEL=
 *   AI_EMBEDDING_MODEL=
 *   AI_RERANKER_MODEL=   (documented only; no BGE install)
 *   AI_RERANK_ENABLED=false
 *   AI_ENABLED=true|false
 *   AI_SEMANTIC_SEARCH_ENABLED=true|false
 *   AI_VISION_ENABLED=false
 *   AI_VOICE_ENABLED=false
 */

function readFlagFrom(env, name, fallback) {
  const raw = env[name];

  if (raw == null || String(raw).trim() === '') {
    return fallback;
  }

  const normalized = String(raw).trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function loadAiConfig(env = process.env) {
  const providerRaw = (
    env.AI_PROVIDER ||
    'ollama'
  )
    .trim()
    .toLowerCase();

  const provider =
    providerRaw === 'openai_compatible' ||
    providerRaw === 'openai-compatible' ||
    providerRaw === 'hf_endpoint' ||
    providerRaw === 'huggingface'
      ? 'openai_compatible'
      : 'ollama';

  const baseUrl = (
    env.AI_BASE_URL ||
    env.OLLAMA_BASE_URL ||
    (provider === 'ollama'
      ? 'http://127.0.0.1:11434'
      : '')
  )
    .trim()
    .replace(/\/+$/, '');

  return {
    provider,
    baseUrl,
    chatModel: (
      env.AI_CHAT_MODEL ||
      env.OLLAMA_MODEL ||
      'qwen3:4b'
    ).trim(),
    embeddingModel: (
      env.AI_EMBEDDING_MODEL ||
      env.OLLAMA_EMBED_MODEL ||
      'bge-m3'
    ).trim(),
    rerankerModel: (
      env.AI_RERANKER_MODEL ||
      ''
    ).trim(),
    enabled: readFlagFrom(env, 'AI_ENABLED', true),
    semanticSearchEnabled: readFlagFrom(
      env,
      'AI_SEMANTIC_SEARCH_ENABLED',
      true,
    ),
    visionEnabled: readFlagFrom(
      env,
      'AI_VISION_ENABLED',
      false,
    ),
    voiceEnabled: readFlagFrom(
      env,
      'AI_VOICE_ENABLED',
      false,
    ),
    rerankEnabled: readFlagFrom(
      env,
      'AI_RERANK_ENABLED',
      false,
    ),
    productionProvider: 'none',
    canMutateSqlite: false,
  };
}

module.exports = {
  loadAiConfig,
};
