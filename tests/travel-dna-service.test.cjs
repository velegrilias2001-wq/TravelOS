const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  TravelDNAService,
} = require(
  '../.test-build/src/services/travel-dna-service.js',
);

test(
  'Travel DNA service creates an explicit profile without inventing preferences',
  async () => {
    let stored = null;

    const repo = {
      travelDNA: {
        async get() {
          return stored;
        },
        async save(profile) {
          stored = profile;
        },
      },
    };

    const service =
      new TravelDNAService(
        repo,
        () => 'travel-dna-local',
        () => '2026-08-27T12:00:00.000Z',
      );

    const profile =
      await service.save({
        interests: [],
      });

    assert.deepEqual(
      profile,
      {
        id: 'travel-dna-local',
        pace: undefined,
        interests: [],
        travelStyle: undefined,
        budgetStyle: undefined,
        dailyRhythm: undefined,
        typicalParty: undefined,
        createdAt:
          '2026-08-27T12:00:00.000Z',
        updatedAt:
          '2026-08-27T12:00:00.000Z',
      },
    );

    assert.deepEqual(
      await service.get(),
      profile,
    );
  },
);

test(
  'Travel DNA service preserves identity and creation time when preferences are edited',
  async () => {
    let stored = {
      id: 'existing-profile',
      pace: 'slow',
      interests: ['nature'],
      travelStyle: 'local',
      budgetStyle: 'value',
      dailyRhythm: 'morning',
      typicalParty: 'solo',
      createdAt:
        '2026-08-20T08:00:00.000Z',
      updatedAt:
        '2026-08-20T08:00:00.000Z',
    };

    let generatedIds = 0;

    const repo = {
      travelDNA: {
        async get() {
          return stored;
        },
        async save(profile) {
          stored = profile;
        },
      },
    };

    const service =
      new TravelDNAService(
        repo,
        () => {
          generatedIds += 1;
          return 'should-not-be-used';
        },
        () => '2026-08-27T15:30:00.000Z',
      );

    const profile =
      await service.save({
        pace: 'full',
        interests: [
          'food',
          'culture',
        ],
        travelStyle: 'mix',
        budgetStyle: 'comfortable',
        dailyRhythm: 'night',
        typicalParty: 'friends',
      });

    assert.equal(
      generatedIds,
      0,
    );

    assert.deepEqual(
      profile,
      {
        id: 'existing-profile',
        pace: 'full',
        interests: [
          'food',
          'culture',
        ],
        travelStyle: 'mix',
        budgetStyle: 'comfortable',
        dailyRhythm: 'night',
        typicalParty: 'friends',
        createdAt:
          '2026-08-20T08:00:00.000Z',
        updatedAt:
          '2026-08-27T15:30:00.000Z',
      },
    );
  },
);
