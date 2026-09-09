/** A superseded read may finish, but may not republish pre-restore records. */
export function createLatestListLoader<T>(
  read: () => Promise<T[]>,
  publish: (state: { trips?: T[]; isLoading: boolean }) => void,
  afterLoad: () => void,
) {
  let revision = 0;
  return {
    clear() {
      revision += 1;
      publish({ trips: [], isLoading: false });
    },
    async load() {
      const current = ++revision;
      publish({ isLoading: true });
      try {
        const trips = await read();
        if (revision !== current) return;
        publish({ trips, isLoading: false });
        afterLoad();
      } catch (error) {
        if (revision === current) publish({ isLoading: false });
        throw error;
      }
    },
  };
}
