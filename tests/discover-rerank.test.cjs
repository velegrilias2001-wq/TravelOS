const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyRerankedIdentities,
  reorderSemanticHitsByIdentities,
} = require('../.test-build/src/services/discover-rerank.js');

test(
  'rerank may only reorder already-retrieved grounded identities',
  () => {
    assert.deepEqual(
      applyRerankedIdentities(
        [
          'curated:pt-lisbon',
          'curated:es-barcelona',
          'curated:no-bergen',
        ],
        [
          'curated:no-bergen',
          'curated:pt-lisbon',
        ],
      ),
      [
        'curated:no-bergen',
        'curated:pt-lisbon',
        'curated:es-barcelona',
      ],
    );
  },
);

test(
  'rerank drops duplicate proposed identities and keeps original tail order',
  () => {
    assert.deepEqual(
      applyRerankedIdentities(
        ['curated:a', 'curated:b', 'curated:c'],
        ['curated:b', 'curated:b', 'curated:a'],
      ),
      ['curated:b', 'curated:a', 'curated:c'],
    );
  },
);

test(
  'rerank fails closed when a new identity is invented',
  () => {
    assert.throws(
      () =>
        applyRerankedIdentities(
          ['curated:pt-lisbon'],
          ['curated:made-up'],
        ),
      /invented grounded identity/,
    );
  },
);

test(
  'rerank fails closed on a non-list response',
  () => {
    assert.throws(
      () =>
        applyRerankedIdentities(
          ['curated:pt-lisbon'],
          { identities: ['curated:pt-lisbon'] },
        ),
      /not an identity list/,
    );
  },
);

test(
  'reorderSemanticHitsByIdentities keeps original order on invalid proposal',
  () => {
    const hits = [
      { identity: 'a', score: 0.9 },
      { identity: 'b', score: 0.8 },
    ];

    assert.deepEqual(
      reorderSemanticHitsByIdentities(hits, ['invented']),
      hits,
    );

    assert.deepEqual(
      reorderSemanticHitsByIdentities(hits, ['b', 'a']).map(
        (hit) => hit.identity,
      ),
      ['b', 'a'],
    );
  },
);
