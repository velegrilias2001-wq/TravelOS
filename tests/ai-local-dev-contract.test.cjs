const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AI_LOCAL_DEV_CONTRACT,
  LOCAL_DEV_AI_FALLBACK_URL,
  isLocalDevAiBaseUrl,
  resolveLocalDevAiBaseUrl,
} = require('../.test-build/src/services/ai-local-dev-contract.js');

test('local-dev AI contract refuses a production provider and SQLite writes', () => {
  assert.equal(AI_LOCAL_DEV_CONTRACT.productionProvider, 'none');
  assert.equal(AI_LOCAL_DEV_CONTRACT.shipping, 'local-dev-only');
  assert.equal(AI_LOCAL_DEV_CONTRACT.canMutateSqlite, false);
  assert.equal(AI_LOCAL_DEV_CONTRACT.canWriteBookings, false);
  assert.equal(AI_LOCAL_DEV_CONTRACT.cloudRetention, 'none');
  assert.equal(AI_LOCAL_DEV_CONTRACT.billedCost, 'none');
  assert.equal(AI_LOCAL_DEV_CONTRACT.unreachableFallback, 'degrade');
});

test('loopback AI URLs are local-dev, cloud URLs are not', () => {
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

test('non-local AI config is ignored instead of calling a cloud host', () => {
  assert.equal(
    resolveLocalDevAiBaseUrl(undefined),
    LOCAL_DEV_AI_FALLBACK_URL,
  );
  assert.equal(
    resolveLocalDevAiBaseUrl('http://127.0.0.1:8790/'),
    'http://127.0.0.1:8790',
  );
  assert.equal(
    resolveLocalDevAiBaseUrl('https://api.openai.com/v1'),
    LOCAL_DEV_AI_FALLBACK_URL,
  );
  assert.equal(
    resolveLocalDevAiBaseUrl('http://example.com:8789'),
    LOCAL_DEV_AI_FALLBACK_URL,
  );
});
