import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

export interface NotificationPreferences {
  enabled: boolean;
  leadMinutes: number;
  updatedAt: string;
}

const DEFAULT_LEAD_MINUTES = 15;

interface NotificationPreferencesRow {
  enabled: number;
  lead_minutes: number;
  updated_at: string;
}

function mapRow(
  row: NotificationPreferencesRow,
): NotificationPreferences {
  return {
    enabled: row.enabled === 1,
    leadMinutes: row.lead_minutes,
    updatedAt: row.updated_at,
  };
}

export async function loadNotificationPreferences(
  database: Database = travelOSDatabase,
): Promise<NotificationPreferences> {
  const row = await database.queryFirst<
    NotificationPreferencesRow
  >(
    `
      SELECT
        enabled,
        lead_minutes,
        updated_at
      FROM notification_preferences
      WHERE singleton_key = 1
    `,
  );

  if (!row) {
    return {
      enabled: false,
      leadMinutes: DEFAULT_LEAD_MINUTES,
      updatedAt: new Date(0).toISOString(),
    };
  }

  return mapRow(row);
}

export async function saveNotificationPreferences(
  input: {
    enabled: boolean;
    leadMinutes?: number;
  },
  database: Database = travelOSDatabase,
): Promise<NotificationPreferences> {
  const leadMinutes =
    input.leadMinutes ?? DEFAULT_LEAD_MINUTES;

  if (
    !Number.isInteger(leadMinutes) ||
    leadMinutes < 5 ||
    leadMinutes > 180
  ) {
    throw new Error(
      'Notification lead minutes must be between 5 and 180',
    );
  }

  const updatedAt = new Date().toISOString();

  await database.execute(
    `
      INSERT INTO notification_preferences (
        singleton_key,
        enabled,
        lead_minutes,
        updated_at
      )
      VALUES (1, ?, ?, ?)
      ON CONFLICT(singleton_key) DO UPDATE SET
        enabled = excluded.enabled,
        lead_minutes = excluded.lead_minutes,
        updated_at = excluded.updated_at
    `,
    [
      input.enabled ? 1 : 0,
      leadMinutes,
      updatedAt,
    ],
  );

  return {
    enabled: input.enabled,
    leadMinutes,
    updatedAt,
  };
}

export const DEFAULT_NOTIFICATION_LEAD_MINUTES =
  DEFAULT_LEAD_MINUTES;
