const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AI_LOCAL_DEV_CONTRACT,
  LOCAL_DEV_AI_FALLBACK_URL,
  isLocalDevAiBaseUrl,
  isAllowedAiBaseUrl,
  resolveLocalDevAiBaseUrl,
  resolveTravelOsAiBaseUrl,
} = require('../.test-build/src/services/ai-local-dev-contract.js');

test('AI contract keeps confirm-only writes and openai_compatible production path', () => {
  assert.equal(
    AI_LOCAL_DEV_CONTRACT.productionProvider,
    'openai_compatible',
  );
  assert.equal(AI_LOCAL_DEV_CONTRACT.shipping, 'proxy-gated');
  assert.equal(AI_LOCAL_DEV_CONTRACT.canMutateSqlite, false);
  assert.equal(AI_LOCAL_DEV_CONTRACT.canWriteBookings, false);
  assert.equal(AI_LOCAL_DEV_CONTRACT.cloudRetention, 'none');
  assert.equal(AI_LOCAL_DEV_CONTRACT.billedCost, 'none');
  assert.equal(AI_LOCAL_DEV_CONTRACT.unreachableFallback, 'degrade');
});

test('loopback AI URLs are local-dev, cloud OpenAI direct is not loopback', () => {
  assert.equal(
    isLocalDevAiBaseUrl('http://127.0.0.1:8789'),
    true,
  );
  assert.equal(
    isLocalDevAiBaseUrl('http://localhost:8789/'),
    true,
  );
  assert.equal(
    isLocalDevAiBaseUrl('http://[::1]:8789'),
    true,
  );
  assert.equal(
    isLocalDevAiBaseUrl('https://api.openai.com/v1'),
    false,
  );
  assert.equal(
    isLocalDevAiBaseUrl('http://10.0.2.2:8789'),
    false,
  );
  assert.equal(
    isLocalDevAiBaseUrl('http://user:pass@127.0.0.1:8789'),
    false,
  );
  assert.equal(
    isLocalDevAiBaseUrl('not-a-url'),
    false,
  );
});

test('allowed AI proxy URLs include loopback and HTTPS remotes', () => {
  assert.equal(
    isAllowedAiBaseUrl('http://127.0.0.1:8789'),
    true,
  );
  assert.equal(
    isAllowedAiBaseUrl('https://ai.travelos.example/v1'),
    true,
  );
  assert.equal(
    isAllowedAiBaseUrl('http://192.168.1.10:8789'),
    false,
  );
  assert.equal(
    isAllowedAiBaseUrl('http://192.168.1.10:8789', {
      allowCleartextRemote: true,
    }),
    true,
  );
  assert.equal(
    isAllowedAiBaseUrl('https://user:pass@evil.example'),
    false,
  );
});

test('resolveTravelOsAiBaseUrl accepts HTTPS proxy and falls back for unsafe hosts', () => {
  assert.equal(
    resolveTravelOsAiBaseUrl(undefined),
    LOCAL_DEV_AI_FALLBACK_URL,
  );
  assert.equal(
    resolveTravelOsAiBaseUrl('http://127.0.0.1:8790/'),
    'http://127.0.0.1:8790',
  );
  assert.equal(
    resolveTravelOsAiBaseUrl('https://ai.travelos.example'),
    'https://ai.travelos.example',
  );
  assert.equal(
    resolveTravelOsAiBaseUrl('http://example.com:8789'),
    LOCAL_DEV_AI_FALLBACK_URL,
  );
  assert.equal(
    resolveLocalDevAiBaseUrl('https://ai.travelos.example'),
    'https://ai.travelos.example',
  );
});
