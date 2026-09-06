import type {
  DiscoverBrief,
  TravelDNA,
} from '@/domain/entities';

import {
  findGroundedDiscoverRecord,
} from './discover-explain';

import {
  resolveDiscoverPersonalization,
  type DiscoverPreferenceSource,
} from './discover-personalization';

import type {
  DiscoverCatalogueFitProfile,
  DiscoverCatalogueRecord,
} from './discover-catalogue';

export type DiscoverCompareCellStatus =
  | 'match'
  | 'no_match'
  | 'unknown';

export type DiscoverCompareDimension =
  | 'intent'
  | 'interests'
  | 'pace'
  | 'party'
  | 'travel_style'
  | 'budget_style'
  | 'daily_rhythm';

export interface DiscoverCompareColumn {
  identity: string;
  name: string;
  countryCode?: string;
}

export interface DiscoverCompareCell {
  identity: string;
  status: DiscoverCompareCellStatus;
  catalogueValues: string[];
  evidenceLabels: string[];
}

export interface DiscoverCompareRow {
  dimension: DiscoverCompareDimension;
  preferenceLabel: string;
  preferenceSource: DiscoverPreferenceSource;
  cells: DiscoverCompareCell[];
}

export interface DiscoverCompareResult {
  columns: DiscoverCompareColumn[];
  rows: DiscoverCompareRow[];
}

function evidenceLabelsFor(
  record: DiscoverCatalogueRecord,
): string[] {
  return record.evidence.map(
    (item) => item.label,
  );
}

function cellForValues(input: {
  identity: string;
  catalogueValues: string[];
  preferenceValues: string[];
  evidenceLabels: string[];
}): DiscoverCompareCell {
  const { catalogueValues, preferenceValues } =
    input;

  if (catalogueValues.length === 0) {
    return {
      identity: input.identity,
      status: 'unknown',
      catalogueValues: [],
      evidenceLabels: input.evidenceLabels,
    };
  }

  const matched = preferenceValues.some((value) =>
    catalogueValues.includes(value),
  );

  return {
    identity: input.identity,
    status: matched ? 'match' : 'no_match',
    catalogueValues,
    evidenceLabels: input.evidenceLabels,
  };
}

function fitValues(
  fit: DiscoverCatalogueFitProfile | undefined,
  key: keyof DiscoverCatalogueFitProfile,
): string[] {
  if (!fit) {
    return [];
  }

  return [...fit[key]];
}

/**
 * Side-by-side compare of 2–3 grounded catalogue identities
 * against active Brief/DNA dimensions. Catalogue facts only.
 * Missing evidence is unknown — never invented.
 */
export function compareDiscoverDestinations(input: {
  brief: DiscoverBrief;
  travelDNA: TravelDNA | null;
  identities: string[];
}): DiscoverCompareResult {
  const uniqueIdentities = [
    ...new Set(
      input.identities.map((id) => id.trim()).filter(Boolean),
    ),
  ];

  if (
    uniqueIdentities.length < 2 ||
    uniqueIdentities.length > 3
  ) {
    throw new Error(
      'Compare requires 2 or 3 grounded destinations.',
    );
  }

  const records = uniqueIdentities.map((identity) => {
    const record = findGroundedDiscoverRecord(identity);

    if (!record) {
      throw new Error(
        `Unknown grounded destination: ${identity}`,
      );
    }

    return { identity, record };
  });

  const personalization = resolveDiscoverPersonalization(
    input.brief,
    input.travelDNA,
  );

  const columns: DiscoverCompareColumn[] = records.map(
    ({ identity, record }) => ({
      identity,
      name: record.destination.name,
      countryCode: record.destination.countryCode,
    }),
  );

  const rows: DiscoverCompareRow[] = [];

  const intent = personalization.brief.intent;

  if (intent) {
    rows.push({
      dimension: 'intent',
      preferenceLabel: intent,
      preferenceSource: 'discover_brief',
      cells: records.map(({ identity, record }) =>
        cellForValues({
          identity,
          catalogueValues: fitValues(record.fit, 'intents'),
          preferenceValues: [intent],
          evidenceLabels: evidenceLabelsFor(record),
        }),
      ),
    });
  }

  if (
    personalization.pace.source !== 'unspecified' &&
    personalization.pace.value
  ) {
    rows.push({
      dimension: 'pace',
      preferenceLabel: personalization.pace.value,
      preferenceSource: personalization.pace.source,
      cells: records.map(({ identity, record }) =>
        cellForValues({
          identity,
          catalogueValues: fitValues(record.fit, 'paces'),
          preferenceValues: [personalization.pace.value!],
          evidenceLabels: evidenceLabelsFor(record),
        }),
      ),
    });
  }

  if (
    personalization.interests.source !== 'unspecified' &&
    personalization.interests.values.length > 0
  ) {
    rows.push({
      dimension: 'interests',
      preferenceLabel:
        personalization.interests.values.join(', '),
      preferenceSource: personalization.interests.source,
      cells: records.map(({ identity, record }) =>
        cellForValues({
          identity,
          catalogueValues: fitValues(record.fit, 'interests'),
          preferenceValues: personalization.interests.values,
          evidenceLabels: evidenceLabelsFor(record),
        }),
      ),
    });
  }

  if (
    personalization.party.source !== 'unspecified' &&
    personalization.party.value
  ) {
    rows.push({
      dimension: 'party',
      preferenceLabel: personalization.party.value,
      preferenceSource: personalization.party.source,
      cells: records.map(({ identity, record }) =>
        cellForValues({
          identity,
          catalogueValues: fitValues(record.fit, 'parties'),
          preferenceValues: [personalization.party.value!],
          evidenceLabels: evidenceLabelsFor(record),
        }),
      ),
    });
  }

  if (
    personalization.travelStyle.source !== 'unspecified' &&
    personalization.travelStyle.value
  ) {
    rows.push({
      dimension: 'travel_style',
      preferenceLabel: personalization.travelStyle.value,
      preferenceSource: personalization.travelStyle.source,
      cells: records.map(({ identity, record }) =>
        cellForValues({
          identity,
          catalogueValues: fitValues(
            record.fit,
            'travelStyles',
          ),
          preferenceValues: [
            personalization.travelStyle.value!,
          ],
          evidenceLabels: evidenceLabelsFor(record),
        }),
      ),
    });
  }

  if (
    personalization.budgetStyle.source !== 'unspecified' &&
    personalization.budgetStyle.value
  ) {
    rows.push({
      dimension: 'budget_style',
      preferenceLabel: personalization.budgetStyle.value,
      preferenceSource: personalization.budgetStyle.source,
      cells: records.map(({ identity, record }) =>
        cellForValues({
          identity,
          catalogueValues: fitValues(
            record.fit,
            'budgetStyles',
          ),
          preferenceValues: [
            personalization.budgetStyle.value!,
          ],
          evidenceLabels: evidenceLabelsFor(record),
        }),
      ),
    });
  }

  if (
    personalization.dailyRhythm.source !== 'unspecified' &&
    personalization.dailyRhythm.value
  ) {
    rows.push({
      dimension: 'daily_rhythm',
      preferenceLabel: personalization.dailyRhythm.value,
      preferenceSource: personalization.dailyRhythm.source,
      cells: records.map(({ identity, record }) =>
        cellForValues({
          identity,
          catalogueValues: fitValues(
            record.fit,
            'dailyRhythms',
          ),
          preferenceValues: [
            personalization.dailyRhythm.value!,
          ],
          evidenceLabels: evidenceLabelsFor(record),
        }),
      ),
    });
  }

  return { columns, rows };
}
