const assert = require('node:assert/strict');
const test = require('node:test');

const {
  listBookingQuickActions,
  normalizeHttpUrl,
} = require('../.test-build/src/services/booking-actions.js');

test('booking quick actions only expose saved url and confirmation code', () => {
  assert.deepEqual(
    listBookingQuickActions({
      title: 'Ferry',
    }),
    [],
  );

  const actions = listBookingQuickActions({
    title: 'Ferry',
    externalUrl: 'booking.example/confirm',
    confirmationCode: 'ABC123',
  });

  assert.equal(actions.length, 2);
  assert.equal(actions[0].id, 'open_url');
  assert.equal(
    actions[0].value,
    'https://booking.example/confirm',
  );
  assert.equal(actions[1].id, 'copy_code');
  assert.equal(actions[1].value, 'ABC123');
});

test('normalizeHttpUrl rejects non-http schemes', () => {
  assert.equal(normalizeHttpUrl('javascript:alert(1)'), null);
  assert.equal(normalizeHttpUrl(''), null);
  assert.equal(
    normalizeHttpUrl('https://example.com/path'),
    'https://example.com/path',
  );
});
