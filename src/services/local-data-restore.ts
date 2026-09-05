import {
  LOCAL_DATA_EXPORT_FORMAT,
  type LocalDataExportDocument,
  type LocalDataExportTripBundle,
} from './local-data-export';

export class LocalDataRestoreError extends Error {
  readonly code:
    | 'invalid_format'
    | 'invalid_document'
    | 'unsupported_format';

  constructor(
    code: LocalDataRestoreError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'LocalDataRestoreError';
    this.code = code;
  }
}

export type LocalDataRestoreSummary = {
  exportedAt: string;
  appVersion: string;
  tripCount: number;
  travelerCount: number;
  savedPlaceCount: number;
  hasTravelDNA: boolean;
};

/**
 * Parse and validate a travelos.local-export.v1 document.
 * Fail closed on unknown formats. Does not invent missing fields.
 */
export function parseLocalDataExportDocument(
  raw: unknown,
): LocalDataExportDocument {
  if (!raw || typeof raw !== 'object') {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This file is not a TravelOS backup.',
    );
  }

  const candidate = raw as Record<string, unknown>;

  if (candidate.format !== LOCAL_DATA_EXPORT_FORMAT) {
    throw new LocalDataRestoreError(
      'unsupported_format',
      'This backup format is not supported on this version of TravelOS.',
    );
  }

  if (
    typeof candidate.exportedAt !== 'string' ||
    candidate.exportedAt.length === 0
  ) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup is missing an export time.',
    );
  }

  if (
    typeof candidate.appVersion !== 'string' ||
    candidate.appVersion.length === 0
  ) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup is missing an app version.',
    );
  }

  if (!Array.isArray(candidate.trips)) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup is missing its trip list.',
    );
  }

  if (!Array.isArray(candidate.travelers)) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup is missing its traveler list.',
    );
  }

  if (!Array.isArray(candidate.savedPlaces)) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup is missing its saved ideas list.',
    );
  }

  if (
    candidate.travelDNA !== null &&
    (typeof candidate.travelDNA !== 'object' ||
      Array.isArray(candidate.travelDNA))
  ) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup has an invalid Travel DNA section.',
    );
  }

  for (const bundle of candidate.trips) {
    assertTripBundle(bundle);
  }

  return candidate as LocalDataExportDocument;
}

export function summarizeLocalDataExport(
  document: LocalDataExportDocument,
): LocalDataRestoreSummary {
  return {
    exportedAt: document.exportedAt,
    appVersion: document.appVersion,
    tripCount: document.trips.length,
    travelerCount: document.travelers.length,
    savedPlaceCount: document.savedPlaces.length,
    hasTravelDNA: document.travelDNA !== null,
  };
}

function assertTripBundle(value: unknown): asserts value is LocalDataExportTripBundle {
  if (!value || typeof value !== 'object') {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup contains an invalid trip bundle.',
    );
  }

  const bundle = value as Record<string, unknown>;
  const trip = bundle.trip;

  if (
    !trip ||
    typeof trip !== 'object' ||
    Array.isArray(trip) ||
    typeof (trip as { id?: unknown }).id !== 'string' ||
    (trip as { id: string }).id.length === 0
  ) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup contains a trip without a stable ID.',
    );
  }

  for (const key of [
    'days',
    'stops',
    'bookings',
    'accommodations',
    'fxRates',
    'memories',
    'livedStates',
    'travelers',
  ] as const) {
    if (!Array.isArray(bundle[key])) {
      throw new LocalDataRestoreError(
        'invalid_document',
        `This backup trip is missing its ${key} list.`,
      );
    }
  }

  if (
    bundle.budget !== null &&
    (typeof bundle.budget !== 'object' ||
      Array.isArray(bundle.budget))
  ) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup trip has an invalid budget section.',
    );
  }

  if (
    bundle.travelBook !== null &&
    (typeof bundle.travelBook !== 'object' ||
      Array.isArray(bundle.travelBook))
  ) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup trip has an invalid Travel Book section.',
    );
  }

  if (
    bundle.runtimeState !== null &&
    (typeof bundle.runtimeState !== 'object' ||
      Array.isArray(bundle.runtimeState))
  ) {
    throw new LocalDataRestoreError(
      'invalid_document',
      'This backup trip has an invalid runtime section.',
    );
  }
}
