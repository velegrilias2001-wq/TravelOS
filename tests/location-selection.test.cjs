const assert = require('node:assert/strict');
const test = require('node:test');

const {
  LOCATION_PICKER_UNAVAILABLE_REASON,
  requestLocationSelection,
} = require(
  '../.test-build/src/services/location-selection.js',
);

const PLACE = {
  latitude: 52.3676,
  longitude: 4.9041,
  name: 'Amsterdam',
};

test('a confirmed place is reported as selected', async () => {
  const outcome = await requestLocationSelection(
    async () => PLACE,
  );

  assert.equal(outcome.status, 'selected');
  assert.deepEqual(outcome.result, PLACE);
});

test('closing the picker without choosing is an explicit dismissal, not silence', async () => {
  const outcome = await requestLocationSelection(
    async () => null,
  );

  assert.deepEqual(outcome, { status: 'dismissed' });
});

test('a presentation failure is reported as unavailable with a reason', async () => {
  const outcome = await requestLocationSelection(
    async () => {
      throw new Error('no activity available');
    },
  );

  assert.equal(outcome.status, 'unavailable');
  assert.equal(
    outcome.reason,
    LOCATION_PICKER_UNAVAILABLE_REASON,
  );
});

test('a provider failure inside the picker stays a dismissal instead of an invented error', async () => {
  // The native module logs a blocked/disabled Places response and submits an
  // empty prediction list, so JavaScript only ever sees null. TravelOS must
  // not claim to know that a provider error occurred.
  const outcome = await requestLocationSelection(
    async () => null,
  );

  assert.equal(outcome.status, 'dismissed');
  assert.ok(!('reason' in outcome));
});

test('picker options are forwarded unchanged', async () => {
  let received;

  await requestLocationSelection(
    async (options) => {
      received = options;
      return null;
    },
    { title: 'Choose destination', initialRadiusMeters: 120000 },
  );

  assert.deepEqual(received, {
    title: 'Choose destination',
    initialRadiusMeters: 120000,
  });
});
