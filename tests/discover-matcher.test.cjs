const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  CURATED_DISCOVER_CATALOGUE,
} = require(
  '../.test-build/src/services/discover-catalogue.js',
);

const {
  getCuratedDiscoverCandidates,
} = require(
  '../.test-build/src/services/discover-catalogue-candidates.js',
);

const {
  validateDiscoverCatalogue,
  validateDiscoverCatalogueRecord,
} = require(
  '../.test-build/src/services/discover-catalogue-validation.js',
);

const {
  matchCuratedDiscoverDestinations,
} = require(
  '../.test-build/src/services/discover-matcher.js',
);

function makeBrief(
  overrides = {},
) {
  return {
    mode: 'find_destination',
    interests: [],
    ...overrides,
  };
}

function makeTravelDNA(
  overrides = {},
) {
  return {
    id: 'travel-dna',
    pace: 'balanced',
    interests: [
      'food',
      'culture',
    ],
    travelStyle: 'local',
    budgetStyle: 'comfortable',
    dailyRhythm: 'morning',
    typicalParty: 'couple',
    ...overrides,
  };
}

test(
  'curated Discover catalogue validates successfully',
  () => {
    const result =
      validateDiscoverCatalogue(
        CURATED_DISCOVER_CATALOGUE,
      );

    assert.equal(
      result.length,
      8,
    );
  },
);

test(
  'curated catalogue rejects impossible evidence calendar dates',
  () => {
    const original =
      CURATED_DISCOVER_CATALOGUE[0];

    const invalidRecord = {
      ...original,

      evidence: [
        {
          ...original.evidence[0],
          checkedAt: '2026-02-30',
        },
      ],
    };

    assert.throws(
      () =>
        validateDiscoverCatalogueRecord(
          invalidRecord,
        ),
      /valid YYYY-MM-DD calendar date/i,
    );
  },
);

test(
  'curated catalogue rejects duplicate stable record ids',
  () => {
    const first =
      CURATED_DISCOVER_CATALOGUE[0];

    assert.throws(
      () =>
        validateDiscoverCatalogue([
          first,
          first,
        ]),
      /duplicate record id/i,
    );
  },
);

test(
  'curated catalogue becomes canonical grounded Discover candidates',
  () => {
    const candidates =
      getCuratedDiscoverCandidates();

    assert.equal(
      candidates.length,
      8,
    );

    for (
      const candidate
      of candidates
    ) {
      assert.equal(
        candidate.source,
        'curated',
      );

      assert.match(
        candidate.id,
        /^curated:/,
      );

      assert.ok(
        candidate.sourceId,
      );

      assert.equal(
        Number.isFinite(
          candidate.destination
            .latitude,
        ),
        true,
      );

      assert.equal(
        Number.isFinite(
          candidate.destination
            .longitude,
        ),
        true,
      );
    }
  },
);

test(
  'matcher ranks grounded destinations using explicit Discover context',
  () => {
    const matches =
      matchCuratedDiscoverDestinations(
        makeBrief({
          intent: 'romantic',

          pace: 'balanced',

          interests: [
            'beaches',
            'nature',
          ],

          party: 'couple',
        }),

        makeTravelDNA({
          travelStyle: 'local',
          dailyRhythm: 'night',
        }),
      );

    assert.equal(
      matches.length,
      8,
    );

    assert.equal(
      matches[0].candidate
        .destination.name,
      'Lisbon',
    );

    assert.equal(
      matches[0].candidate.source,
      'curated',
    );

    assert.ok(
      matches[0].score > 0,
    );
  },
);

test(
  'matcher reasons expose the real preference source',
  () => {
    const matches =
      matchCuratedDiscoverDestinations(
        makeBrief({
          intent: 'romantic',

          pace: 'balanced',

          interests: [
            'beaches',
            'nature',
          ],

          party: 'couple',
        }),

        makeTravelDNA({
          travelStyle: 'local',
          dailyRhythm: 'night',
        }),
      );

    const lisbon =
      matches.find(
        (match) =>
          match.candidate
            .destination.name ===
          'Lisbon',
      );

    assert.ok(lisbon);

    const intentReason =
      lisbon.reasons.find(
        (reason) =>
          reason.dimension ===
          'intent',
      );

    assert.deepEqual(
      intentReason,
      {
        dimension: 'intent',
        matchedValues: [
          'romantic',
        ],
        source: 'discover_brief',
      },
    );

    const travelStyleReason =
      lisbon.reasons.find(
        (reason) =>
          reason.dimension ===
          'travel_style',
      );

    assert.deepEqual(
      travelStyleReason,
      {
        dimension:
          'travel_style',
        matchedValues: [
          'local',
        ],
        source: 'travel_dna',
      },
    );
  },
);

test(
  'matcher never fabricates budget-style fit when catalogue has no budget classification',
  () => {
    const matches =
      matchCuratedDiscoverDestinations(
        makeBrief(),
        makeTravelDNA({
          budgetStyle:
            'comfortable',
        }),
      );

    for (
      const match
      of matches
    ) {
      assert.equal(
        match.reasons.some(
          (reason) =>
            reason.dimension ===
            'budget_style',
        ),
        false,
      );
    }
  },
);

test(
  'matcher produces stable alphabetical ordering when no matching context exists',
  () => {
    const matches =
      matchCuratedDiscoverDestinations(
        makeBrief(),
        null,
      );

    assert.deepEqual(
      matches.map(
        (match) =>
          match.candidate
            .destination.name,
      ),
      [
        'Amsterdam',
        'Barcelona',
        'Copenhagen',
        'Lisbon',
        'Porto',
        'Prague',
        'Rome',
        'Vienna',
      ],
    );

    for (
      const match
      of matches
    ) {
      assert.equal(
        match.score,
        0,
      );

      assert.deepEqual(
        match.reasons,
        [],
      );
    }
  },
);