/** Serializes preference reads/writes; a stale read cannot undo a newer choice. */
export function createAiPreferencesLifecycle<T extends { enabled: boolean }>(storage: {
  load: () => Promise<T>;
  save: (input: { enabled: boolean }) => Promise<T>;
  publishEnabled: (enabled: boolean) => void;
}) {
  let queue = Promise.resolve();
  let revision = 0;

  function run(operation: () => Promise<T>): Promise<T> {
    const requestedRevision = ++revision;
    // Block immediately, including while a disable write waits behind a read.
    // Failure keeps network AI off; a subsequent successful retry may enable it.
    storage.publishEnabled(false);
    const result = queue.then(operation);
    queue = result.then(() => undefined, () => undefined);
    return result.then((preferences) => {
      if (requestedRevision === revision) {
        storage.publishEnabled(preferences.enabled);
      }
      return preferences;
    });
  }

  return {
    refresh: () => run(storage.load),
    persist: (input: { enabled: boolean }) => run(() => storage.save(input)),
  };
}
