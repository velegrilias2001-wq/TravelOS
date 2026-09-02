const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CURATED_JOURNEY_RECORDS,
} = require('../.test-build/src/data/discover/curated-journeys.js');

const {
  parseDiscoverTripRouteParams,
  serializeDiscoverTripPrefill,
} = require('../.test-build/src/services/discover-trip-handoff.js');

const {
  buildDiscoverJourneyBrief,
  buildDiscoverJourneyTripPrefill,
  findDiscoverJourney,
  listDiscoverJourneys,
  loadDiscoverJourneys,
  validateDiscoverJourneyRecord,
} = require('../.test-build/src/services/discover-journeys.js');

test(
  'ready-made journeys are grounded catalogue ideas, not trips',
  () => {
    const journeys = listDiscoverJourneys();

    assert.equal(journeys.length, 3);

    const porto = findDiscoverJourney('curated:slow-porto');
    const atlantic = findDiscoverJourney('curated:lisbon-porto');
    const bergen = findDiscoverJourney('curated:bergen-fjords');

    assert.ok(porto);
    assert.equal(porto.destinations[0].name, 'Porto');
    assert.equal(porto.intent, 'romantic');
    assert.equal(porto.pace, 'slow');

    assert.ok(atlantic);
    assert.deepEqual(
      atlantic.destinations.map((destination) => destination.name),
      ['Lisbon', 'Porto'],
    );
    assert.equal(atlantic.intent, 'explore');
    assert.equal(atlantic.pace, 'balanced');

    assert.ok(bergen);
    assert.equal(bergen.destinations[0].name, 'Bergen');
    assert.equal(bergen.intent, undefined);
    assert.equal(bergen.pace, undefined);
  },
);

test(
  'accepting a journey prefills extra catalogue cities and never invents dates',
  () => {
    const atlantic = findDiscoverJourney('curated:lisbon-porto');
    const brief = buildDiscoverJourneyBrief(atlantic);
    const prefill = buildDiscoverJourneyTripPrefill(atlantic);

    assert.equal(brief.mode, 'journey_ideas');
    assert.equal(brief.destination.name, 'Lisbon');
    assert.equal(brief.timing, undefined);
    assert.equal(prefill.destination.name, 'Lisbon');
    assert.equal(prefill.extraDestinations[0].name, 'Porto');
    assert.equal(prefill.startDate, undefined);
    assert.equal(prefill.endDate, undefined);
    assert.equal(prefill.intent, 'explore');
    assert.equal(prefill.pace, 'balanced');

    const parsed = parseDiscoverTripRouteParams(
      serializeDiscoverTripPrefill(prefill),
    );
    assert.equal(parsed.extraDestinations[0].name, 'Porto');
  },
);

test(
  'unknown destination identities fail closed',
  () => {
    assert.throws(
      () =>
        validateDiscoverJourneyRecord({
          id: 'ghost-city',
          title: 'Ghost city',
          summary: 'Not in the catalogue.',
          destinationIdentities: ['curated:not-a-place'],
          evidence: [
            {
              label: 'Example',
              url: 'https://example.com/',
              checkedAt: '2026-09-02',
            },
          ],
        }),
      /unknown destination/i,
    );
  },
);

test(
  'unfitted destinations cannot claim editorial intent',
  () => {
    assert.throws(
      () =>
        validateDiscoverJourneyRecord({
          id: 'bergen-romantic',
          title: 'Romantic Bergen',
          summary: 'Invented fit.',
          destinationIdentities: ['curated:no-bergen'],
          intent: 'romantic',
          evidence: [
            {
              label: 'Visit Bergen — Official Guide',
              url: 'https://en.visitbergen.com/',
              checkedAt: '2026-09-02',
            },
          ],
        }),
      /without fit/i,
    );
  },
);

test(
  'duplicate journey identities fail closed',
  () => {
    const porto = CURATED_JOURNEY_RECORDS[0];

    assert.throws(
      () =>
        loadDiscoverJourneys([
          porto,
          {
            ...porto,
            title: 'Copy',
          },
        ]),
      /duplicate identity/i,
    );
  },
);
