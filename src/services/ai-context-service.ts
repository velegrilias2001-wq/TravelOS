import type {
  TravelDNA,
  TripId,
} from '@/domain/entities';

import {
  buildAIContextSnapshot,
  type AIContextSnapshot,
} from './ai-context';
import {
  systemRuntimeClock,
  type RuntimeClock,
} from './time-truth';
import type {
  TripWorkspace,
} from './trip-service';

export interface AIContextTripWorkspaceReader {
  getWorkspace(
    id: TripId,
  ): Promise<TripWorkspace | null>;
}

export interface AIContextTravelDNAReader {
  get(): Promise<TravelDNA | null>;
}

/**
 * Provider-agnostic application service for deterministic AI context.
 *
 * Dependencies are injected deliberately so this layer stays:
 * - independent from Expo/native runtime modules,
 * - unit-testable in Node,
 * - independent from any future AI provider,
 * - read-only.
 */
export class AIContextService {
  constructor(
    private readonly trips:
      AIContextTripWorkspaceReader,
    private readonly travelDNA:
      AIContextTravelDNAReader,
    private readonly clock:
      RuntimeClock = systemRuntimeClock,
  ) {}

  async getSnapshot(
    tripId: TripId,
  ): Promise<AIContextSnapshot | null> {
    const workspace =
      await this.trips.getWorkspace(tripId);

    if (!workspace) {
      return null;
    }

    const travelDNA =
      await this.travelDNA.get();

    return buildAIContextSnapshot(
      workspace,
      travelDNA,
      this.clock,
    );
  }
}
