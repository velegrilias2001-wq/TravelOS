import type {
  DatabaseConnection,
} from '../database/database';

import type { TripFxRate } from '../../domain/entities/fx-rate';
import type { TripId } from '../../domain/entities/trip';

interface FxRateRow {
  id: string;
  trip_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  as_of: string;
  source: string;
  created_at: string;
  updated_at: string;
}

function mapFxRate(row: FxRateRow): TripFxRate {
  return {
    id: row.id,
    tripId: row.trip_id,
    fromCurrency: row.from_currency,
    toCurrency: row.to_currency,
    rate: row.rate,
    asOf: row.as_of,
    source: row.source as TripFxRate['source'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadTripFxRates(
  database: DatabaseConnection,
  tripId: TripId,
): Promise<TripFxRate[]> {
  const rows = await database.query<FxRateRow>(
    `
      SELECT *
      FROM trip_fx_rates
      WHERE trip_id = ?
      ORDER BY
        from_currency ASC,
        to_currency ASC,
        id ASC;
    `,
    [tripId],
  );

  return rows.map(mapFxRate);
}

export async function upsertTripFxRate(
  database: DatabaseConnection,
  rate: TripFxRate,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO trip_fx_rates (
        id,
        trip_id,
        from_currency,
        to_currency,
        rate,
        as_of,
        source,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(trip_id, from_currency, to_currency) DO UPDATE SET
        rate = excluded.rate,
        as_of = excluded.as_of,
        source = excluded.source,
        updated_at = excluded.updated_at
      WHERE
        trip_fx_rates.trip_id = excluded.trip_id;
    `,
    [
      rate.id,
      rate.tripId,
      rate.fromCurrency,
      rate.toCurrency,
      rate.rate,
      rate.asOf,
      rate.source,
      rate.createdAt,
      rate.updatedAt,
    ],
  );
}

export async function deleteTripFxRate(
  database: DatabaseConnection,
  id: string,
): Promise<void> {
  await database.execute(
    `
      DELETE FROM trip_fx_rates
      WHERE id = ?;
    `,
    [id],
  );
}
