const assert = require('node:assert/strict');
const test = require('node:test');
const { hasUnsavedStopDraft } = require('../.test-build/src/services/stop-editor-draft.js');

const empty = { title: '', type: 'place', startTime: '', endTime: '', location: null };
const saved = { title: 'Saved moment', type: 'food', startTime: '09:00', endTime: '10:00',
  location: { name: 'Saved pin', address: 'Test address', latitude: 1, longitude: 2, placeId: 'test-id' } };

test('blank create and unchanged edit close without a discard warning', () => {
  assert.equal(hasUnsavedStopDraft(empty), false);
  assert.equal(hasUnsavedStopDraft({ ...saved, location: { ...saved.location } }, saved), false);
  assert.equal(hasUnsavedStopDraft(empty, { title: '', type: 'place' }), false);
});

test('new drafts protect title, type, either time and a picked location independently', () => {
  for (const change of [{ title: 'Draft' }, { type: 'food' }, { startTime: '09:00' },
    { endTime: '10:00' }, { location: saved.location }]) {
    assert.equal(hasUnsavedStopDraft({ ...empty, ...change }), true);
  }
});

test('edits and clearing existing values are dirty; reverting is clean', () => {
  for (const change of [{ title: '' }, { type: 'other' }, { startTime: '' },
    { endTime: '' }, { location: null }]) {
    assert.equal(hasUnsavedStopDraft({ ...saved, ...change }, saved), true);
  }
  assert.equal(hasUnsavedStopDraft(saved, saved), false);
});

test('every location fact is compared even when title and location name stay the same', () => {
  for (const [field, value] of Object.entries({ name: 'Another', address: 'Other',
    latitude: 3, longitude: 4, placeId: 'other-id' })) {
    assert.equal(hasUnsavedStopDraft({ ...saved, location: { ...saved.location, [field]: value } }, saved), true);
  }
});

test('import prefill is unsaved and legacy times are not normalized away', () => {
  assert.equal(hasUnsavedStopDraft({ ...empty, title: 'Imported claim' }), true);
  const legacy = { ...saved, startTime: '2026-09-08T09:00:00Z' };
  assert.equal(hasUnsavedStopDraft({ ...legacy }, legacy), false);
  assert.equal(hasUnsavedStopDraft({ ...legacy, startTime: '' }, legacy), true);
});
