const assert =
  require('node:assert/strict');

const test =
  require('node:test');

const {
  TripWorkspaceLifecycle,
} = require(
  '../.test-build/src/features/trip-workspace/trip-workspace-lifecycle.js',
);

const TIMESTAMP =
  '2026-08-23T12:00:00.000Z';

function makeWorkspace() {
  return {
    trip: {
      id: 'trip-1',
      title: 'Workspace Test',
      status: 'planned',
      destinations: [],
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      travelerIds: [],
      accountingCurrency: 'EUR',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    days: [
      {
        id: 'day-1',
        tripId: 'trip-1',
        date: '2026-09-01',
        dayNumber: 1,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    stops: [],
    bookings: [],
    accommodations: [],
    travelers: [],
    budget: null,
    fxRates: [],
    runtimeState: null,
    stopLivedStates: [],
    memories: [],
    travelBook: null,
  };
}

function clone(value) {
  return structuredClone(value);
}

test(
  'workspace lifecycle loads one complete workspace snapshot',
  async () => {
    const expected = makeWorkspace();

    const lifecycle =
      new TripWorkspaceLifecycle(
        'trip-1',
        async () => clone(expected),
      );

    assert.equal(
      lifecycle.getSnapshot().status,
      'loading',
    );

    await lifecycle.refreshIfNeeded();

    const snapshot =
      lifecycle.getSnapshot();

    assert.equal(
      snapshot.status,
      'ready',
    );
    assert.deepEqual(
      snapshot.workspace,
      expected,
    );
    assert.equal(snapshot.error, null);
  },
);

test(
  'workspace lifecycle represents a missing trip as not found',
  async () => {
    const lifecycle =
      new TripWorkspaceLifecycle(
        'missing-trip',
        async () => null,
      );

    await lifecycle.refreshIfNeeded();

    assert.deepEqual(
      lifecycle.getSnapshot(),
      {
        status: 'not-found',
        workspace: null,
        error: null,
      },
    );
  },
);

test(
  'workspace lifecycle rejects a missing route trip ID without loading',
  async () => {
    let loadCount = 0;

    const lifecycle =
      new TripWorkspaceLifecycle(
        null,
        async () => {
          loadCount += 1;
          return makeWorkspace();
        },
      );

    await lifecycle.refreshIfNeeded();

    assert.equal(loadCount, 0);
    assert.deepEqual(
      lifecycle.getSnapshot(),
      {
        status: 'not-found',
        workspace: null,
        error: null,
      },
    );
  },
);

test(
  'focus refresh skips current data and reloads invalidated data',
  async () => {
    let loadCount = 0;

    const lifecycle =
      new TripWorkspaceLifecycle(
        'trip-1',
        async () => {
          loadCount += 1;
          return makeWorkspace();
        },
      );

    await lifecycle.refreshIfNeeded();
    await lifecycle.refreshIfNeeded();

    assert.equal(loadCount, 1);

    lifecycle.invalidate();
    await lifecycle.refreshIfNeeded();

    assert.equal(loadCount, 2);
    assert.equal(
      lifecycle.getSnapshot().status,
      'ready',
    );
  },
);

test(
  'a Plan mutation refreshes every consumer from shared trip truth',
  async () => {
    const durableTruth = makeWorkspace();

    const lifecycle =
      new TripWorkspaceLifecycle(
        'trip-1',
        async () =>
          clone(durableTruth),
      );

    let planSnapshot = null;
    let mapSnapshot = null;

    lifecycle.subscribe(() => {
      planSnapshot =
        lifecycle.getSnapshot();
    });

    lifecycle.subscribe(() => {
      mapSnapshot =
        lifecycle.getSnapshot();
    });

    await lifecycle.refreshIfNeeded();

    await lifecycle.runMutation(
      async () => {
        durableTruth.stops.push({
          id: 'stop-1',
          tripId: 'trip-1',
          dayId: 'day-1',
          title: 'Mapped museum',
          type: 'place',
          order: 1,
          location: {
            name: 'Mapped museum',
            latitude: 37.98,
            longitude: 23.72,
          },
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        });
      },
    );

    assert.equal(
      planSnapshot.workspace.stops[0]
        .title,
      'Mapped museum',
    );
    assert.equal(
      mapSnapshot.workspace.stops[0]
        .title,
      'Mapped museum',
    );
    assert.strictEqual(
      planSnapshot,
      mapSnapshot,
    );
  },
);

test(
  'accommodation mutations refresh every Trip Space consumer from durable truth',
  async () => {
    const durableTruth = makeWorkspace();
    const lifecycle = new TripWorkspaceLifecycle(
      'trip-1',
      async () => clone(durableTruth),
    );

    await lifecycle.refreshIfNeeded();

    await lifecycle.runMutation(async () => {
      durableTruth.accommodations.push({
        id: 'stay-1',
        tripId: 'trip-1',
        name: 'Known stay',
        type: 'hotel',
        checkInAt: '2026-09-01T15:00:00',
        checkOutAt: '2026-09-02T11:00:00',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      });
    });

    assert.equal(
      lifecycle.getSnapshot().workspace.accommodations[0].name,
      'Known stay',
    );

    await lifecycle.runMutation(async () => {
      durableTruth.accommodations[0].name = 'Updated stay';
    });

    assert.equal(
      lifecycle.getSnapshot().workspace.accommodations[0].name,
      'Updated stay',
    );

    await lifecycle.runMutation(async () => {
      durableTruth.accommodations = [];
    });

    assert.deepEqual(
      lifecycle.getSnapshot().workspace.accommodations,
      [],
    );
  },
);

test(
  'traveler membership mutations refresh More and Travelers from durable truth',
  async () => {
    const durableTruth = makeWorkspace();
    const lifecycle = new TripWorkspaceLifecycle(
      'trip-1',
      async () => clone(durableTruth),
    );

    await lifecycle.refreshIfNeeded();

    await lifecycle.runMutation(async () => {
      const traveler = {
        id: 'traveler-1',
        firstName: 'Alex',
        type: 'adult',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      };

      durableTruth.travelers.push(traveler);
      durableTruth.trip.travelerIds.push(
        traveler.id,
      );
    });

    let snapshot = lifecycle.getSnapshot();
    assert.equal(
      snapshot.workspace.travelers[0].firstName,
      'Alex',
    );
    assert.deepEqual(
      snapshot.workspace.trip.travelerIds,
      ['traveler-1'],
    );

    await lifecycle.runMutation(async () => {
      durableTruth.travelers[0].firstName =
        'Alexandra';
    });

    assert.equal(
      lifecycle.getSnapshot().workspace.travelers[0]
        .firstName,
      'Alexandra',
    );

    await lifecycle.runMutation(async () => {
      durableTruth.travelers = [];
      durableTruth.trip.travelerIds = [];
    });

    snapshot = lifecycle.getSnapshot();
    assert.deepEqual(snapshot.workspace.travelers, []);
    assert.deepEqual(
      snapshot.workspace.trip.travelerIds,
      [],
    );
  },
);

test(
  'memory mutations refresh Memories, Travel Book and More from durable truth',
  async () => {
    const durableTruth = makeWorkspace();
    const lifecycle = new TripWorkspaceLifecycle(
      'trip-1',
      async () => clone(durableTruth),
    );

    await lifecycle.refreshIfNeeded();

    await lifecycle.runMutation(async () => {
      durableTruth.memories.push({
        id: 'memory-1',
        tripId: 'trip-1',
        type: 'note',
        title: 'First espresso',
        capturedAt: TIMESTAMP,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      });
    });

    assert.equal(
      lifecycle.getSnapshot().workspace.memories[0]
        .title,
      'First espresso',
    );

    await lifecycle.runMutation(async () => {
      durableTruth.memories[0].caption =
        'At the corner cafe';
    });

    assert.equal(
      lifecycle.getSnapshot().workspace.memories[0]
        .caption,
      'At the corner cafe',
    );

    await lifecycle.runMutation(async () => {
      durableTruth.memories = [];
    });

    assert.deepEqual(
      lifecycle.getSnapshot().workspace.memories,
      [],
    );
  },
);

test(
  'Travel Book mutations refresh More and Travel Book from durable truth',
  async () => {
    const durableTruth = makeWorkspace();
    durableTruth.memories.push({
      id: 'memory-1',
      tripId: 'trip-1',
      type: 'photo',
      mediaUri: 'file://cover.jpg',
      capturedAt: TIMESTAMP,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });

    const lifecycle = new TripWorkspaceLifecycle(
      'trip-1',
      async () => clone(durableTruth),
    );

    await lifecycle.refreshIfNeeded();

    await lifecycle.runMutation(async () => {
      durableTruth.travelBook = {
        id: 'book-1',
        tripId: 'trip-1',
        title: 'Lisbon notes',
        memoryIds: ['memory-1'],
        coverImageUri: 'file://cover.jpg',
        isPublished: false,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      };
    });

    assert.equal(
      lifecycle.getSnapshot().workspace.travelBook
        .title,
      'Lisbon notes',
    );

    await lifecycle.runMutation(async () => {
      durableTruth.travelBook = null;
    });

    assert.equal(
      lifecycle.getSnapshot().workspace.travelBook,
      null,
    );
  },
);

test(
  'booking-stop link mutations refresh Plan, Today, Map and Bookings from one snapshot',
  async () => {
    const durableTruth = makeWorkspace();
    durableTruth.stops.push({
      id: 'stop-1',
      tripId: 'trip-1',
      dayId: 'day-1',
      title: 'Museum',
      type: 'activity',
      order: 1,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });
    durableTruth.bookings.push({
      id: 'booking-1',
      tripId: 'trip-1',
      type: 'activity',
      status: 'confirmed',
      title: 'Museum ticket',
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });

    const lifecycle =
      new TripWorkspaceLifecycle(
        'trip-1',
        async () =>
          clone(durableTruth),
      );

    await lifecycle.refreshIfNeeded();

    await lifecycle.runMutation(
      async () => {
        durableTruth.bookings[0]
          .stopId = 'stop-1';
      },
    );

    const linkedSnapshot =
      lifecycle.getSnapshot();

    assert.equal(
      linkedSnapshot.workspace
        .bookings[0].stopId,
      'stop-1',
    );
    assert.equal(
      linkedSnapshot.workspace
        .stops[0].id,
      'stop-1',
    );

    await lifecycle.runMutation(
      async () => {
        durableTruth.bookings[0]
          .stopId = undefined;
      },
    );

    assert.equal(
      lifecycle.getSnapshot()
        .workspace.bookings[0]
        .stopId,
      undefined,
    );
  },
);

test(
  'a Trip Details update refreshes every workspace consumer',
  async () => {
    const durableTruth = makeWorkspace();
    const lifecycle =
      new TripWorkspaceLifecycle(
        'trip-1',
        async () => clone(durableTruth),
      );

    await lifecycle.refreshIfNeeded();

    await lifecycle.runMutation(async () => {
      durableTruth.trip.title =
        'Updated canonical trip';
      durableTruth.trip.startDate =
        '2026-09-02';
      durableTruth.trip.endDate =
        '2026-09-03';
    });

    const snapshot =
      lifecycle.getSnapshot();

    assert.equal(snapshot.status, 'ready');
    assert.equal(
      snapshot.workspace.trip.title,
      'Updated canonical trip',
    );
    assert.equal(
      snapshot.workspace.trip.startDate,
      '2026-09-02',
    );
  },
);

test(
  'a deleted Trip becomes not found instead of retaining a ready workspace',
  async () => {
    let durableTruth = makeWorkspace();
    const lifecycle =
      new TripWorkspaceLifecycle(
        'trip-1',
        async () =>
          durableTruth
            ? clone(durableTruth)
            : null,
      );

    await lifecycle.refreshIfNeeded();

    await lifecycle.runMutation(async () => {
      durableTruth = null;
    });

    assert.deepEqual(
      lifecycle.getSnapshot(),
      {
        status: 'not-found',
        workspace: null,
        error: null,
      },
    );
  },
);

test(
  'workspace load errors are recoverable without losing the last snapshot',
  async () => {
    const durableTruth = makeWorkspace();
    let shouldFail = false;

    const lifecycle =
      new TripWorkspaceLifecycle(
        'trip-1',
        async () => {
          if (shouldFail) {
            throw new Error(
              'temporary read failure',
            );
          }

          return clone(durableTruth);
        },
      );

    await lifecycle.refreshIfNeeded();

    const originalWorkspace =
      lifecycle.getSnapshot().workspace;

    shouldFail = true;
    lifecycle.invalidate();
    await lifecycle.refreshIfNeeded();

    const failed =
      lifecycle.getSnapshot();

    assert.equal(failed.status, 'error');
    assert.strictEqual(
      failed.workspace,
      originalWorkspace,
    );

    shouldFail = false;
    await lifecycle.retry();

    const recovered =
      lifecycle.getSnapshot();

    assert.equal(
      recovered.status,
      'ready',
    );
    assert.equal(
      recovered.workspace.trip.id,
      'trip-1',
    );
    assert.equal(recovered.error, null);
  },
);

test(
  'an invalidation during an active load cannot publish stale data as current',
  async () => {
    const durableTruth = makeWorkspace();
    let loadCount = 0;
    let releaseFirstLoad;

    const firstLoadGate =
      new Promise((resolve) => {
        releaseFirstLoad = resolve;
      });

    const lifecycle =
      new TripWorkspaceLifecycle(
        'trip-1',
        async () => {
          loadCount += 1;

          const captured =
            clone(durableTruth);

          if (loadCount === 1) {
            await firstLoadGate;
          }

          return captured;
        },
      );

    const initialLoad =
      lifecycle.refreshIfNeeded();

    await Promise.resolve();

    const mutation = lifecycle.runMutation(
      async () => {
        durableTruth.stops.push({
          id: 'stop-during-load',
          tripId: 'trip-1',
          dayId: 'day-1',
          title: 'Current stop',
          type: 'place',
          order: 1,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        });
      },
    );

    releaseFirstLoad();

    await Promise.all([
      initialLoad,
      mutation,
    ]);

    assert.equal(loadCount, 2);
    assert.equal(
      lifecycle.getSnapshot().status,
      'ready',
    );
    assert.equal(
      lifecycle.getSnapshot().workspace
        .stops[0].id,
      'stop-during-load',
    );
  },
);
