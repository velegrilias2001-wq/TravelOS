import * as Crypto from 'expo-crypto';

import {
  memoryRepository,
} from '@/data/repositories/sqlite-memory-repository';
import type {
  Memory,
  MemoryId,
  MemoryType,
} from '@/domain/entities/memory';
import type {
  TripDayId,
} from '@/domain/entities/trip-day';
import type {
  TripStopId,
} from '@/domain/entities/trip-stop';
import type {
  TripId,
} from '@/domain/entities/trip';

export type EditableMemoryType =
  Extract<
    MemoryType,
    'photo' | 'note'
  >;

export interface CreateMemoryInput {
  tripId: TripId;
  dayId?: TripDayId;
  stopId?: TripStopId;
  type: EditableMemoryType;
  title?: string;
  caption?: string;
  mediaUri?: string;
}

export interface UpdateMemoryInput {
  dayId?: TripDayId;
  stopId?: TripStopId;
  type: EditableMemoryType;
  title?: string;
  caption?: string;
  mediaUri?: string;
}

type Clock = () => string;
type CreateId = () => string;

function cleanOptionalText(
  value?: string,
): string | undefined {
  const clean = value?.trim();
  return clean ? clean : undefined;
}

function validateEditableMemory(
  input: {
    type: EditableMemoryType;
    title?: string;
    caption?: string;
    mediaUri?: string;
  },
): void {
  const title =
    cleanOptionalText(input.title);
  const caption =
    cleanOptionalText(input.caption);
  const mediaUri =
    cleanOptionalText(input.mediaUri);

  if (
    input.type === 'photo' &&
    !mediaUri
  ) {
    throw new Error(
      'Choose a photo before saving this memory.',
    );
  }

  if (
    input.type === 'note' &&
    !title &&
    !caption
  ) {
    throw new Error(
      'Add a title or a note before saving this memory.',
    );
  }
}

export class MemoryService {
  constructor(
    private readonly createId:
      CreateId =
        () => Crypto.randomUUID(),
    private readonly now:
      Clock =
        () => new Date().toISOString(),
  ) {}

  async listTripMemories(
    tripId: TripId,
  ): Promise<Memory[]> {
    return memoryRepository.getByTripId(
      tripId,
    );
  }

  async createMemory(
    input: CreateMemoryInput,
  ): Promise<Memory> {
    validateEditableMemory(input);

    const timestamp = this.now();

    const memory: Memory = {
      id: this.createId(),
      tripId: input.tripId,
      dayId: input.dayId,
      stopId: input.stopId,
      type: input.type,
      title:
        cleanOptionalText(input.title),
      caption:
        cleanOptionalText(input.caption),
      mediaUri:
        input.type === 'photo'
          ? cleanOptionalText(
              input.mediaUri,
            )
          : undefined,
      capturedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await memoryRepository.save(memory);

    return memory;
  }

  async updateMemory(
    tripId: TripId,
    id: MemoryId,
    input: UpdateMemoryInput,
  ): Promise<Memory> {
    validateEditableMemory(input);

    const existing =
      await memoryRepository.getById(
        id,
      );

    if (
      !existing ||
      existing.tripId !== tripId
    ) {
      throw new Error(
        'This memory no longer exists.',
      );
    }

    const updated: Memory = {
      ...existing,
      dayId: input.dayId,
      stopId: input.stopId,
      type: input.type,
      title:
        cleanOptionalText(input.title),
      caption:
        cleanOptionalText(input.caption),
      mediaUri:
        input.type === 'photo'
          ? cleanOptionalText(
              input.mediaUri,
            )
          : undefined,
      updatedAt: this.now(),
    };

    await memoryRepository.save(updated);

    return updated;
  }

  async deleteMemory(
    tripId: TripId,
    id: MemoryId,
  ): Promise<Memory | null> {
    const existing =
      await memoryRepository.getById(
        id,
      );

    if (!existing) {
      return null;
    }

    if (existing.tripId !== tripId) {
      throw new Error(
        'This memory belongs to another trip.',
      );
    }

    await memoryRepository.delete(id);

    return existing;
  }
}

export const memoryService =
  new MemoryService();
