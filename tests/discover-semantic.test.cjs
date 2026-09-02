const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  loadGroundedDiscoverCorpus,
} = require('../.test-build/src/services/discover-corpus.js');

const {
  matchCuratedDiscoverDestinations,
} = require('../.test-build/src/services/discover-matcher.js');

const {
  DISCOVER_EMBEDDING_MODEL_CANDIDATE,
  buildDiscoverDocumentText,
  buildDiscoverEmbeddingDocuments,
  buildDiscoverQueryText,
  hashDiscoverEmbeddingDocuments,
  mergeSemanticDiscoverMatches,
  prepareDiscoverSemanticQuery,
  resolveSemanticDiscoverMatches,
} = require('../.test-build/src/services/discover-semantic.js');

const {
  resolveDiscoverPersonalization,
} = require('../.test-build/src/services/discover-personalization.js');

function makeBrief(overrides = {}) {
  return {
    mode: 'find_destination',
    interests: [],
    ...overrides,
  };
}

function makeCandidate(id, name) {
  return {
    id,
    source: 'curated',
    sourceId: id.split(':')[1],
    destination: {
      name,
      latitude: 1,
      longitude: 2,
    },
  };
}

function makeMatch(id, name, score = 4) {
  return {
    candidate: makeCandidate(id, name),
    score,
    reasons: [],
  };
}

test(
  'document text uses only grounded name, country, and fit tags',
  () => {
    const corpus = loadGroundedDiscoverCorpus();
    const athens = corpus.records.find(
      (record) => record.id === 'gr-athens',
    );
    const bergen = corpus.records.find(
      (record) => record.id === 'no-bergen',
    );

    assert.ok(athens);
    assert.ok(bergen);

    assert.equal(
      buildDiscoverDocumentText(bergen),
      'Bergen, NO',
    );

    const athensText = buildDiscoverDocumentText(athens);

    assert.match(athensText, /^Athens, GR/);
    assert.match(athensText, /Trip intents: explore, food, family/);
    assert.doesNotMatch(athensText, /Visit Bergen/);
    assert.doesNotMatch(athensText, /37\.9838/);
  },
);

test(
  'query text uses explicit Discover context and omits timing or budget',
  () => {
    const personalization =
      resolveDiscoverPersonalization(
        makeBrief({
          intent: 'romantic',
          pace: 'slow',
          interests: ['nature'],
          party: 'couple',
          timing: {
            kind: 'exact',
            startDate: '2026-09-10',
            endDate: '2026-09-14',
          },
          budget: {
            maximumAmount: 1200,
            currency: 'EUR',
          },
        }),
        null,
      );

    const query = buildDiscoverQueryText(personalization);

    assert.equal(
      query,
      'Trip intents: romantic. Interests: nature. Pace: slow. Typical party: couple',
    );
  },
);

test(
  'empty explicit context produces no semantic query',
  () => {
    const query = prepareDiscoverSemanticQuery(
      makeBrief(),
      null,
    );

    assert.equal(query, null);
  },
);

test(
  'content hash changes when the corpus text or model changes',
  () => {
    const documents = buildDiscoverEmbeddingDocuments(
      loadGroundedDiscoverCorpus().records,
    );

    const hash = hashDiscoverEmbeddingDocuments(
      DISCOVER_EMBEDDING_MODEL_CANDIDATE,
      documents,
    );

    const mutated = documents.map((document, index) =>
      index === 0
        ? {
            ...document,
            text: `${document.text} extra`,
          }
        : document,
    );

    assert.notEqual(
      hashDiscoverEmbeddingDocuments(
        DISCOVER_EMBEDDING_MODEL_CANDIDATE,
        mutated,
      ),
      hash,
    );

    assert.notEqual(
      hashDiscoverEmbeddingDocuments('other-model', documents),
      hash,
    );

    assert.equal(
      hashDiscoverEmbeddingDocuments(
        DISCOVER_EMBEDDING_MODEL_CANDIDATE,
        [...documents].reverse(),
      ),
      hash,
    );
  },
);

test(
  'prepareDiscoverSemanticQuery hashes the live grounded corpus',
  () => {
    const prepared = prepareDiscoverSemanticQuery(
      makeBrief({ intent: 'nature' }),
      null,
    );

    assert.ok(prepared);
    assert.equal(prepared.limit, 8);
    assert.match(prepared.query, /Trip intents: nature/);

    const expected = hashDiscoverEmbeddingDocuments(
      DISCOVER_EMBEDDING_MODEL_CANDIDATE,
      buildDiscoverEmbeddingDocuments(
        loadGroundedDiscoverCorpus().records,
      ),
    );

    assert.equal(prepared.contentHash, expected);
  },
);

test(
  'hybrid merge keeps deterministic matches primary and drops unknown identities',
  () => {
    const deterministic = [
      makeMatch('curated:paris', 'Paris', 8),
      makeMatch('curated:lyon', 'Lyon', 6),
      makeMatch('curated:nice', 'Nice', 5),
      makeMatch('curated:marseille', 'Marseille', 4),
      makeMatch('curated:bordeaux', 'Bordeaux', 3),
      makeMatch('curated:toulouse', 'Toulouse', 2),
    ];

    const candidatesByIdentity = new Map([
      ['curated:paris', deterministic[0].candidate],
      ['curated:lyon', deterministic[1].candidate],
      ['curated:nice', deterministic[2].candidate],
      ['curated:marseille', deterministic[3].candidate],
      ['curated:bordeaux', deterministic[4].candidate],
      ['curated:toulouse', deterministic[5].candidate],
      [
        'curated:no-bergen',
        makeCandidate('curated:no-bergen', 'Bergen'),
      ],
    ]);

    const merged = mergeSemanticDiscoverMatches({
      deterministic,
      semanticHits: [
        { identity: 'curated:paris', score: 0.91 },
        { identity: 'curated:unknown', score: 0.88 },
        { identity: 'curated:no-bergen', score: 0.8 },
        { identity: 'curated:toulouse', score: 0.7 },
        { identity: 'curated:lyon', score: 0.6 },
      ],
      candidatesByIdentity,
    });

    assert.deepEqual(
      merged.primary.map((match) => match.candidate.id),
      [
        'curated:paris',
        'curated:lyon',
        'curated:nice',
        'curated:marseille',
        'curated:bordeaux',
      ],
    );

    assert.deepEqual(
      merged.semantic.map((match) => match.candidate.id),
      ['curated:no-bergen', 'curated:toulouse'],
    );

    assert.equal(
      merged.semantic[0].provenance,
      'semantic_match',
    );
  },
);

test(
  'committed embedding artifact stays in lockstep with the live corpus',
  () => {
    const artifactPath = path.join(
      __dirname,
      '..',
      'server',
      'data',
      'discover-corpus-embeddings.json',
    );

    assert.equal(
      fs.existsSync(artifactPath),
      true,
      'Generate the artifact with npm run generate:discover-embeddings',
    );

    const artifact = JSON.parse(
      fs.readFileSync(artifactPath, 'utf8'),
    );
    const documents = buildDiscoverEmbeddingDocuments(
      loadGroundedDiscoverCorpus().records,
    );
    const expectedHash = hashDiscoverEmbeddingDocuments(
      DISCOVER_EMBEDDING_MODEL_CANDIDATE,
      documents,
    );

    assert.equal(artifact.version, 1);
    assert.equal(
      artifact.model,
      DISCOVER_EMBEDDING_MODEL_CANDIDATE,
    );
    assert.equal(artifact.contentHash, expectedHash);
    assert.equal(
      artifact.documents.length,
      documents.length,
    );
    assert.deepEqual(
      artifact.documents.map((document) => document.identity).sort(),
      documents.map((document) => document.identity).sort(),
    );
  },
);

test(
  'resolveSemanticDiscoverMatches can surface grounded records without fit',
  () => {
    const brief = makeBrief({
      intent: 'romantic',
      pace: 'slow',
    });

    const deterministic =
      matchCuratedDiscoverDestinations(brief, null);

    const semantic = resolveSemanticDiscoverMatches(
      deterministic,
      [
        { identity: 'curated:no-bergen', score: 0.77 },
      ],
    );

    assert.equal(semantic.length, 1);
    assert.equal(semantic[0].candidate.id, 'curated:no-bergen');
    assert.equal(semantic[0].candidate.destination.name, 'Bergen');
    assert.equal(semantic[0].provenance, 'semantic_match');
  },
);
