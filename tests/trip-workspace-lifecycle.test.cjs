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
    runtimeState: null,
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
