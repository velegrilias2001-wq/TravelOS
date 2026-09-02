const assert = require('node:assert/strict');
const test = require('node:test');
const { ZodError } = require('zod');

const {
  buildDiscoverExplainPrompt,
  parseDiscoverExplainRequest,
  parseDiscoverExplainResponse,
} = require('../discover-explain');

function makeRequest() {
  return {
    identity: 'curated:pt-porto',
    brief: {
      intent: 'romantic',
      pace: 'slow',
      interests: ['culture'],
    },
    record: {
      name: 'Porto',
      countryCode: 'PT',
      fit: {
        intents: ['romantic'],
        interests: ['culture'],
        paces: ['slow'],
        travelStyles: ['local'],
        dailyRhythms: ['flexible'],
        parties: ['couple'],
      },
      evidenceLabels: ['Visit Porto'],
    },
    forbiddenNames: ['Lisbon', 'Bergen'],
  };
}

test(
  'parseDiscoverExplainRequest requires a grounded identity',
  () => {
    assert.throws(
      () =>
        parseDiscoverExplainRequest({
          ...makeRequest(),
          identity: 'porto',
        }),
      /identity is invalid/,
    );
  },
);

test(
  'explain prompt omits coordinates and other destination names',
  () => {
    const prompt = buildDiscoverExplainPrompt(
      parseDiscoverExplainRequest(makeRequest()),
    );

    assert.match(prompt, /Identity: curated:pt-porto/);
    assert.match(prompt, /Name: Porto/);
    assert.doesNotMatch(prompt, /41\./);
    assert.doesNotMatch(prompt, /Lisbon/);
    assert.match(prompt, /Never invent neighborhoods/);
  },
);

test(
  'parseDiscoverExplainResponse accepts a matching identity',
  () => {
    const parsed = parseDiscoverExplainResponse(
      JSON.stringify({
        identity: 'curated:pt-porto',
        sentences: [
          'Porto fits a slow romantic brief from its catalogue tags.',
        ],
      }),
      makeRequest(),
    );

    assert.equal(parsed.identity, 'curated:pt-porto');
    assert.equal(parsed.sentences.length, 1);
  },
);

test(
  'parseDiscoverExplainResponse rejects another destination',
  () => {
    assert.throws(
      () =>
        parseDiscoverExplainResponse(
          JSON.stringify({
            identity: 'curated:pt-porto',
            sentences: [
              'Choose Porto instead of Lisbon.',
            ],
          }),
          makeRequest(),
        ),
      /another destination/,
    );
  },
);

test(
  'parseDiscoverExplainRequest rejects a missing brief',
  () => {
    assert.throws(
      () =>
        parseDiscoverExplainRequest({
          identity: 'curated:pt-porto',
          record: makeRequest().record,
          forbiddenNames: [],
        }),
      ZodError,
    );
  },
);
