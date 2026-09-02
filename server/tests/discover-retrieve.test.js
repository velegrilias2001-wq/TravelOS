const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ZodError,
} = require('zod');

const {
  assertDiscoverEmbeddingArtifact,
  parseDiscoverRetrieveRequest,
  rankDiscoverEmbeddings,
} = require('../discover-retrieve');

function makeArtifact() {
  return assertDiscoverEmbeddingArtifact({
    version: 1,
    model: 'bge-m3',
    dimension: 2,
    contentHash: 'abc123',
    documents: [
      {
        identity: 'curated:north',
        text: 'North',
        vector: [1, 0],
      },
      {
        identity: 'curated:east',
        text: 'East',
        vector: [0, 1],
      },
      {
        identity: 'curated:northeast',
        text: 'Northeast',
        vector: [0.7, 0.7],
      },
    ],
  });
}

test(
  'rankDiscoverEmbeddings returns cosine-ranked grounded identities',
  () => {
    const ranked = rankDiscoverEmbeddings({
      artifact: makeArtifact(),
      queryVector: [0.2, 1],
      limit: 2,
    });

    assert.deepEqual(
      ranked.map((entry) => entry.identity),
      ['curated:east', 'curated:northeast'],
    );

    assert.ok(ranked[0].score > ranked[1].score);
  },
);

test(
  'rankDiscoverEmbeddings rejects a query vector with the wrong dimension',
  () => {
    assert.throws(
      () =>
        rankDiscoverEmbeddings({
          artifact: makeArtifact(),
          queryVector: [1, 0, 0],
        }),
      /dimension mismatch/,
    );
  },
);

test(
  'parseDiscoverRetrieveRequest rejects an empty query',
  () => {
    assert.throws(
      () =>
        parseDiscoverRetrieveRequest({
          query: '   ',
          contentHash: 'abc123',
        }),
      ZodError,
    );
  },
);

test(
  'assertDiscoverEmbeddingArtifact rejects duplicate identities',
  () => {
    assert.throws(
      () =>
        assertDiscoverEmbeddingArtifact({
          version: 1,
          model: 'bge-m3',
          dimension: 2,
          contentHash: 'abc123',
          documents: [
            {
              identity: 'curated:north',
              vector: [1, 0],
            },
            {
              identity: 'curated:north',
              vector: [0, 1],
            },
          ],
        }),
      /duplicate identity/,
    );
  },
);

test(
  'parseDiscoverRetrieveRequest accepts a valid retrieve body',
  () => {
    const parsed = parseDiscoverRetrieveRequest({
      query: 'Trip intents: romantic. Pace: slow',
      contentHash: 'abc123',
      limit: 5,
    });

    assert.equal(parsed.limit, 5);
    assert.equal(parsed.contentHash, 'abc123');
  },
);
