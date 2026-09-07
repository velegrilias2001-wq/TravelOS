const assert = require('node:assert/strict');
const test = require('node:test');
const { createAiPreferencesLifecycle } = require('../.test-build/src/services/ai-preferences-lifecycle.js');
const cache = require('../.test-build/src/services/ai-preferences-cache.js');

test('AI request gate is closed before preference initialization', async () => {
  assert.equal(cache.getCachedAiEnabled(), false);
  await assert.rejects(cache.assertAiEnabledForClient(), /ai_disabled_by_traveler/);
});

test('failed preference load stays closed and a retry recovers', async () => {
  let enabled = false;
  let fail = true;
  const lifecycle = createAiPreferencesLifecycle({
    load: async () => { if (fail) throw new Error('read failed'); return { enabled: true }; },
    save: async (input) => input,
    publishEnabled: (value) => { enabled = value; },
  });
  await assert.rejects(lifecycle.refresh(), /read failed/);
  assert.equal(enabled, false);
  fail = false;
  await lifecycle.refresh();
  assert.equal(enabled, true);
});

test('an in-flight old read cannot re-enable AI after a disable intent', async () => {
  let releaseRead;
  let releaseSave;
  const published = [];
  const lifecycle = createAiPreferencesLifecycle({
    load: () => new Promise((resolve) => { releaseRead = resolve; }),
    save: () => new Promise((resolve) => { releaseSave = resolve; }),
    publishEnabled: (value) => published.push(value),
  });
  const refresh = lifecycle.refresh();
  await Promise.resolve();
  const disable = lifecycle.persist({ enabled: false });
  releaseRead({ enabled: true });
  await refresh;
  assert.ok(published.every((value) => value === false));
  releaseSave({ enabled: false });
  await disable;
  assert.equal(published.at(-1), false);
});

test('failed save keeps AI closed and does not poison subsequent operations', async () => {
  let enabled = true;
  let fail = true;
  const lifecycle = createAiPreferencesLifecycle({
    load: async () => ({ enabled: true }),
    save: async (input) => { if (fail) throw new Error('write failed'); return input; },
    publishEnabled: (value) => { enabled = value; },
  });
  const save = lifecycle.persist({ enabled: false });
  assert.equal(enabled, false);
  await assert.rejects(save, /write failed/);
  assert.equal(enabled, false);
  fail = false;
  await lifecycle.persist({ enabled: true });
  assert.equal(enabled, true);
});
