const assert = require('node:assert/strict');
const test = require('node:test');

const {
  migrateDatabase,
} = require(
  '../.test-build/src/data/database/migrations.js',
);
const {
  addTravelerToTrip,
  createTravelerForTrip,
  getAllTravelers,
  getTravelerById,
  getTravelersByTripId,
  removeTravelerFromTrip,
  updateTravelerForTrip,
} = require(
  '../.test-build/src/data/repositories/traveler-persistence-operations.js',
);
const {
  cleanTravelerInput,
  travelerDisplayName,
  travelerInitials,
} = require(
  '../.test-build/src/services/traveler-details.js',
);
const {
  deleteCanonicalTrip,
} = require(
  '../.test-build/src/data/repositories/trip-persistence-operations.js',
);
const {
  NodeSQLiteDatabase,
} = require('./support/node-sqlite-database.cjs');

const TIMESTAMP = '2026-08-23T12:00:00.000Z';

async function createTravelerDatabase() {
  const database = new NodeSQLiteDatabase();
  await migrateDatabase(database);

  for (const tripId of ['trip-a', 'trip-b']) {
    await database.execute(
      `
        INSERT INTO trips (
          id, title, status, start_date, end_date,
          accounting_currency, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        tripId,
        tripId,
        'planned',
        '2026-09-01',
        '2026-09-03',
        'EUR',
        TIMESTAMP,
        TIMESTAMP,
      ],
    );
  }

  return database;
}

function makeTraveler(overrides = {}) {
  return {
    id: 'traveler-1',
    firstName: 'Alex',
    lastName: 'Morgan',
    type: 'adult',
    email: 'alex@example.test',
    phone: '+30 210 000 0000',
    avatarUri: undefined,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

test(
  'creating a traveler atomically persists one canonical identity and one trip membership',
  async () => {
    const database = await createTravelerDatabase();

    try {
      const traveler = makeTraveler();
      await createTravelerForTrip(
        database,
        'trip-a',
        traveler,
      );

      assert.deepEqual(
        await getTravelerById(
          database,
          traveler.id,
        ),
        traveler,
      );
      assert.deepEqual(
        await getTravelersByTripId(
          database,
          'trip-a',
        ),
        [traveler],
      );
      assert.deepEqual(
        await getAllTravelers(database),
        [traveler],
      );

      await assert.rejects(
        addTravelerToTrip(
          database,
          'trip-a',
          traveler.id,
        ),
        /already part/,
      );

      const membershipCount =
        await database.queryFirst(
          `
            SELECT COUNT(*) AS count
            FROM trip_travelers
            WHERE trip_id = ? AND traveler_id = ?;
          `,
          ['trip-a', traveler.id],
        );

      assert.equal(membershipCount.count, 1);
    } finally {
      database.close();
    }
  },
);

test(
  'one traveler can belong to multiple trips and canonical edits are visible through both memberships',
  async () => {
    const database = await createTravelerDatabase();

    try {
      const traveler = makeTraveler();
      await createTravelerForTrip(
        database,
        'trip-a',
        traveler,
      );
      await addTravelerToTrip(
        database,
        'trip-b',
        traveler.id,
      );

      const updated = {
        ...traveler,
        firstName: 'Alexandra',
        email: 'alexandra@example.test',
        updatedAt: '2026-08-23T13:00:00.000Z',
      };

      await updateTravelerForTrip(
        database,
        'trip-b',
        updated,
      );

      assert.equal(
        (
          await getTravelersByTripId(
            database,
            'trip-a',
          )
        )[0].firstName,
        'Alexandra',
      );
      assert.equal(
        (
          await getTravelersByTripId(
            database,
            'trip-b',
          )
        )[0].email,
        'alexandra@example.test',
      );
    } finally {
      database.close();
    }
  },
);

test(
  'removing one membership and deleting one trip preserve the independent traveler and other memberships',
  async () => {
    const database = await createTravelerDatabase();

    try {
      const traveler = makeTraveler();
      await createTravelerForTrip(
        database,
        'trip-a',
        traveler,
      );
      await addTravelerToTrip(
        database,
        'trip-b',
        traveler.id,
      );

      await removeTravelerFromTrip(
        database,
        'trip-a',
        traveler.id,
      );

      assert.deepEqual(
        await getTravelersByTripId(
          database,
          'trip-a',
        ),
        [],
      );
      assert.equal(
        (
          await getTravelersByTripId(
            database,
            'trip-b',
          )
        )[0].id,
        traveler.id,
      );
      assert.equal(
        (
          await getTravelerById(
            database,
            traveler.id,
          )
        ).firstName,
        'Alex',
      );

      await deleteCanonicalTrip(
        database,
        'trip-b',
      );

      assert.equal(
        (
          await getTravelerById(
            database,
            traveler.id,
          )
        ).id,
        traveler.id,
      );
      assert.equal(
        (
          await database.queryFirst(
            `
              SELECT COUNT(*) AS count
              FROM trip_travelers
              WHERE traveler_id = ?;
            `,
            [traveler.id],
          )
        ).count,
        0,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'membership operations reject invalid IDs and rollback partial traveler creation',
  async () => {
    const database = await createTravelerDatabase();

    try {
      await assert.rejects(
        createTravelerForTrip(
          database,
          'missing-trip',
          makeTraveler(),
        ),
        /Trip was not found/,
      );
      assert.equal(
        await getTravelerById(
          database,
          'traveler-1',
        ),
        null,
      );

      await assert.rejects(
        addTravelerToTrip(
          database,
          'trip-a',
          'missing-traveler',
        ),
        /Traveler was not found/,
      );

      await assert.rejects(
        database.execute(
          `
            INSERT INTO trip_travelers (
              trip_id,
              traveler_id
            ) VALUES (?, ?);
          `,
          ['trip-a', 'dangling-traveler'],
        ),
        /FOREIGN KEY constraint failed/,
      );
    } finally {
      database.close();
    }
  },
);

test(
  'traveler input stays lightweight, validated and presentation-safe',
  () => {
    assert.deepEqual(
      cleanTravelerInput({
        firstName: '  Alex ',
        lastName: ' Morgan  ',
        type: 'adult',
        email: ' alex@example.test ',
        phone: ' +30 210 000 0000 ',
      }),
      {
        firstName: 'Alex',
        lastName: 'Morgan',
        type: 'adult',
        email: 'alex@example.test',
        phone: '+30 210 000 0000',
      },
    );
    assert.throws(
      () =>
        cleanTravelerInput({
          firstName: ' ',
          type: 'adult',
        }),
      /required/,
    );
    assert.throws(
      () =>
        cleanTravelerInput({
          firstName: 'Alex',
          type: 'adult',
          email: 'not-an-email',
        }),
      /not valid/,
    );

    const traveler = makeTraveler();
    assert.equal(
      travelerDisplayName(traveler),
      'Alex Morgan',
    );
    assert.equal(travelerInitials(traveler), 'AM');
  },
);
