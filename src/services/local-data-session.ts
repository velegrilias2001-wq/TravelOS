/** Session generation only. Never contains or persists travel records. */
let generation = 0;
const listeners = new Set<() => void>();
export const getLocalDataGeneration = () => generation;
export function subscribeLocalDataGeneration(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function advanceLocalDataGeneration(): void {
  generation += 1;
  for (const listener of listeners) listener();
}

/** Covers picker, confirmation and commit, including repeated same-frame taps. */
export function createOperationGate() {
  let busy = false;
  return {
    acquire(): (() => void) | null {
      if (busy) return null;
      busy = true;
      let released = false;
      return () => {
        if (!released) { released = true; busy = false; }
      };
    },
  };
}
export const localDataFileGate = createOperationGate();
