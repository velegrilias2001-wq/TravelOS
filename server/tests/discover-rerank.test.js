const assert = require('node:assert/strict');
const test = require('node:test');
const { ZodError } = require('zod');

const {
  buildDiscoverRerankPrompt,
  parseDiscoverRerankRequest,
  parseDiscoverRerankResponse,
} = require('../discover-rerank');

test(
  'parseDiscoverRerankRequest accepts grounded candidates only',
  () => {
    const parsed = parseDiscoverRerankRequest({
      query: 'Trip intents: romantic. Pace: slow',
      candidates: [
        {
          identity: 'curated:pt-porto',
          text: 'Porto, PT',
        },
      ],
    });

    assert.equal(parsed.candidates.length, 1);
  },
);

test(
  'parseDiscoverRerankRequest rejects an empty candidate list',
  () => {
    assert.throws(
      () =>
        parseDiscoverRerankRequest({
          query: 'nature',
          candidates: [],
        }),
      ZodError,
    );
  },
);

test(
  'rerank prompt lists only supplied grounded identities',
  () => {
    const prompt = buildDiscoverRerankPrompt({
      query: 'Fjords in Norway',
      candidates: [
        {
          identity: 'curated:no-bergen',
          text: 'Bergen, NO',
        },
      ],
    });

    assert.match(prompt, /curated:no-bergen — Bergen, NO/);
    assert.match(prompt, /Do not invent destinations/);
    assert.doesNotMatch(prompt, /Oslo/);
  },
);

test(
  'parseDiscoverRerankResponse accepts a JSON identity list',
  () => {
    assert.deepEqual(
      parseDiscoverRerankResponse(
        '{"identities":["curated:no-bergen","curated:pt-porto"]}',
      ),
      ['curated:no-bergen', 'curated:pt-porto'],
    );
  },
);

test(
  'parseDiscoverRerankResponse rejects invalid JSON',
  () => {
    assert.throws(
      () => parseDiscoverRerankResponse('not-json'),
      /invalid JSON/,
    );
  },
);
