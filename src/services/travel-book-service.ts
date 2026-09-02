import * as Crypto from 'expo-crypto';

import { travelBookRepository } from '@/data/repositories/sqlite-travel-book-repository';
import type { Memory } from '@/domain/entities/memory';
import type {
  TravelBook,
  TravelBookId,
} from '@/domain/entities/travel-book';
import type { TripId } from '@/domain/entities/trip';

export interface SaveTravelBookInput {
  existing: TravelBook | null;
  tripId: TripId;
  title: string;
  summary?: string;
  memoryIds: string[];
  coverImageUri?: string;
  isPublished: boolean;
  memories: Memory[];
}

function chronologicalMemories(
  memories: Memory[],
): Memory[] {
  return [...memories].sort((left, right) => {
    const byCapturedAt =
      left.capturedAt.localeCompare(right.capturedAt);

    if (byCapturedAt !== 0) {
      return byCapturedAt;
    }

    const byCreatedAt =
      left.createdAt.localeCompare(right.createdAt);

    if (byCreatedAt !== 0) {
      return byCreatedAt;
    }

    return left.id.localeCompare(right.id);
  });
}

function normalizeMemoryIds(
  tripId: TripId,
  memories: Memory[],
  requestedIds: string[],
): string[] {
  const requested = new Set(requestedIds);

  return chronologicalMemories(memories)
    .filter(
      (memory) =>
        memory.tripId === tripId &&
        requested.has(memory.id),
    )
    .map((memory) => memory.id);
}

function normalizeCoverImageUri(
  selectedIds: string[],
  memories: Memory[],
  requestedCoverImageUri?: string,
): string | undefined {
  const selected = new Set(selectedIds);

  const photoMemories = chronologicalMemories(memories)
    .filter(
      (memory) =>
        selected.has(memory.id) &&
        memory.type === 'photo' &&
        Boolean(memory.mediaUri),
    );

  if (
    requestedCoverImageUri &&
    photoMemories.some(
      (memory) =>
        memory.mediaUri === requestedCoverImageUri,
    )
  ) {
    return requestedCoverImageUri;
  }

  return photoMemories[0]?.mediaUri;
}

export async function getTravelBook(
  tripId: TripId,
): Promise<TravelBook | null> {
  return travelBookRepository.getByTripId(tripId);
}

export async function saveTravelBook(
  input: SaveTravelBookInput,
): Promise<TravelBook> {
  const title = input.title.trim();

  if (!title) {
    throw new Error('Travel Book title is required.');
  }

  const eligibleMemories = input.memories.filter(
    (memory) => memory.tripId === input.tripId,
  );

  const memoryIds = normalizeMemoryIds(
    input.tripId,
    eligibleMemories,
    input.memoryIds,
  );

  const coverImageUri = normalizeCoverImageUri(
    memoryIds,
    eligibleMemories,
    input.coverImageUri,
  );

  const now = new Date().toISOString();

  const travelBook: TravelBook = {
    id:
      input.existing?.id ??
      (Crypto.randomUUID() as TravelBookId),
    tripId: input.tripId,
    title,
    coverImageUri,
    memoryIds,
    summary: input.summary?.trim() || undefined,
    isPublished: input.isPublished,
    createdAt: input.existing?.createdAt ?? now,
    updatedAt: now,
  };

  await travelBookRepository.save(travelBook);

  return travelBook;
}

export async function deleteTravelBook(
  tripId: TripId,
  travelBookId: TravelBookId,
): Promise<void> {
  const existing =
    await travelBookRepository.getByTripId(
      tripId,
    );

  if (
    !existing ||
    existing.id !== travelBookId
  ) {
    throw new Error(
      'Travel Book was not found.',
    );
  }

  await travelBookRepository.delete(travelBookId);
}
