const assert = require('node:assert/strict');
const test = require('node:test');

const {
  adviseDiscoverBestTime,
  buildDiscoverBestTimeBrief,
  buildDiscoverBestTimeTripPrefill,
  formatDiscoverSupportedMonths,
  listDiscoverBestTimeDestinations,
} = require('../.test-build/src/services/discover-best-time.js');

const {
  validateDiscoverCatalogueRecord,
} = require('../.test-build/src/services/discover-catalogue-validation.js');

const {
  buildDiscoverDocumentText,
} = require('../.test-build/src/services/discover-semantic.js');

const {
  loadGroundedDiscoverCorpus,
} = require('../.test-build/src/services/discover-corpus.js');

test(
  'best time lists grounded catalogue destinations without inventing season data',
  () => {
    const destinations =
      listDiscoverBestTimeDestinations();

    assert.equal(destinations.length, 12);

    const names = destinations.map(
      (option) => option.destination.name,
    );

    assert.deepEqual(
      [...names].sort((left, right) =>
        left.localeCompare(right),
      ),
      names,
    );

    const lisbon = destinations.find(
      (option) => option.identity === 'curated:pt-lisbon',
    );
    const porto = destinations.find(
      (option) => option.identity === 'curated:pt-porto',
    );
    const bergen = destinations.find(
      (option) => option.identity === 'curated:no-bergen',
    );

    assert.equal(lisbon.hasSeasonGuidance, true);
    assert.equal(porto.hasSeasonGuidance, false);
    assert.equal(bergen.hasSeasonGuidance, true);
  },
);

test(
  'lisbon best time cites Visit Lisboa months and freshness without inventing dates',
  () => {
    const advice = adviseDiscoverBestTime(
      'curated:pt-lisbon',
    );

    assert.ok(advice);
    assert.equal(advice.kind, 'guided');
    assert.equal(advice.destination.name, 'Lisbon');
    assert.equal(advice.yearRound, true);
    assert.deepEqual(
      advice.supportedMonths,
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    );
    assert.equal(
      advice.evidence[0].label,
      'Visit Lisboa — Traveller information',
    );
    assert.equal(advice.freshness, '2026-09-02');
    assert.equal(
      formatDiscoverSupportedMonths(advice.supportedMonths),
      'Throughout the year',
    );

    const prefill = buildDiscoverBestTimeTripPrefill(
      advice.destination,
    );

    assert.equal(prefill.destination.name, 'Lisbon');
    assert.equal(prefill.startDate, undefined);
    assert.equal(prefill.endDate, undefined);

    const brief = buildDiscoverBestTimeBrief(
      advice.destination,
    );

    assert.equal(brief.mode, 'best_time');
    assert.equal(brief.timing, undefined);
  },
);

test(
  'bergen best time is year-round from Visit Norway and remains unfitted',
  () => {
    const advice = adviseDiscoverBestTime(
      'curated:no-bergen',
    );
    const corpus = loadGroundedDiscoverCorpus();
    const bergen = corpus.records.find(
      (record) => record.id === 'no-bergen',
    );

    assert.ok(advice);
    assert.equal(advice.kind, 'guided');
    assert.equal(advice.yearRound, true);
    assert.equal(
      advice.evidence[0].label,
      'Visit Norway — Facts about the fjords',
    );
    assert.equal(bergen.fit, undefined);
  },
);

test(
  'porto best time stays unknown instead of inventing months',
  () => {
    const advice = adviseDiscoverBestTime(
      'curated:pt-porto',
    );

    assert.ok(advice);
    assert.equal(advice.kind, 'unknown');
    assert.equal(advice.destination.name, 'Porto');
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        advice,
        'supportedMonths',
      ),
      false,
    );

    const prefill = buildDiscoverBestTimeTripPrefill(
      advice.destination,
    );

    assert.equal(prefill.startDate, undefined);
    assert.equal(prefill.endDate, undefined);
  },
);

test(
  'unknown grounded identity fails closed',
  () => {
    assert.equal(
      adviseDiscoverBestTime('curated:not-a-place'),
      null,
    );
  },
);

test(
  'timing without months or a cited source fails closed',
  () => {
    const destination = {
      name: 'Testville',
      latitude: 0,
      longitude: 0,
    };
    const evidence = [
      {
        label: 'Example',
        url: 'https://example.com/',
        checkedAt: '2026-09-02',
      },
    ];

    assert.throws(
      () =>
        validateDiscoverCatalogueRecord({
          id: 'empty-months',
          destination,
          timing: {
            supportedMonths: [],
            evidence,
          },
          evidence,
        }),
      /at least one supported month/i,
    );

    assert.throws(
      () =>
        validateDiscoverCatalogueRecord({
          id: 'empty-timing-evidence',
          destination,
          timing: {
            supportedMonths: [6],
            evidence: [],
          },
          evidence,
        }),
      /cite at least one source/i,
    );
  },
);

test(
  'adding catalogue timing does not change embedding document text',
  () => {
    const corpus = loadGroundedDiscoverCorpus();
    const lisbon = corpus.records.find(
      (record) => record.id === 'pt-lisbon',
    );
    const bergen = corpus.records.find(
      (record) => record.id === 'no-bergen',
    );

    assert.match(
      buildDiscoverDocumentText(lisbon),
      /^Lisbon, PT\. Trip intents:/,
    );
    assert.equal(
      buildDiscoverDocumentText(bergen),
      'Bergen, NO',
    );
    assert.equal(
      buildDiscoverDocumentText(lisbon).includes(
        'January',
      ),
      false,
    );
  },
);

test(
  'month lists stay explicit and do not invent a calendar range',
  () => {
    assert.equal(
      formatDiscoverSupportedMonths([6, 7, 8]),
      'June, July, and August',
    );
    assert.equal(
      formatDiscoverSupportedMonths([4, 10]),
      'April and October',
    );
    assert.equal(
      formatDiscoverSupportedMonths([9]),
      'September',
    );
  },
);
