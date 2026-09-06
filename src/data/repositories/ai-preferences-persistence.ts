import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

export interface AiPreferences {
  enabled: boolean;
  updatedAt: string;
}

interface AiPreferencesRow {
  enabled: number;
  updated_at: string;
}

function mapRow(row: AiPreferencesRow): AiPreferences {
  return {
    enabled: row.enabled === 1,
    updatedAt: row.updated_at,
  };
}

export async function loadAiPreferences(
  database: Database = travelOSDatabase,
): Promise<AiPreferences> {
  const row = await database.queryFirst<AiPreferencesRow>(
    `
      SELECT
        enabled,
        updated_at
      FROM ai_preferences
      WHERE singleton_key = 1
    `,
  );

  if (!row) {
    return {
      enabled: true,
      updatedAt: new Date(0).toISOString(),
    };
  }

  return mapRow(row);
}

export async function saveAiPreferences(
  input: { enabled: boolean },
  database: Database = travelOSDatabase,
): Promise<AiPreferences> {
  const updatedAt = new Date().toISOString();

  await database.execute(
    `
      INSERT INTO ai_preferences (
        singleton_key,
        enabled,
        updated_at
      )
      VALUES (1, ?, ?)
      ON CONFLICT(singleton_key) DO UPDATE SET
        enabled = excluded.enabled,
        updated_at = excluded.updated_at
    `,
    [input.enabled ? 1 : 0, updatedAt],
  );

  return {
    enabled: input.enabled,
    updatedAt,
  };
}
