/** Requests during a run require a fresh pass, not merely its stale result. */
export function createCoalescedTask(task: () => Promise<void>): () => Promise<void> {
  let revision = 0;
  let inFlight: Promise<void> | null = null;
  return () => {
    revision += 1;
    if (!inFlight) {
      inFlight = Promise.resolve().then(async () => {
        let completed: number;
        do {
          completed = revision;
          await task();
        } while (completed !== revision);
      }).finally(() => { inFlight = null; });
    }
    return inFlight;
  };
}
