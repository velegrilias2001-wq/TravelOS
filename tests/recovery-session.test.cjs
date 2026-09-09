const assert = require('node:assert/strict');
const test = require('node:test');
const { createLatestListLoader } = require('../.test-build/src/services/latest-list-loader.js');
const { createOperationGate, advanceLocalDataGeneration, getLocalDataGeneration, subscribeLocalDataGeneration } = require('../.test-build/src/services/local-data-session.js');
const { createCoalescedTask } = require('../.test-build/src/services/coalesced-task.js');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };

test('restore clears a list and a late pre-restore read cannot resurrect it', async () => {
  const first = deferred(); let reads = 0; let state = {}; let notifications = 0;
  const loader = createLatestListLoader(() => ++reads === 1 ? first.promise : Promise.resolve(['restored']), update => { state = { ...state, ...update }; }, () => { notifications++; });
  const old = loader.load(); loader.clear(); await loader.load();
  first.resolve(['old']); await old;
  assert.deepEqual(state, { trips: ['restored'], isLoading: false });
  assert.equal(notifications, 1);
});

test('failed list refresh retains cleared data and can retry', async () => {
  let fail = true; let state = { trips: ['old'] };
  const loader = createLatestListLoader(async () => { if(fail) throw Error('read'); return ['restored']; }, update => { state = { ...state, ...update }; }, () => {});
  loader.clear(); await assert.rejects(loader.load(), /read/);
  assert.deepEqual(state, { trips: [], isLoading: false });
  fail = false; await loader.load(); assert.deepEqual(state.trips, ['restored']);
});

test('picker/confirmation gate excludes repeated operations and release is owner-safe', () => {
  const gate = createOperationGate(); const release = gate.acquire();
  assert.equal(gate.acquire(), null); release();
  const next = gate.acquire(); release();
  assert.equal(gate.acquire(), null); next(); assert.equal(typeof gate.acquire(), 'function');
});

test('restore generation notifies mounted consumers and subscriptions clean up', () => {
  const before = getLocalDataGeneration(); let calls = 0;
  const unsubscribe = subscribeLocalDataGeneration(() => { calls++; });
  advanceLocalDataGeneration(); unsubscribe(); advanceLocalDataGeneration();
  assert.equal(calls, 1); assert.equal(getLocalDataGeneration(), before + 2);
});

test('reconcile requested while old work runs waits for a fresh pass', async () => {
  const first = deferred(); let runs = 0;
  const run = createCoalescedTask(async () => { if (++runs === 1) await first.promise; });
  const a = run(); await Promise.resolve(); const b = run(); const c = run();
  first.resolve(); await Promise.all([a,b,c]); assert.equal(runs, 2);
});

test('failed reconcile propagates failure and the next request retries', async () => {
  let attempts = 0; const run = createCoalescedTask(async () => { if (++attempts === 1) throw Error('native'); });
  await assert.rejects(run(), /native/); await run(); assert.equal(attempts, 2);
});
