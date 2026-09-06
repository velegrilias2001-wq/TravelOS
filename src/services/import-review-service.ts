import type { Booking } from '@/domain/entities/booking';
import type {
  ImportBatch,
  ImportClaim,
  ImportClaimId,
} from '@/domain/entities/import-claim';
import type { Trip, TripId } from '@/domain/entities/trip';
import type { ImportRepository } from '@/domain/repositories/import-repository';
import type { BookingRepository } from '@/domain/repositories/booking-repository';
import type { TripRepository } from '@/domain/repositories/trip-repository';

import {
  parseBookingTemporalValue,
  validateNewBookingTimes,
  type BookingTemporalValue,
} from './booking-time';
import { extractImportCalendarText } from './import-calendar-extract';
import { parseImportCalendar } from './import-ics';
import { extractImportOcrClaims } from './import-ocr-extract';
import { extractImportSeedClaims } from './import-seed-extract';

export interface ImportReviewRepositories {
  imports: ImportRepository;
  trips: Pick<TripRepository, 'getAll' | 'getById'>;
  bookings: Pick<BookingRepository, 'getByTripId'>;
}

export type ImportClaimConflictKind =
  | 'needs-trip'
  | 'missing-time'
  | 'overlap'
  | 'duplicate-uid'
  | 'incomparable-time';

export interface ImportClaimConflict {
  kind: ImportClaimConflictKind;
  detail: string;
  bookingId?: string;
}

export interface ImportClaimListing {
  claim: ImportClaim;
  conflicts: ImportClaimConflict[];
}

export class ImportReviewService {
  constructor(
    private readonly repos: ImportReviewRepositories,
    private readonly createId: () => string,
    private readonly now: () => string = () =>
      new Date().toISOString(),
  ) {}

  async ingestIcs(input: {
    text: string;
    sourceLabel?: string;
  }): Promise<ImportBatch> {
    const extracted = extractImportCalendarText(input.text);
    const parsed = parseImportCalendar(extracted.text);
    const existing =
      await this.repos.imports.getBatchByContentHash(
        parsed.contentHash,
      );

    if (existing) {
      return existing;
    }

    const createdAt = this.now();
    const batch: ImportBatch = {
      id: this.createId(),
      sourceKind: 'ics',
      sourceLabel:
        input.sourceLabel?.trim() ||
        (extracted.wrapper === 'email'
          ? 'Pasted email'
          : 'Pasted calendar'),
      contentHash: parsed.contentHash,
      skippedCount: parsed.skippedCount,
      createdAt,
    };

    const claims = parsed.events.map((event) => {
      const id = this.createId();

      return {
        id,
        batchId: batch.id,
        kind: 'booking' as const,
        status: 'pending' as const,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        locationText: event.locationText,
        icsUid: event.icsUid,
        confidence: event.confidence,
        evidence: event.evidence,
        createdAt,
        updatedAt: createdAt,
      };
    });

    await this.repos.imports.saveBatch(batch, claims);

    return batch;
  }

  async ingestSeedText(input: {
    text: string;
    sourceLabel?: string;
    sourceKind?: 'document' | 'text';
  }): Promise<ImportBatch> {
    const extracted = extractImportSeedClaims(input.text);
    const existing =
      await this.repos.imports.getBatchByContentHash(
        extracted.contentHash,
      );

    if (existing) {
      return existing;
    }

    const createdAt = this.now();
    const batch: ImportBatch = {
      id: this.createId(),
      sourceKind: input.sourceKind ?? 'text',
      sourceLabel:
        input.sourceLabel?.trim() || 'Pasted trip notes',
      contentHash: extracted.contentHash,
      skippedCount: extracted.skippedCount,
      createdAt,
    };

    const claims = extracted.claims.map((claim) => {
      const id = this.createId();

      return {
        id,
        batchId: batch.id,
        kind: claim.kind,
        status: 'pending' as const,
        title: claim.title,
        startAt: claim.startAt,
        endAt: claim.endAt,
        locationText: claim.locationText,
        confidence: claim.confidence,
        evidence: claim.evidence,
        createdAt,
        updatedAt: createdAt,
      };
    });

    await this.repos.imports.saveBatch(batch, claims);

    return batch;
  }

  /**
   * OCR confirmation-photo text → review claims only.
   * Never writes a Booking or Trip.
   */
  async ingestOcrText(input: {
    text: string;
    sourceLabel?: string;
  }): Promise<ImportBatch> {
    const extracted = extractImportOcrClaims(input.text);
    const existing =
      await this.repos.imports.getBatchByContentHash(
        extracted.contentHash,
      );

    if (existing) {
      return existing;
    }

    const createdAt = this.now();
    const batch: ImportBatch = {
      id: this.createId(),
      sourceKind: 'document',
      sourceLabel:
        input.sourceLabel?.trim() || 'Confirmation photo',
      contentHash: extracted.contentHash,
      skippedCount: extracted.skippedCount,
      createdAt,
    };

    const claims = extracted.claims.map((claim) => {
      const id = this.createId();

      return {
        id,
        batchId: batch.id,
        kind: claim.kind,
        status: 'pending' as const,
        title: claim.title,
        startAt: claim.startAt,
        endAt: claim.endAt,
        locationText: claim.locationText,
        icsUid: claim.evidence.icsUid,
        confidence: claim.confidence,
        evidence: claim.evidence,
        createdAt,
        updatedAt: createdAt,
      };
    });

    await this.repos.imports.saveBatch(batch, claims);

    return batch;
  }

  async listBatches(): Promise<ImportBatch[]> {
    return this.repos.imports.listBatches();
  }

  async listClaimReviews(
    batchId: string,
    tripId?: TripId,
  ): Promise<{
    batch: ImportBatch;
    listings: ImportClaimListing[];
    trip: Trip | null;
  }> {
    const batch = await this.repos.imports.getBatch(batchId);

    if (!batch) {
      throw new Error('Import review was not found.');
    }

    const claims = await this.repos.imports.listClaims(batchId);
    const trip = tripId
      ? await this.repos.trips.getById(tripId)
      : null;

    if (tripId && !trip) {
      throw new Error('Trip was not found.');
    }

    const existingBookings = trip
      ? await this.repos.bookings.getByTripId(trip.id)
      : [];
    const acceptedClaims = claims.filter(
      (claim) =>
        claim.status === 'accepted' &&
        claim.acceptedTripId === trip?.id,
    );

    return {
      batch,
      trip,
      listings: claims.map((claim) => ({
        claim,
        conflicts: conflictsForClaim(
          claim,
          trip,
          existingBookings,
          acceptedClaims,
        ),
      })),
    };
  }

  async accept(
    claimId: ImportClaimId,
    tripId: TripId,
  ): Promise<ImportClaim> {
    const claim = await this.repos.imports.getClaim(claimId);

    if (!claim) {
      throw new Error('Imported claim was not found.');
    }

    if (claim.kind !== 'booking') {
      throw new Error(
        'Only calendar booking claims can become bookings. Use Start Create Trip for seed claims.',
      );
    }

    if (claim.status === 'dismissed') {
      throw new Error(
        'A dismissed claim cannot become a booking.',
      );
    }

    const trip = await this.repos.trips.getById(tripId);

    if (!trip) {
      throw new Error('Trip was not found.');
    }

    if (
      claim.status === 'accepted' &&
      claim.acceptedTripId === tripId &&
      claim.acceptedBookingId
    ) {
      return claim;
    }

    if (claim.status === 'accepted') {
      throw new Error(
        'This claim already became a booking on another trip.',
      );
    }

    const acceptedOnTrip =
      await this.acceptedClaimsForTrip(claim.batchId, tripId);
    const duplicate = acceptedOnTrip.find(
      (accepted) =>
        accepted.icsUid &&
        accepted.icsUid === claim.icsUid &&
        accepted.id !== claim.id,
    );

    if (duplicate) {
      throw new Error(
        'This calendar event was already accepted onto this trip.',
      );
    }

    const createdAt = this.now();
    const booking = buildImportedBooking({
      id: this.createId(),
      tripId,
      claim,
      createdAt,
    });

    validateNewBookingTimes(booking);

    const accepted: ImportClaim = {
      ...claim,
      status: 'accepted',
      acceptedTripId: tripId,
      acceptedBookingId: booking.id,
      updatedAt: createdAt,
    };

    await this.repos.imports.acceptClaim(accepted, booking);

    return accepted;
  }

  /**
   * Mark a seed/itinerary claim reviewed without writing
   * a Booking or Trip. Create Trip / Plan remain explicit.
   */
  async acknowledgeSeed(
    claimId: ImportClaimId,
    tripId?: TripId,
  ): Promise<ImportClaim> {
    const claim = await this.repos.imports.getClaim(claimId);

    if (!claim) {
      throw new Error('Imported claim was not found.');
    }

    if (claim.kind === 'booking') {
      throw new Error(
        'Calendar bookings must be accepted onto a trip.',
      );
    }

    if (claim.status === 'dismissed') {
      throw new Error(
        'A dismissed claim cannot be acknowledged.',
      );
    }

    if (claim.status === 'accepted') {
      return claim;
    }

    if (tripId) {
      const trip = await this.repos.trips.getById(tripId);
      if (!trip) {
        throw new Error('Trip was not found.');
      }
    }

    const acknowledged: ImportClaim = {
      ...claim,
      status: 'accepted',
      acceptedTripId: tripId,
      updatedAt: this.now(),
    };

    await this.repos.imports.saveClaim(acknowledged);

    return acknowledged;
  }

  async dismiss(claimId: ImportClaimId): Promise<ImportClaim> {
    const claim = await this.repos.imports.getClaim(claimId);

    if (!claim) {
      throw new Error('Imported claim was not found.');
    }

    if (claim.status === 'accepted') {
      throw new Error(
        'An accepted claim cannot be dismissed.',
      );
    }

    if (claim.status === 'dismissed') {
      return claim;
    }

    const dismissed: ImportClaim = {
      ...claim,
      status: 'dismissed',
      updatedAt: this.now(),
    };

    await this.repos.imports.saveClaim(dismissed);

    return dismissed;
  }

  private async acceptedClaimsForTrip(
    batchId: string,
    tripId: TripId,
  ): Promise<ImportClaim[]> {
    const claims = await this.repos.imports.listClaims(batchId);

    return claims.filter(
      (claim) =>
        claim.status === 'accepted' &&
        claim.acceptedTripId === tripId,
    );
  }
}

function buildImportedBooking(input: {
  id: string;
  tripId: TripId;
  claim: ImportClaim;
  createdAt: string;
}): Booking {
  const notes = [
    'Imported from calendar.',
    input.claim.locationText
      ? `Location: ${input.claim.locationText}`
      : null,
    input.claim.evidence.tzid
      ? `Calendar timezone: ${input.claim.evidence.tzid}`
      : null,
    input.claim.evidence.calendarDate && !input.claim.startAt
      ? `Calendar date ${input.claim.evidence.calendarDate} (time unknown).`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');

  return {
    id: input.id,
    tripId: input.tripId,
    type: 'other',
    status: 'planned',
    title: input.claim.title,
    startAt: input.claim.startAt,
    endAt: input.claim.endAt,
    notes,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

function conflictsForClaim(
  claim: ImportClaim,
  trip: Trip | null,
  existingBookings: Booking[],
  acceptedClaims: ImportClaim[],
): ImportClaimConflict[] {
  if (claim.status !== 'pending') {
    return [];
  }

  if (claim.kind === 'trip_seed') {
    return [];
  }

  if (claim.kind === 'itinerary_line') {
    if (!trip) {
      return [
        {
          kind: 'needs-trip',
          detail:
            'Optional: choose a trip to mark this line reviewed against it. It does not become a stop automatically.',
        },
      ];
    }

    return [];
  }

  const conflicts: ImportClaimConflict[] = [];

  if (!trip) {
    conflicts.push({
      kind: 'needs-trip',
      detail: 'Choose a trip before this can become a booking.',
    });
  }

  if (!claim.startAt) {
    conflicts.push({
      kind: 'missing-time',
      detail: claim.evidence.calendarDate
        ? `Calendar date ${claim.evidence.calendarDate} has no time.`
        : 'This event has no start time.',
    });
  }

  if (!trip) {
    return conflicts;
  }

  const duplicate = acceptedClaims.find(
    (accepted) =>
      accepted.icsUid &&
      accepted.icsUid === claim.icsUid &&
      accepted.id !== claim.id,
  );

  if (duplicate?.acceptedBookingId) {
    conflicts.push({
      kind: 'duplicate-uid',
      detail: 'This calendar event was already accepted onto this trip.',
      bookingId: duplicate.acceptedBookingId,
    });
  }

  if (!claim.startAt || !claim.endAt) {
    return conflicts;
  }

  for (const booking of existingBookings) {
    if (!booking.startAt || !booking.endAt) {
      continue;
    }

    const overlap = rangesOverlap(
      claim.startAt,
      claim.endAt,
      booking.startAt,
      booking.endAt,
    );

    if (overlap === null) {
      conflicts.push({
        kind: 'incomparable-time',
        detail: `Time semantics differ from “${booking.title}”.`,
        bookingId: booking.id,
      });
      continue;
    }

    if (overlap) {
      conflicts.push({
        kind: 'overlap',
        detail: `Overlaps “${booking.title}”.`,
        bookingId: booking.id,
      });
    }
  }

  return conflicts;
}

function rangesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
): boolean | null {
  const startToEnd = compareTemporal(
    parseBookingTemporalValue(leftStart),
    parseBookingTemporalValue(rightEnd),
  );
  const otherStartToEnd = compareTemporal(
    parseBookingTemporalValue(rightStart),
    parseBookingTemporalValue(leftEnd),
  );

  if (startToEnd === null || otherStartToEnd === null) {
    return null;
  }

  return startToEnd < 0 && otherStartToEnd < 0;
}

function compareTemporal(
  left: BookingTemporalValue,
  right: BookingTemporalValue,
): number | null {
  if (
    left.kind === 'local-wall-time' &&
    right.kind === 'local-wall-time'
  ) {
    return left.raw.localeCompare(right.raw);
  }

  if (
    left.kind === 'absolute-instant' &&
    right.kind === 'absolute-instant' &&
    left.instant &&
    right.instant
  ) {
    return left.instant.getTime() - right.instant.getTime();
  }

  return null;
}
