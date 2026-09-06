const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SavedPlaceService,
  buildSavedPlaceBrief,
  buildSavedPlaceTripPrefill,
} = require('../.test-build/src/services/saved-place-service.js');

const {
  deleteSavedPlace,
  getSavedPlaceByIdentity,
  listSavedPlaces,
  saveSavedPlace,
} = require('../.test-build/src/data/repositories/saved-place-persistence-operations.js');

const {
  DATABASE_VERSION,
  migrateDatabase,
} = require('../.test-build/src/data/database/migrations.js');

const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

function createMemoryService() {
  const rows = new Map();

  const repo = {
    savedPlaces: {
      async list() {
        return [...rows.values()].sort(
          (left, right) =>
            right.createdAt.localeCompare(left.createdAt),
        );
      },
      async getByIdentity(identity) {
        return (
          [...rows.values()].find(
            (row) => row.groundedIdentity === identity,
          ) ?? null
        );
      },
      async save(place) {
        rows.set(place.id, place);
      },
      async delete(id) {
        rows.delete(id);
      },
    },
  };

  return new SavedPlaceService(
    repo,
    () => `saved-${rows.size + 1}`,
    () => '2026-09-02T12:00:00.000Z',
  );
}

test(
  'saved ideas persist grounded catalogue destinations without creating a trip',
  async () => {
    const service = createMemoryService();

    const saved = await service.save({
      kind: 'destination',
      groundedIdentity: 'curated:pt-porto',
    });

    assert.equal(saved.kind, 'destination');
    assert.equal(saved.groundedIdentity, 'curated:pt-porto');
    assert.equal(saved.source, 'curated');

    const listings = await service.list();

    assert.equal(listings.length, 1);
    assert.equal(listings[0].title, 'Porto');
    assert.equal(listings[0].available, true);
    assert.equal(listings[0].destination.name, 'Porto');

    const brief = buildSavedPlaceBrief(listings[0]);
    const prefill = buildSavedPlaceTripPrefill(listings[0]);

    assert.equal(brief.mode, 'find_destination');
    assert.equal(brief.timing, undefined);
    assert.equal(prefill.startDate, undefined);
    assert.equal(prefill.endDate, undefined);
    assert.equal(prefill.destination.name, 'Porto');
  },
);

test(
  'saving the same grounded identity is idempotent',
  async () => {
    const service = createMemoryService();

    const first = await service.save({
      kind: 'destination',
      groundedIdentity: 'curated:pt-lisbon',
    });
    const second = await service.save({
      kind: 'destination',
      groundedIdentity: 'curated:pt-lisbon',
    });

    assert.equal(first.id, second.id);
    assert.equal((await service.list()).length, 1);
  },
);

test(
  'saved journeys keep extra cities as additional Create Trip destinations',
  async () => {
    const service = createMemoryService();

    await service.save({
      kind: 'journey',
      groundedIdentity: 'curated:lisbon-porto',
    });

    const [listing] = await service.list();

    assert.equal(listing.title, 'Lisbon and Porto');
    assert.match(listing.detail, /Porto/);

    const prefill = buildSavedPlaceTripPrefill(listing);

    assert.equal(prefill.destination.name, 'Lisbon');
    assert.equal(prefill.extraDestinations[0].name, 'Porto');
    assert.equal(prefill.startDate, undefined);
    assert.equal(prefill.intent, 'explore');
  },
);

test(
  'unknown identities fail closed and are not saved',
  async () => {
    const service = createMemoryService();

    await assert.rejects(
      () =>
        service.save({
          kind: 'destination',
          groundedIdentity: 'curated:not-a-place',
        }),
      /grounded catalogue destinations/i,
    );

    await assert.rejects(
      () =>
        service.save({
          kind: 'journey',
          groundedIdentity: 'curated:pt-porto',
        }),
      /grounded catalogue journeys/i,
    );

    assert.equal((await service.list()).length, 0);
  },
);

test(
  'removing a saved idea does not invent trip or world history',
  async () => {
    const service = createMemoryService();

    await service.save({
      kind: 'destination',
      groundedIdentity: 'curated:no-bergen',
    });

    await service.remove('curated:no-bergen');

    assert.equal((await service.list()).length, 0);
    assert.equal(
      await service.isSaved('curated:no-bergen'),
      false,
    );
  },
);

test(
  'sqlite saved places survive migration v10 and stay off the trip graph',
  async () => {
    const database = new NodeSQLiteDatabase();

    try {
      await migrateDatabase(database);

      const version = await database.queryFirst(
        'PRAGMA user_version;',
      );

      assert.equal(version.user_version, DATABASE_VERSION);
      assert.equal(DATABASE_VERSION, 21);

      await database.execute(
        `
          INSERT INTO trips (
            id, title, status, start_date, end_date,
            accounting_currency, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          'trip-1',
          'Existing Trip',
          'planned',
          '2026-10-01',
          '2026-10-05',
          'EUR',
          '2026-09-02T12:00:00.000Z',
          '2026-09-02T12:00:00.000Z',
        ],
      );

      const repository = {
        async list() {
          return listSavedPlaces(database);
        },
        async getByIdentity(identity) {
          return getSavedPlaceByIdentity(
            database,
            identity,
          );
        },
        async save(place) {
          await saveSavedPlace(database, place);
        },
        async delete(id) {
          await deleteSavedPlace(database, id);
        },
      };
      const service = new SavedPlaceService(
        { savedPlaces: repository },
        () => 'saved-sqlite-1',
        () => '2026-09-02T12:00:00.000Z',
      );

      await service.save({
        kind: 'destination',
        groundedIdentity: 'curated:pt-porto',
      });

      const trips = await database.query(
        'SELECT id FROM trips;',
      );
      const saved = await database.query(
        'SELECT grounded_identity FROM saved_places;',
      );

      assert.deepEqual(
        trips.map((row) => row.id),
        ['trip-1'],
      );
      assert.deepEqual(
        saved.map((row) => row.grounded_identity),
        ['curated:pt-porto'],
      );
    } finally {
      database.close();
    }
  },
);
