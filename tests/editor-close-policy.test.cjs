const assert = require('node:assert/strict');
const test = require('node:test');
const { editorClosePolicy } = require('../.test-build/src/services/editor-close-policy.js');
test('unchanged new and populated edit drafts close without confirmation', () => {
  for (const draft of [{ title: '', amount: '' }, { title: 'Saved', currency: 'USD', stopId: 'stop-1' }]) {
    const value = JSON.stringify(draft);
    assert.equal(editorClosePolicy(value, value, false), 'close');
  }
});
test('every changed field requires explicit discard, including relationships and media', () => {
  const baseline = { title: 'Saved', amount: '10', stopId: 'stop-1', uri: 'file:///old', paid: false };
  for (const change of [{ title: 'Edited' }, { amount: '20' }, { stopId: 'stop-2' }, { uri: undefined }, { paid: true }]) {
    assert.equal(editorClosePolicy(JSON.stringify(baseline), JSON.stringify({ ...baseline, ...change }), false), 'confirm');
  }
  assert.equal(editorClosePolicy(null, '{}', false), 'confirm');
});
test('saving blocks both unchanged and dirty editor exits', () => {
  assert.equal(editorClosePolicy('{}', '{}', true), 'blocked');
  assert.equal(editorClosePolicy('{}', '{"title":"dirty"}', true), 'blocked');
});
