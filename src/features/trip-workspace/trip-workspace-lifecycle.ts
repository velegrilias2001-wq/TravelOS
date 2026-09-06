import type {
  TripId,
} from '@/domain/entities';
import type {
  TripWorkspace,
} from '@/services/trip-service';

export type TripWorkspaceStatus =
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'not-found'
  | 'error';

export interface TripWorkspaceSnapshot {
  status: TripWorkspaceStatus;
  workspace: TripWorkspace | null;
  error: unknown | null;
}

export type TripWorkspaceLoader = (
  tripId: TripId,
) => Promise<TripWorkspace | null>;

type Listener = () => void;

export class TripWorkspaceLifecycle {
  private snapshot: TripWorkspaceSnapshot;

  private readonly listeners =
    new Set<Listener>();

  private invalidationRevision = 0;
  private loadedRevision = -1;

  private inFlight: Promise<void> | null =
    null;

  private disposed = false;

  constructor(
    private readonly tripId: TripId | null,
    private readonly loadWorkspace:
      TripWorkspaceLoader,
  ) {
    this.snapshot = tripId
      ? {
          status: 'loading',
          workspace: null,
          error: null,
        }
      : {
          status: 'not-found',
          workspace: null,
          error: null,
        };

    if (!tripId) {
      this.loadedRevision = 0;
    }
  }

  readonly getSnapshot =
    (): TripWorkspaceSnapshot =>
      this.snapshot;

  readonly subscribe = (
    listener: Listener,
  ): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  invalidate(): void {
    this.invalidationRevision += 1;
  }

  async runMutation<T>(
    mutation: () => Promise<T>,
  ): Promise<T> {
    const result = await mutation();

    this.invalidate();

    await this.refreshIfNeeded();

    // Never block trip mutations on notification reconcile.
    // Metro dynamic import can throw outside a Promise rejection.
    setTimeout(() => {
      void import('@/services/trip-notifications-runtime')
        .then((module) =>
          module.reconcileTripNotifications(),
        )
        .catch(() => {
          // Native module may be unavailable in Node tests / Expo Go.
        });
    }, 0);

    return result;
  }

  readonly refreshIfNeeded =
    async (): Promise<void> => {
      await this.refresh(false);
    };

  readonly retry = async (): Promise<void> => {
    await this.refresh(true);
  };

  private needsRefresh(): boolean {
    return (
      this.loadedRevision <
        this.invalidationRevision ||
      this.snapshot.status === 'loading' ||
      this.snapshot.status === 'error'
    );
  }

  private setSnapshot(
    snapshot: TripWorkspaceSnapshot,
  ): void {
    this.snapshot = snapshot;

    if (this.disposed) {
      return;
    }

    for (const listener of this.listeners) {
      listener();
    }
  }

  private async refresh(
    force: boolean,
  ): Promise<void> {
    const tripId = this.tripId;

    if (!tripId || this.disposed) {
      return;
    }

    if (this.inFlight) {
      await this.inFlight;

      if (
        this.loadedRevision <
          this.invalidationRevision ||
        (
          force &&
          this.snapshot.status ===
            'error'
        )
      ) {
        await this.refresh(force);
      }

      return;
    }

    if (!force && !this.needsRefresh()) {
      return;
    }

    const startedRevision =
      this.invalidationRevision;

    const previousWorkspace =
      this.snapshot.workspace;

    this.setSnapshot({
      status: previousWorkspace
        ? 'refreshing'
        : 'loading',
      workspace: previousWorkspace,
      error: null,
    });

    let succeeded = false;

    const run = (async () => {
      try {
        const workspace =
          await this.loadWorkspace(
            tripId,
          );

        this.loadedRevision =
          startedRevision;

        this.setSnapshot(
          workspace
            ? {
                status: 'ready',
                workspace,
                error: null,
              }
            : {
                status: 'not-found',
                workspace: null,
                error: null,
              },
        );

        succeeded = true;
      } catch (error) {
        this.setSnapshot({
          status: 'error',
          workspace: previousWorkspace,
          error,
        });
      }
    })();

    this.inFlight = run;

    try {
      await run;
    } finally {
      this.inFlight = null;
    }

    if (
      succeeded &&
      this.loadedRevision <
        this.invalidationRevision
    ) {
      await this.refresh(false);
    }
  }
}
