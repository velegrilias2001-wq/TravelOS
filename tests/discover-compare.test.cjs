const assert = require('node:assert/strict');
const test = require('node:test');

const {
  compareDiscoverDestinations,
} = require('../.test-build/src/services/discover-compare.js');

const {
  loadGroundedDiscoverCorpus,
} = require('../.test-build/src/services/discover-corpus.js');

const {
  groundedDiscoverIdentity,
} = require('../.test-build/src/services/discover-semantic.js');

function brief(overrides = {}) {
  return {
    mode: 'find_destination',
    interests: [],
    ...overrides,
  };
}

test('compare requires two or three grounded identities', () => {
  assert.throws(
    () =>
      compareDiscoverDestinations({
        brief: brief({ intent: 'relax' }),
        travelDNA: null,
        identities: ['curated:pt-lisbon'],
      }),
    /2 or 3/,
  );
});

test('compare fails closed on unknown identities', () => {
  assert.throws(
    () =>
      compareDiscoverDestinations({
        brief: brief({ intent: 'relax' }),
        travelDNA: null,
        identities: [
          'curated:pt-lisbon',
          'curated:does-not-exist',
        ],
      }),
    /Unknown grounded destination/,
  );
});

test('compare cites catalogue fit against brief dimensions only', () => {
  const corpus = loadGroundedDiscoverCorpus();
  const withFit = corpus.matchableRecords.slice(0, 2);

  assert.ok(withFit.length === 2);

  const identities = withFit.map((record) =>
    groundedDiscoverIdentity(record.source, record.id),
  );

  const result = compareDiscoverDestinations({
    brief: brief({
      intent: 'explore',
      pace: 'slow',
      interests: ['food'],
    }),
    travelDNA: null,
    identities,
  });

  assert.equal(result.columns.length, 2);
  assert.ok(
    result.rows.every((row) =>
      ['intent', 'pace', 'interests'].includes(row.dimension),
    ),
  );
  assert.equal(
    result.rows.some((row) => row.dimension === 'budget_style'),
    false,
  );

  for (const row of result.rows) {
    assert.equal(row.cells.length, 2);
    for (const cell of row.cells) {
      assert.ok(
        ['match', 'no_match', 'unknown'].includes(cell.status),
      );
      if (cell.status === 'unknown') {
        assert.equal(cell.catalogueValues.length, 0);
      }
    }
  }
});

test('compare marks empty catalogue budget styles as unknown', () => {
  const corpus = loadGroundedDiscoverCorpus();
  const withFit = corpus.matchableRecords.slice(0, 2);
  const identities = withFit.map((record) =>
    groundedDiscoverIdentity(record.source, record.id),
  );

  const result = compareDiscoverDestinations({
    brief: brief({ intent: 'explore' }),
    travelDNA: {
      id: 'dna-1',
      interests: [],
      budgetStyle: 'comfortable',
      createdAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z',
    },
    identities,
  });

  const budgetRow = result.rows.find(
    (row) => row.dimension === 'budget_style',
  );

  assert.ok(budgetRow);
  assert.ok(
    budgetRow.cells.every((cell) => cell.status === 'unknown'),
  );
});
