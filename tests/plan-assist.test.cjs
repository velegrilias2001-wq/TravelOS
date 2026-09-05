const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildPlanAssistCandidates,
  buildStopFromPlanAssistCandidate,
  findCatalogueRecordForDestination,
} = require('../.test-build/src/services/plan-assist.js');

const LISBON = {
  id: 'dest-lisbon',
  name: 'Lisbon',
  latitude: 38.7223,
  longitude: -9.1393,
};

test(
  'findCatalogueRecordForDestination matches only exact coordinates',
  () => {
    const hit = findCatalogueRecordForDestination(LISBON);
    assert.ok(hit);
    assert.equal(hit.id, 'pt-lisbon');

    const byNameOnly = findCatalogueRecordForDestination({
      id: 'x',
      name: 'Lisbon',
    });
    assert.equal(byNameOnly, null);

    const nearby = findCatalogueRecordForDestination({
      id: 'x',
      name: 'Lisbon',
      latitude: 38.7224,
      longitude: -9.1393,
    });
    assert.equal(nearby, null);
  },
);

test(
  'buildPlanAssistCandidates never invents venue titles',
  () => {
    const candidates = buildPlanAssistCandidates({
      dayDestination: LISBON,
      preferences: {
        tripIntent: 'food',
        interests: ['culture', 'food'],
      },
      limit: 5,
    });

    assert.ok(candidates.length >= 3);
    assert.ok(
      candidates.some((c) => c.activityType === 'food_browse'),
    );

    for (const candidate of candidates) {
      assert.match(
        candidate.provenance.label,
        /curated ·/,
      );
      assert.equal(
        candidate.location?.name,
        'Lisbon',
      );
      assert.doesNotMatch(
        candidate.title,
        /Alfama|Belém|restaurant|museum|ticket/i,
      );
      assert.doesNotMatch(
        candidate.body,
        /Alfama|Belém|[A-Z][a-z]+ Street/i,
      );
    }
  },
);

test(
  'buildPlanAssistCandidates without city stays theme-only',
  () => {
    const candidates = buildPlanAssistCandidates({
      dayDestination: null,
      preferences: {
        tripIntent: 'relax',
        interests: ['wellness'],
      },
      limit: 4,
    });

    assert.ok(candidates.length >= 2);
    for (const candidate of candidates) {
      assert.equal(candidate.provenance.kind, 'theme');
      assert.equal(candidate.location, undefined);
    }

    assert.ok(
      candidates.some(
        (c) => c.activityType === 'coffee_or_rest',
      ),
    );
  },
);

test(
  'buildStopFromPlanAssistCandidate keeps provenance in notes',
  () => {
    const [candidate] = buildPlanAssistCandidates({
      dayDestination: LISBON,
      preferences: { tripIntent: 'explore' },
      limit: 1,
    });

    const stop = buildStopFromPlanAssistCandidate({
      candidate,
      tripId: 'trip-1',
      dayId: 'day-1',
      order: 1,
      id: 'stop-1',
      nowIso: '2026-09-05T12:00:00.000Z',
    });

    assert.equal(stop.title, candidate.title);
    assert.equal(stop.tripId, 'trip-1');
    assert.equal(stop.dayId, 'day-1');
    assert.equal(stop.order, 1);
    assert.match(stop.notes ?? '', /Plan Assist · curated:pt-lisbon/);
    assert.equal(stop.location?.latitude, 38.7223);
    assert.equal(stop.startTime, undefined);
  },
);

test(
  'existing titles are skipped',
  () => {
    const candidates = buildPlanAssistCandidates({
      dayDestination: null,
      preferences: { interests: ['food'] },
      existingTitles: ['Browse local food'],
      limit: 5,
    });

    assert.ok(
      candidates.every(
        (c) => c.title !== 'Browse local food',
      ),
    );
  },
);
