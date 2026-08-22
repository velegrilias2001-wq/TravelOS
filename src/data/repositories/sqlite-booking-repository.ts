import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
    Booking,
    BookingId,
    BookingStatus,
    BookingType,
} from '../../domain/entities/booking';

import type { TripId } from '../../domain/entities/trip';

import type { BookingRepository } from '../../domain/repositories/booking-repository';

interface BookingRow {
  id: string;
  trip_id: string;
  stop_id: string | null;

  type: string;
  status: string;

  title: string;
  provider: string | null;
  confirmation_code: string | null;

  start_at: string | null;
  end_at: string | null;

  amount: number | null;
  currency_code: string | null;

  is_paid: number | null;

  notes: string | null;
  external_url: string | null;

  created_at: string;
  updated_at: string;
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    tripId: row.trip_id,
    stopId: row.stop_id ?? undefined,

    type: row.type as BookingType,
    status: row.status as BookingStatus,

    title: row.title,
    provider: row.provider ?? undefined,
    confirmationCode:
      row.confirmation_code ?? undefined,

    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,

    amount: row.amount ?? undefined,
    currencyCode: row.currency_code ?? undefined,

    isPaid:
      row.is_paid === null
        ? undefined
        : row.is_paid === 1,

    notes: row.notes ?? undefined,
    externalUrl: row.external_url ?? undefined,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteBookingRepository
  implements BookingRepository
{
  constructor(
    private readonly database: Database = travelOSDatabase,
  ) {}

  async getById(
    id: BookingId,
  ): Promise<Booking | null> {
    const row =
      await this.database.queryFirst<BookingRow>(
        `
          SELECT *
          FROM bookings
          WHERE id = ?;
        `,
        [id],
      );

    return row ? mapBooking(row) : null;
  }

  async getByTripId(
    tripId: TripId,
  ): Promise<Booking[]> {
    const rows =
      await this.database.query<BookingRow>(
        `
          SELECT *
          FROM bookings
          WHERE trip_id = ?
          ORDER BY
            CASE WHEN start_at IS NULL THEN 1 ELSE 0 END,
            start_at ASC,
            created_at ASC;
        `,
        [tripId],
      );

    return rows.map(mapBooking);
  }

  async save(booking: Booking): Promise<void> {
    await this.database.execute(
      `
        INSERT INTO bookings (
          id,
          trip_id,
          stop_id,
          type,
          status,
          title,
          provider,
          confirmation_code,
          start_at,
          end_at,
          amount,
          currency_code,
          is_paid,
          notes,
          external_url,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          trip_id = excluded.trip_id,
          stop_id = excluded.stop_id,
          type = excluded.type,
          status = excluded.status,
          title = excluded.title,
          provider = excluded.provider,
          confirmation_code = excluded.confirmation_code,
          start_at = excluded.start_at,
          end_at = excluded.end_at,
          amount = excluded.amount,
          currency_code = excluded.currency_code,
          is_paid = excluded.is_paid,
          notes = excluded.notes,
          external_url = excluded.external_url,
          updated_at = excluded.updated_at;
      `,
      [
        booking.id,
        booking.tripId,
        booking.stopId ?? null,

        booking.type,
        booking.status,

        booking.title,
        booking.provider ?? null,
        booking.confirmationCode ?? null,

        booking.startAt ?? null,
        booking.endAt ?? null,

        booking.amount ?? null,
        booking.currencyCode ?? null,

        booking.isPaid === undefined
          ? null
          : booking.isPaid
            ? 1
            : 0,

        booking.notes ?? null,
        booking.externalUrl ?? null,

        booking.createdAt,
        booking.updatedAt,
      ],
    );
  }

  async delete(id: BookingId): Promise<void> {
    await this.database.execute(
      `
        DELETE FROM bookings
        WHERE id = ?;
      `,
      [id],
    );
  }
}

export const bookingRepository =
  new SQLiteBookingRepository();