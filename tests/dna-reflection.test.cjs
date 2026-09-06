const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyDnaReflectionProposal,
  selectDnaReflectionProposals,
} = require('../.test-build/src/services/dna-reflection.js');

const {
  buildTripShareSnapshot,
} = require('../.test-build/src/services/trip-share-snapshot.js');

const TIMESTAMP = '2026-09-06T12:00:00.000Z';

test('DNA reflection proposes only missing explicit Brief fields', () => {
  const proposals = selectDnaReflectionProposals({
    travelDNA: {
      id: 'dna-1',
      interests: ['culture'],
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    brief: {
      mode: 'find_destination',
      pace: 'slow',
      interests: ['culture', 'food'],
      party: 'couple',
    },
  });

  assert.ok(proposals.some((item) => item.id === 'pace'));
  assert.ok(proposals.some((item) => item.id === 'interests'));
  assert.ok(proposals.some((item) => item.id === 'party'));

  const interestProposal = proposals.find(
    (item) => item.id === 'interests',
  );
  assert.deepEqual(interestProposal.value, ['food']);
});

test('DNA reflection accepts Plan Assist interest without inventing others', () => {
  const {
    interestFromPlanAssistActivity,
  } = require('../.test-build/src/services/dna-reflection.js');

  assert.equal(
    interestFromPlanAssistActivity('food_browse'),
    'food',
  );
  assert.equal(
    interestFromPlanAssistActivity('unknown_theme'),
    null,
  );

  const proposals = selectDnaReflectionProposals({
    travelDNA: {
      id: 'dna-1',
      interests: [],
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    acceptedInterests: ['food'],
  });

  assert.equal(proposals.length, 1);
  assert.deepEqual(proposals[0].value, ['food']);
});

test('DNA reflection apply merges interests without inventing others', () => {
  const next = applyDnaReflectionProposal(
    {
      id: 'dna-1',
      interests: ['culture'],
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    {
      id: 'interests',
      field: 'interests',
      title: 't',
      body: 'b',
      value: ['food'],
    },
  );

  assert.deepEqual(next.interests, ['culture', 'food']);
  assert.equal(next.pace, undefined);
});

test('trip share snapshot omits confirmation codes and stays text-only', () => {
  const snapshot = buildTripShareSnapshot({
    trip: {
      id: 'trip-1',
      title: 'Lisboa',
      status: 'planned',
      destinations: [
        {
          id: 'd1',
          tripId: 'trip-1',
          name: 'Lisboa, Portugal',
          order: 0,
        },
      ],
      startDate: '2026-09-06',
      endDate: '2026-09-08',
      travelerIds: [],
      accountingCurrency: 'EUR',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    days: [],
    stops: [],
    bookings: [
      {
        id: 'b1',
        tripId: 'trip-1',
        type: 'flight',
        status: 'confirmed',
        title: 'Secret flight',
        confirmationCode: 'SECRET123',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    accommodations: [],
    packingTotal: 1,
    packingPacked: 0,
  });

  assert.match(snapshot.text, /Lisboa/);
  assert.match(snapshot.text, /1 booking/);
  assert.doesNotMatch(snapshot.text, /SECRET123/);
  assert.match(snapshot.text, /non-secret summary/);
});
