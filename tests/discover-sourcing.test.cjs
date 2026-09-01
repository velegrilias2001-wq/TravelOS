const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  CURATED_SOUTH_CENTRAL_EUROPE_PACK,
  CURATED_WESTERN_EUROPE_PACK,
} = require(
  '../.test-build/src/data/discover/index.js',
);

const {
  loadGroundedDiscoverCorpus,
} = require(
  '../.test-build/src/services/discover-corpus.js',
);

const {
  getGroundedDiscoverCandidates,
} = require(
  '../.test-build/src/services/discover-catalogue-candidates.js',
);

const {
  validateDiscoverCatalogueRecord,
} = require(
  '../.test-build/src/services/discover-catalogue-validation.js',
);

const {
  matchCuratedDiscoverDestinations,
} = require(
  '../.test-build/src/services/discover-matcher.js',
);

function makeBrief(overrides = {}) {
  return {
    mode: 'find_destination',
    interests: [],
    ...overrides,
  };
}

test(
  'default corpus merges grounded packs without inventing facts',
  () => {
    const corpus =
      loadGroundedDiscoverCorpus();

    assert.equal(
      corpus.records.length,
      12,
    );

    assert.equal(
      corpus.matchableRecords.length,
      11,
    );

    const bergen =
      corpus.records.find(
        (record) =>
          record.id === 'no-bergen',
      );

    assert.ok(bergen);
    assert.equal(
      bergen.fit,
      undefined,
    );
    assert.equal(
      bergen.destination.timezone,
      undefined,
    );
    assert.equal(
      bergen.destination.currencyCode,
      undefined,
    );
  },
);

test(
  'corpus identity is source plus record id, never destination name',
  () => {
    const lisbonTwin = {
      id: 'test-lisbon-other',
      destination: {
        name: 'Lisbon',
        countryCode: 'PT',
        latitude: 38.7223,
        longitude: -9.1393,
      },
      evidence: [
        {
          label: 'Visit Lisboa — Discover Lisbon',
          url: 'https://www.visitlisboa.com/en/regions/lisbon',
          checkedAt: '2026-09-01',
        },
      ],
    };

    const corpus =
      loadGroundedDiscoverCorpus([
        CURATED_WESTERN_EUROPE_PACK,
        {
          id: 'name-collision-pack',
          source: 'curated',
          records: [lisbonTwin],
        },
      ]);

    const lisbons =
      corpus.records.filter(
        (record) =>
          record.destination.name ===
          'Lisbon',
      );

    assert.equal(lisbons.length, 2);
    assert.equal(
      lisbons[0].id,
      'pt-lisbon',
    );
    assert.equal(
      lisbons[1].id,
      'test-lisbon-other',
    );
  },
);

test(
  'corpus rejects duplicate grounded identities across packs',
  () => {
    assert.throws(
      () =>
        loadGroundedDiscoverCorpus([
          CURATED_WESTERN_EUROPE_PACK,
          {
            id: 'duplicate-pack',
            source: 'curated',
            records:
              CURATED_WESTERN_EUROPE_PACK
                .records,
          },
        ]),
      /duplicate grounded identity/i,
    );
  },
);

test(
  'invalid destination facts fail closed before matching',
  () => {
    assert.throws(
      () =>
        validateDiscoverCatalogueRecord({
          id: 'bad-coords',
          destination: {
            name: 'Nowhere',
            latitude: 200,
            longitude: 0,
          },
          evidence: [
            {
              label: 'Example',
              url: 'https://example.com/',
              checkedAt: '2026-09-01',
            },
          ],
        }),
      /invalid latitude/i,
    );

    assert.throws(
      () =>
        loadGroundedDiscoverCorpus([
          {
            id: 'empty-pack',
            source: 'curated',
            records: [
              {
                ...CURATED_SOUTH_CENTRAL_EUROPE_PACK
                  .records[0],
                destination: {
                  ...CURATED_SOUTH_CENTRAL_EUROPE_PACK
                    .records[0]
                    .destination,
                  timezone: 'Not/AZone',
                },
              },
            ],
          },
        ]),
      /valid IANA identifier/i,
    );
  },
);

test(
  'grounded candidates include unfitted records and keep pack provenance',
  () => {
    const candidates =
      getGroundedDiscoverCandidates();

    assert.equal(
      candidates.length,
      12,
    );

    const bergen =
      candidates.find(
        (candidate) =>
          candidate.sourceId ===
          'no-bergen',
      );

    assert.ok(bergen);
    assert.equal(
      bergen.source,
      'curated',
    );
    assert.equal(
      bergen.id,
      'curated:no-bergen',
    );
    assert.equal(
      bergen.destination.timezone,
      undefined,
    );
  },
);

test(
  'matcher ranks only records that have editorial fit',
  () => {
    const matches =
      matchCuratedDiscoverDestinations(
        makeBrief(),
        null,
      );

    assert.equal(
      matches.length,
      11,
    );

    assert.equal(
      matches.some(
        (match) =>
          match.candidate.sourceId ===
          'no-bergen',
      ),
      false,
    );
  },
);
