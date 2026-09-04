const assert = require('node:assert/strict');
const test = require('node:test');

const { loadAiConfig } = require('../ai-config');
const {
  AiProviderError,
  createAiProvider,
} = require('../ai-provider');
const {
  getConfiguredAiTools,
  listAiTools,
} = require('../ai-tools-registry');
const {
  TRAVELOS_COPILOT_SYSTEM_PROMPT,
} = require('../prompts/travelos-copilot');

test('loadAiConfig defaults to local Ollama candidates', () => {
  const config = loadAiConfig({});

  assert.equal(config.provider, 'ollama');
  assert.equal(config.baseUrl, 'http://127.0.0.1:11434');
  assert.equal(config.chatModel, 'qwen3:4b');
  assert.equal(config.embeddingModel, 'bge-m3');
  assert.equal(config.enabled, true);
  assert.equal(config.semanticSearchEnabled, true);
  assert.equal(config.visionEnabled, false);
  assert.equal(config.voiceEnabled, false);
  assert.equal(config.productionProvider, 'none');
  assert.equal(config.canMutateSqlite, false);
});

test('loadAiConfig prefers AI_* over OLLAMA_* aliases', () => {
  const config = loadAiConfig({
    AI_PROVIDER: 'ollama',
    AI_BASE_URL: 'http://127.0.0.1:11435',
    AI_CHAT_MODEL: 'qwen3:8b',
    AI_EMBEDDING_MODEL: 'bge-m3',
    OLLAMA_MODEL: 'should-not-win',
    OLLAMA_EMBED_MODEL: 'should-not-win',
    OLLAMA_BASE_URL: 'http://127.0.0.1:9999',
  });

  assert.equal(config.baseUrl, 'http://127.0.0.1:11435');
  assert.equal(config.chatModel, 'qwen3:8b');
  assert.equal(config.embeddingModel, 'bge-m3');
});

test('openai_compatible provider requires endpoint configuration', async () => {
  const provider = createAiProvider({
    AI_PROVIDER: 'openai_compatible',
    AI_ENABLED: 'true',
  });

  await assert.rejects(
    () =>
      provider.chat({
        messages: [{ role: 'user', content: 'hi' }],
      }),
    (error) =>
      error instanceof AiProviderError &&
      error.code === 'ai_provider_unavailable',
  );
});

test('AI_ENABLED=false fails closed before calling a backend', async () => {
  const provider = createAiProvider({
    AI_ENABLED: 'false',
    AI_PROVIDER: 'ollama',
  });

  await assert.rejects(
    () =>
      provider.chat({
        messages: [{ role: 'user', content: 'hi' }],
      }),
    (error) =>
      error instanceof AiProviderError &&
      error.code === 'ai_disabled',
  );
});

test('tool registry separates available TravelOS tools from stubs', () => {
  const configured = getConfiguredAiTools();
  const all = listAiTools();

  assert.ok(
    configured.every((tool) => tool.status === 'available'),
  );
  assert.ok(
    configured.some(
      (tool) => tool.name === 'adviseFreeTimeGap',
    ),
  );
  assert.ok(
    all.some(
      (tool) =>
        tool.name === 'getWeather' &&
        tool.status === 'not_configured',
    ),
  );
});

test('copilot system prompt forbids inventing travel facts', () => {
  assert.match(
    TRAVELOS_COPILOT_SYSTEM_PROMPT,
    /Never invent opening hours/i,
  );
  assert.match(
    TRAVELOS_COPILOT_SYSTEM_PROMPT,
    /TravelOS/i,
  );
});
