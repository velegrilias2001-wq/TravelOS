const assert = require('node:assert/strict');
const test = require('node:test');
const { restoreWithRefresh } = require('../.test-build/src/services/local-data-restore-effects.js');

test('successful restore refreshes only after commit', async () => {
  const calls = [];
  assert.deepEqual(await restoreWithRefresh(async () => { calls.push('commit'); }, async () => { calls.push('refresh'); }), { refreshFailed: false });
  assert.deepEqual(calls, ['commit', 'refresh']);
});
test('failed database restore does not refresh or report success', async () => {
  let refreshed = false;
  await assert.rejects(restoreWithRefresh(async () => { throw new Error('SQL failure'); }, async () => { refreshed = true; }), /SQL failure/);
  assert.equal(refreshed, false);
});
test('failed post-commit refresh reports restored data without retrying replacement', async () => {
  let replacements = 0;
  const result = await restoreWithRefresh(async () => { replacements++; }, async () => { throw new Error('Read failure'); });
  assert.equal(result.refreshFailed, true);
  assert.equal(replacements, 1);
});
