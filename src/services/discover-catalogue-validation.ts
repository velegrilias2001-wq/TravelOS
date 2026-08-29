import type {
  DiscoverCatalogueEvidence,
  DiscoverCatalogueRecord,
} from './discover-catalogue';

const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})$/;

const HTTP_URL_PATTERN =
  /^https?:\/\//i;

function assertNonEmptyString(
  value: string,
  field: string,
): void {
  if (!value.trim()) {
    throw new Error(
      `Discover catalogue: ${field} must not be empty.`,
    );
  }
}

function isValidIsoCalendarDate(
  value: string,
): boolean {
  const match =
    ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() === day
  );
}

function validateEvidence(
  evidence: DiscoverCatalogueEvidence,
  recordId: string,
): void {
  assertNonEmptyString(
    evidence.label,
    `${recordId}.evidence.label`,
  );

  assertNonEmptyString(
    evidence.url,
    `${recordId}.evidence.url`,
  );

  if (
    !HTTP_URL_PATTERN.test(
      evidence.url,
    )
  ) {
    throw new Error(
      `Discover catalogue: ${recordId} evidence URL must use http or https.`,
    );
  }

  if (
    !isValidIsoCalendarDate(
      evidence.checkedAt,
    )
  ) {
    throw new Error(
      `Discover catalogue: ${recordId} evidence checkedAt must be a valid YYYY-MM-DD calendar date.`,
    );
  }
}

function validateCoordinates(
  record: DiscoverCatalogueRecord,
): void {
  const {
    latitude,
    longitude,
  } = record.destination;

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      `Discover catalogue: ${record.id} has invalid latitude.`,
    );
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      `Discover catalogue: ${record.id} has invalid longitude.`,
    );
  }
}

function validateTiming(
  record: DiscoverCatalogueRecord,
): void {
  if (!record.timing) {
    return;
  }

  const uniqueMonths =
    new Set(
      record.timing.supportedMonths,
    );

  if (
    uniqueMonths.size !==
    record.timing.supportedMonths
      .length
  ) {
    throw new Error(
      `Discover catalogue: ${record.id} has duplicate supported months.`,
    );
  }

  for (
    const month
    of record.timing.supportedMonths
  ) {
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new Error(
        `Discover catalogue: ${record.id} has invalid supported month ${month}.`,
      );
    }
  }
}

export function validateDiscoverCatalogueRecord(
  record: DiscoverCatalogueRecord,
): DiscoverCatalogueRecord {
  assertNonEmptyString(
    record.id,
    'id',
  );

  assertNonEmptyString(
    record.destination.name,
    `${record.id}.destination.name`,
  );

  validateCoordinates(record);

  if (
    record.evidence.length === 0
  ) {
    throw new Error(
      `Discover catalogue: ${record.id} must have at least one evidence source.`,
    );
  }

  for (
    const evidence
    of record.evidence
  ) {
    validateEvidence(
      evidence,
      record.id,
    );
  }

  validateTiming(record);

  return record;
}

export function validateDiscoverCatalogue(
  records:
    readonly DiscoverCatalogueRecord[],
): readonly DiscoverCatalogueRecord[] {
  const ids = new Set<string>();

  for (const record of records) {
    validateDiscoverCatalogueRecord(
      record,
    );

    if (ids.has(record.id)) {
      throw new Error(
        `Discover catalogue: duplicate record id "${record.id}".`,
      );
    }

    ids.add(record.id);
  }

  return records;
}