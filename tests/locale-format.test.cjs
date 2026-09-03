const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  formatCurrencyAmount,
  resolveDisplayLocale,
} = require('../.test-build/src/services/locale-format.js');

test('resolveDisplayLocale returns a non-empty BCP 47 tag', () => {
  const locale = resolveDisplayLocale();
  assert.equal(typeof locale, 'string');
  assert.ok(locale.length > 0);
});

test('formatCurrencyAmount keeps the amount and EUR visible', () => {
  const formatted = formatCurrencyAmount(12.5, 'EUR');
  assert.match(formatted, /12/);
  assert.match(formatted, /€|EUR/);
});
