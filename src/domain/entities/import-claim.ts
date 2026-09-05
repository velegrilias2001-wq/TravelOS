import type { BookingId } from './booking';
import type { TripId } from './trip';

/**
 * An imported booking/itinerary claim.
 *
 * This is not a Booking, not a Trip, and not World
 * history. It remains a reviewed claim until the
 * traveler explicitly accepts it onto an existing trip
 * or uses a trip_seed handoff into /new-trip.
 */
export type ImportBatchId = string;
export type ImportClaimId = string;

export type ImportSourceKind =
  | 'ics'
  | 'document'
  | 'text';

export type ImportClaimKind =
  | 'booking'
  | 'trip_seed'
  | 'itinerary_line';

export type ImportClaimStatus =
  | 'pending'
  | 'accepted'
  | 'dismissed';

export type ImportClaimConfidence =
  | 'high'
  | 'medium'
  | 'low';

export interface ImportClaimEvidence {
  fieldsPresent: string[];
  icsUid?: string;
  tzid?: string;
  calendarDate?: string;
  skippedDuration?: boolean;
  dayHint?: boolean;
  timeHint?: boolean;
}

export interface ImportBatch {
  id: ImportBatchId;
  sourceKind: ImportSourceKind;
  sourceLabel: string;
  contentHash: string;
  skippedCount: number;
  createdAt: string;
}

export interface ImportClaim {
  id: ImportClaimId;
  batchId: ImportBatchId;
  kind: ImportClaimKind;
  status: ImportClaimStatus;
  title: string;
  startAt?: string;
  endAt?: string;
  locationText?: string;
  icsUid?: string;
  confidence: ImportClaimConfidence;
  evidence: ImportClaimEvidence;
  acceptedTripId?: TripId;
  acceptedBookingId?: BookingId;
  createdAt: string;
  updatedAt: string;
}
