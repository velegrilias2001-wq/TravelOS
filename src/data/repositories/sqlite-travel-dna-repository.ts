import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
  BudgetStyle,
  DailyRhythm,
  TravelDNA,
  TravelInterest,
  TravelPace,
  TravelStyle,
  TypicalTravelParty,
} from '../../domain/entities/travel-dna';
import type { TravelDNARepository } from '../../domain/repositories/travel-dna-repository';

interface TravelDNARow {
  id: string;
  pace: string | null;
  interests_json: string;
  travel_style: string | null;
  budget_style: string | null;
  daily_rhythm: string | null;
  typical_party: string | null;
  created_at: string;
  updated_at: string;
}

const VALID_TRAVEL_INTERESTS =
  new Set<TravelInterest>([
    'food',
    'culture',
    'nature',
    'beaches',
    'nightlife',
    'shopping',
    'wellness',
    'adventure',
  ]);

function parseInterests(
  value: string,
): TravelInterest[] {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const interests: TravelInterest[] = [];

    for (const candidate of parsed) {
      if (
        typeof candidate === 'string' &&
        VALID_TRAVEL_INTERESTS.has(
          candidate as TravelInterest,
        ) &&
        !interests.includes(
          candidate as TravelInterest,
        )
      ) {
        interests.push(
          candidate as TravelInterest,
        );
      }
    }

    return interests;
  } catch {
    return [];
  }
}

function mapTravelDNA(
  row: TravelDNARow,
): TravelDNA {
  return {
    id: row.id,
    pace:
      (row.pace as TravelPace | null) ??
      undefined,
    interests: parseInterests(
      row.interests_json,
    ),
    travelStyle:
      (row.travel_style as TravelStyle | null) ??
      undefined,
    budgetStyle:
      (row.budget_style as BudgetStyle | null) ??
      undefined,
    dailyRhythm:
      (row.daily_rhythm as DailyRhythm | null) ??
      undefined,
    typicalParty:
      (row.typical_party as
        | TypicalTravelParty
        | null) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteTravelDNARepository
  implements TravelDNARepository
{
  constructor(
    private readonly database: Database =
      travelOSDatabase,
  ) {}

  async get(): Promise<TravelDNA | null> {
    const row =
      await this.database.queryFirst<TravelDNARow>(
        `
          SELECT
            id,
            pace,
            interests_json,
            travel_style,
            budget_style,
            daily_rhythm,
            typical_party,
            created_at,
            updated_at
          FROM travel_dna
          WHERE singleton_key = 1;
        `,
      );

    return row ? mapTravelDNA(row) : null;
  }

  async save(
    profile: TravelDNA,
  ): Promise<void> {
    await this.database.execute(
      `
        INSERT INTO travel_dna (
          singleton_key,
          id,
          pace,
          interests_json,
          travel_style,
          budget_style,
          daily_rhythm,
          typical_party,
          created_at,
          updated_at
        )
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(singleton_key) DO UPDATE SET
          id = excluded.id,
          pace = excluded.pace,
          interests_json =
            excluded.interests_json,
          travel_style =
            excluded.travel_style,
          budget_style =
            excluded.budget_style,
          daily_rhythm =
            excluded.daily_rhythm,
          typical_party =
            excluded.typical_party,
          updated_at =
            excluded.updated_at;
      `,
      [
        profile.id,
        profile.pace ?? null,
        JSON.stringify(profile.interests),
        profile.travelStyle ?? null,
        profile.budgetStyle ?? null,
        profile.dailyRhythm ?? null,
        profile.typicalParty ?? null,
        profile.createdAt,
        profile.updatedAt,
      ],
    );
  }
}

export const travelDNARepository =
  new SQLiteTravelDNARepository();
