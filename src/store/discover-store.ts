import { create } from 'zustand';

import type {
    DiscoverBrief,
} from '@/domain/entities';

import {
    normalizeDiscoverBrief,
} from '@/services/discover-brief';

interface DiscoverStoreState {
  /**
   * Temporary session state only.
   *
   * A Discover Brief is not a saved Trip and must not
   * be persisted into the canonical SQLite trip data.
   */
  brief: DiscoverBrief | null;

  setBrief(
    brief: DiscoverBrief,
  ): void;

  clearBrief(): void;
}

export const useDiscoverStore =
  create<DiscoverStoreState>((set) => ({
    brief: null,

    setBrief: (brief) => {
      set({
        brief:
          normalizeDiscoverBrief(
            brief,
          ),
      });
    },

    clearBrief: () => {
      set({
        brief: null,
      });
    },
  }));