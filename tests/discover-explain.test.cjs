const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assertExplanationSentences,
  prepareDiscoverExplanationRequest,
} = require('../.test-build/src/services/discover-explain.js');

function makeBrief(overrides = {}) {
  return {
    mode: 'find_destination',
    intent: 'romantic',
    pace: 'slow',
    interests: ['culture'],
    ...overrides,
  };
}

test(
  'explanation request uses grounded catalogue facts and omits coordinates',
  () => {
    const request =
      prepareDiscoverExplanationRequest(
        makeBrief(),
        null,
        'curated:pt-porto',
      );

    assert.ok(request);
    assert.equal(request.record.name, 'Porto');
    assert.equal(request.record.countryCode, 'PT');
    assert.ok(request.record.fit);
    assert.ok(request.record.fit.intents.includes('romantic'));
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        request.record,
        'latitude',
      ),
      false,
    );
    assert.ok(
      request.forbiddenNames.includes('Lisbon'),
    );
    assert.equal(
      request.forbiddenNames.includes('Porto'),
      false,
    );
  },
);

test(
  'grounded explanation accepts catalogue-tag sentences',
  () => {
    const request =
      prepareDiscoverExplanationRequest(
        makeBrief(),
        null,
        'curated:pt-porto',
      );

    assert.deepEqual(
      assertExplanationSentences(
        [
          'Porto fits a slow romantic trip because its catalogue tags include romantic intent and a slow pace.',
        ],
        request,
      ),
      [
        'Porto fits a slow romantic trip because its catalogue tags include romantic intent and a slow pace.',
      ],
    );
  },
);

test(
  'grounded explanation rejects another catalogue destination',
  () => {
    const request =
      prepareDiscoverExplanationRequest(
        makeBrief(),
        null,
        'curated:pt-porto',
      );

    assert.throws(
      () =>
        assertExplanationSentences(
          ['Porto is a slower alternative to Lisbon.'],
          request,
        ),
      /another destination/,
    );
  },
);

test(
  'grounded explanation rejects invented fit tags and prices',
  () => {
    const request =
      prepareDiscoverExplanationRequest(
        makeBrief(),
        null,
        'curated:pt-porto',
      );

    assert.throws(
      () =>
        assertExplanationSentences(
          ['Porto is tagged for adventure and wellness.'],
          request,
        ),
      /invented a fit tag/,
    );

    assert.throws(
      () =>
        assertExplanationSentences(
          ['Porto stays cost about €120 a night.'],
          request,
        ),
      /invented a price/,
    );
  },
);

test(
  'unfitted records cannot claim editorial tags',
  () => {
    const request =
      prepareDiscoverExplanationRequest(
        makeBrief({
          intent: 'nature',
          interests: ['nature'],
        }),
        null,
        'curated:no-bergen',
      );

    assert.ok(request);
    assert.equal(request.record.fit, undefined);

    assert.throws(
      () =>
        assertExplanationSentences(
          ['Bergen is a nature destination with fjords.'],
          request,
        ),
      /invented a fit tag/,
    );

    assert.deepEqual(
      assertExplanationSentences(
        [
          'Bergen is a grounded catalogue destination in NO. TravelOS has no editorial fit tags for it yet.',
        ],
        request,
      ),
      [
        'Bergen is a grounded catalogue destination in NO. TravelOS has no editorial fit tags for it yet.',
      ],
    );
  },
);
