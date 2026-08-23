import type { Database } from '../database/database';
import { travelOSDatabase } from '../database/expo-sqlite-database';

import type {
  Trip,
  TripDestination,
  TripId,
  TripStatus,
} from '../../domain/entities/trip';

import type { TripDay } from '../../domain/entities/trip-day';

import type {
  TripStop,
  TripStopId,
  TripStopType,
} from '../../domain/entities/trip-stop';

import type { TripRepository } from '../../domain/repositories/trip-repository';

import {
  deleteCanonicalTrip,
  deleteCanonicalTripStop,
  ensureCanonicalTripDays,
  reorderTripStops,
  saveCanonicalTrip,
} from './trip-persistence-operations';

interface TripRow {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  accounting_currency: string;
  created_at: string;
  updated_at: string;
}

interface DestinationRow {
  id: string;
  name: string;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  currency_code: string | null;
}

interface TravelerLinkRow {
  traveler_id: string;
}

interface TripDayRow {
  id: string;
  trip_id: string;
  date: string;
  day_number: number;
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TripStopRow {
  id: string;
  trip_id: string;
  day_id: string;

  title: string;
  type: string;
  position: number;

  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;

  start_time: string | null;
  end_time: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
}

function optional<T>(
  value: T | null,
): T | undefined {
  return value ?? undefined;
}

function mapTripStop(
  row: TripStopRow,
): TripStop {
  return {
    id: row.id,
    tripId: row.trip_id,
    dayId: row.day_id,
    title: row.title,
    type: row.type as TripStopType,
    order: row.position,
    location: row.location_name
      ? {
          name: row.location_name,
          address: optional(row.address),
          latitude: optional(row.latitude),
          longitude: optional(row.longitude),
          placeId: optional(row.place_id),
        }
      : undefined,
    startTime: optional(row.start_time),
    endTime: optional(row.end_time),
    notes: optional(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteTripRepository
  implements TripRepository
{
  constructor(
    private readonly database: Database =
      travelOSDatabase,
  ) {}

  async getAll(): Promise<Trip[]> {
    const rows =
      await this.database.query<TripRow>(`
        SELECT *
        FROM trips
        ORDER BY start_date ASC;
      `);

    return Promise.all(
      rows.map((row) =>
        this.hydrateTrip(row),
      ),
    );
  }

  async getById(
    id: TripId,
  ): Promise<Trip | null> {
    const row =
      await this.database.queryFirst<TripRow>(
        `
          SELECT *
          FROM trips
          WHERE id = ?;
        `,
        [id],
      );

    if (!row) {
      return null;
    }

    return this.hydrateTrip(row);
  }

  private async hydrateTrip(
    row: TripRow,
  ): Promise<Trip> {
    const destinations =
      await this.database.query<DestinationRow>(
        `
          SELECT
            id,
            name,
            country_code,
            latitude,
            longitude,
            timezone,
            currency_code
          FROM trip_destinations
          WHERE trip_id = ?
          ORDER BY position ASC;
        `,
        [row.id],
      );

    const travelers =
      await this.database.query<TravelerLinkRow>(
        `
          SELECT traveler_id
          FROM trip_travelers
          WHERE trip_id = ?;
        `,
        [row.id],
      );

    return {
      id: row.id,
      title: row.title,
      status: row.status as TripStatus,

      destinations: destinations.map(
        (
          destination,
        ): TripDestination => ({
          id: destination.id,
          name: destination.name,

          countryCode: optional(
            destination.country_code,
          ),

          latitude: optional(
            destination.latitude,
          ),

          longitude: optional(
            destination.longitude,
          ),

          timezone: optional(
            destination.timezone,
          ),

          currencyCode: optional(
            destination.currency_code,
          ),
        }),
      ),

      startDate: row.start_date,
      endDate: row.end_date,

      travelerIds: travelers.map(
        (traveler) =>
          traveler.traveler_id,
      ),

      accountingCurrency:
        row.accounting_currency,

      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async save(
    trip: Trip,
  ): Promise<void> {
    await saveCanonicalTrip(
      this.database,
      trip,
    );
  }

  async delete(
    id: TripId,
  ): Promise<void> {
    await deleteCanonicalTrip(
      this.database,
      id,
    );
  }

  async getDays(
    tripId: TripId,
  ): Promise<TripDay[]> {
    const rows =
      await this.database.query<TripDayRow>(
        `
          SELECT *
          FROM trip_days
          WHERE trip_id = ?
          ORDER BY day_number ASC;
        `,
        [tripId],
      );

    return rows.map((row) => ({
      id: row.id,
      tripId: row.trip_id,

      date: row.date,
      dayNumber: row.day_number,

      title: optional(row.title),
      notes: optional(row.notes),

      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async saveDay(
    day: TripDay,
  ): Promise<void> {
    await this.database.execute(
      `
        INSERT INTO trip_days (
          id,
          trip_id,
          date,
          day_number,
          title,
          notes,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          trip_id = excluded.trip_id,
          date = excluded.date,
          day_number = excluded.day_number,
          title = excluded.title,
          notes = excluded.notes,
          updated_at = excluded.updated_at;
      `,
      [
        day.id,
        day.tripId,
        day.date,
        day.dayNumber,
        day.title ?? null,
        day.notes ?? null,
        day.createdAt,
        day.updatedAt,
      ],
    );
  }

  async ensureDays(
    days: TripDay[],
  ): Promise<void> {
    await ensureCanonicalTripDays(
      this.database,
      days,
    );
  }

  async getStops(
    tripId: TripId,
  ): Promise<TripStop[]> {
    const rows =
      await this.database.query<TripStopRow>(
        `
          SELECT s.*
          FROM trip_stops s

          LEFT JOIN trip_days d
            ON d.id = s.day_id

          WHERE s.trip_id = ?

          ORDER BY
            d.day_number ASC,
            s.position ASC;
        `,
        [tripId],
      );

    return rows.map(mapTripStop);
  }

  async getStopById(
    id: TripStopId,
  ): Promise<TripStop | null> {
    const row =
      await this.database.queryFirst<TripStopRow>(
        `
          SELECT *
          FROM trip_stops
          WHERE id = ?;
        `,
        [id],
      );

    return row ? mapTripStop(row) : null;
  }

  async saveStop(
    stop: TripStop,
  ): Promise<void> {
    await this.database.execute(
      `
        INSERT INTO trip_stops (
          id,
          trip_id,
          day_id,
          title,
          type,
          position,
          location_name,
          address,
          latitude,
          longitude,
          place_id,
          start_time,
          end_time,
          notes,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          trip_id = excluded.trip_id,
          day_id = excluded.day_id,
          title = excluded.title,
          type = excluded.type,
          position = excluded.position,
          location_name =
            excluded.location_name,
          address = excluded.address,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          place_id = excluded.place_id,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          notes = excluded.notes,
          updated_at =
            excluded.updated_at;
      `,
      [
        stop.id,
        stop.tripId,
        stop.dayId,

        stop.title,
        stop.type,
        stop.order,

        stop.location?.name ?? null,
        stop.location?.address ?? null,

        stop.location?.latitude ??
          null,

        stop.location?.longitude ??
          null,

        stop.location?.placeId ??
          null,

        stop.startTime ?? null,
        stop.endTime ?? null,

        stop.notes ?? null,

        stop.createdAt,
        stop.updatedAt,
      ],
    );
  }

  async reorderStops(
    stops: TripStop[],
  ): Promise<void> {
    await reorderTripStops(
      this.database,
      stops,
    );
  }

  async deleteStop(
    id: TripStopId,
  ): Promise<void> {
    await deleteCanonicalTripStop(
      this.database,
      id,
    );
  }
}

export const tripRepository =
  new SQLiteTripRepository();
