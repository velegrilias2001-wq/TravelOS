import type {
  Database,
  DatabaseConnection,
} from '../database/database';

import type {
  Trip,
  TripDay,
  TripId,
  TripStop,
} from '../../domain/entities';

interface PersistedTripDayRow {
  id: string;
  date: string;
  day_number: number;
  updated_at: string;
}

interface PersistedStopRow {
  id: string;
  trip_id: string;
  day_id: string;
  position: number;
}

export async function saveCanonicalTrip(
  database: Database,
  trip: Trip,
): Promise<void> {
  await database.transaction(
    async (transaction) => {
      await transaction.execute(
        `
          INSERT INTO trips (
            id,
            title,
            status,
            start_date,
            end_date,
            accounting_currency,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            status = excluded.status,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            accounting_currency =
              excluded.accounting_currency,
            updated_at = excluded.updated_at;
        `,
        [
          trip.id,
          trip.title,
          trip.status,
          trip.startDate,
          trip.endDate,
          trip.accountingCurrency,
          trip.createdAt,
          trip.updatedAt,
        ],
      );

      await transaction.execute(
        `
          DELETE FROM trip_destinations
          WHERE trip_id = ?;
        `,
        [trip.id],
      );

      for (
        let position = 0;
        position < trip.destinations.length;
        position += 1
      ) {
        const destination =
          trip.destinations[position];

        await transaction.execute(
          `
            INSERT INTO trip_destinations (
              id,
              trip_id,
              name,
              country_code,
              latitude,
              longitude,
              timezone,
              currency_code,
              position
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            destination.id,
            trip.id,
            destination.name,
            destination.countryCode ?? null,
            destination.latitude ?? null,
            destination.longitude ?? null,
            destination.timezone ?? null,
            destination.currencyCode ?? null,
            position,
          ],
        );
      }

      await transaction.execute(
        `
          DELETE FROM trip_travelers
          WHERE trip_id = ?;
        `,
        [trip.id],
      );

      for (const travelerId of trip.travelerIds) {
        const travelerExists =
          await transaction.queryFirst<{
            id: string;
          }>(
            `
              SELECT id
              FROM travelers
              WHERE id = ?;
            `,
            [travelerId],
          );

        if (travelerExists) {
          await transaction.execute(
            `
              INSERT INTO trip_travelers (
                trip_id,
                traveler_id
              )
              VALUES (?, ?);
            `,
            [trip.id, travelerId],
          );
        }
      }
    },
  );
}

export async function deleteCanonicalTrip(
  database: Database,
  id: TripId,
): Promise<void> {
  // A single SQLite DELETE statement is atomic, and keeping it on
  // the database connection preserves Expo SQLite's configured
  // foreign-key cascade behavior.
  await database.execute(
    `DELETE FROM trips WHERE id = ?;`,
    [id],
  );
}

export async function deleteCanonicalTripStop(
  database: Database,
  id: TripStop['id'],
): Promise<void> {
  // Booking.stopId and the other optional stop links use
  // ON DELETE SET NULL, so SQLite preserves and unlinks
  // related records atomically with this one statement.
  await database.execute(
    `DELETE FROM trip_stops WHERE id = ?;`,
    [id],
  );
}

function assertUnique<
  Value extends string | number,
>(
  values: readonly Value[],
  label: string,
): void {
  if (
    new Set(values).size !==
    values.length
  ) {
    throw new Error(
      'Cannot persist duplicate ' +
        label,
    );
  }
}

function validateCanonicalDays(
  days: readonly TripDay[],
): void {
  const tripId = days[0]?.tripId;

  if (!tripId) {
    return;
  }

  assertUnique(
    days.map((day) => day.id),
    'TripDay IDs',
  );

  assertUnique(
    days.map((day) => day.date),
    'TripDay dates',
  );

  assertUnique(
    days.map((day) => day.dayNumber),
    'TripDay numbers',
  );

  for (
    let index = 0;
    index < days.length;
    index += 1
  ) {
    const day = days[index];

    if (day.tripId !== tripId) {
      throw new Error(
        'Canonical TripDays must belong to one Trip',
      );
    }

    if (day.dayNumber !== index + 1) {
      throw new Error(
        'Canonical TripDays must be sequential',
      );
    }
  }
}

async function readTripDays(
  connection: DatabaseConnection,
  tripId: string,
): Promise<PersistedTripDayRow[]> {
  return connection.query<PersistedTripDayRow>(
    `
      SELECT
        id,
        date,
        day_number,
        updated_at
      FROM trip_days
      WHERE trip_id = ?
      ORDER BY
        date ASC,
        created_at ASC,
        id ASC;
    `,
    [tripId],
  );
}

export async function ensureCanonicalTripDays(
  database: Database,
  canonicalDays: readonly TripDay[],
): Promise<void> {
  if (canonicalDays.length === 0) {
    return;
  }

  validateCanonicalDays(canonicalDays);

  const tripId =
    canonicalDays[0].tripId;

  await database.transaction(
    async (transaction) => {
      const existing =
        await readTripDays(
          transaction,
          tripId,
        );

      assertUnique(
        existing.map((day) => day.date),
        'stored TripDay dates',
      );

      assertUnique(
        existing.map(
          (day) => day.day_number,
        ),
        'stored TripDay numbers',
      );

      if (
        existing.some(
          (day) =>
            day.day_number < 1,
        )
      ) {
        throw new Error(
          'Stored TripDay numbers must be positive',
        );
      }

      const canonicalByDate =
        new Map(
          canonicalDays.map(
            (day) => [
              day.date,
              day,
            ],
          ),
        );

      const existingDates =
        new Set(
          existing.map(
            (day) => day.date,
          ),
        );

      let overflowDayNumber =
        canonicalDays.length + 1;

      const assignments =
        existing.map((day) => {
          const canonical =
            canonicalByDate.get(
              day.date,
            );

          const dayNumber =
            canonical?.dayNumber ??
            overflowDayNumber++;

          return {
            ...day,
            targetDayNumber:
              dayNumber,
          };
        });

      const missing =
        canonicalDays.filter(
          (day) =>
            !existingDates.has(
              day.date,
            ),
        );

      const needsRepair =
        missing.length > 0 ||
        assignments.some(
          (day) =>
            day.day_number !==
            day.targetDayNumber,
        );

      if (!needsRepair) {
        return;
      }

      const maximumDayNumber =
        existing.reduce(
          (maximum, day) =>
            Math.max(
              maximum,
              day.day_number,
            ),
          0,
        );

      const temporaryOffset =
        maximumDayNumber +
        existing.length +
        canonicalDays.length +
        1;

      if (existing.length > 0) {
        await transaction.execute(
          `
            UPDATE trip_days
            SET day_number =
              day_number + ?
            WHERE trip_id = ?;
          `,
          [
            temporaryOffset,
            tripId,
          ],
        );
      }

      const repairTimestamp =
        canonicalDays[0].updatedAt;

      for (const day of assignments) {
        await transaction.execute(
          `
            UPDATE trip_days
            SET
              day_number = ?,
              updated_at = ?
            WHERE
              id = ?
              AND trip_id = ?;
          `,
          [
            day.targetDayNumber,

            day.day_number ===
            day.targetDayNumber
              ? day.updated_at
              : repairTimestamp,

            day.id,
            tripId,
          ],
        );
      }

      for (const day of missing) {
        await transaction.execute(
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
            ON CONFLICT(trip_id, date)
            DO NOTHING;
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

      const repaired =
        await readTripDays(
          transaction,
          tripId,
        );

      const repairedByDate =
        new Map(
          repaired.map(
            (day) => [
              day.date,
              day,
            ],
          ),
        );

      for (
        const canonical of
        canonicalDays
      ) {
        const stored =
          repairedByDate.get(
            canonical.date,
          );

        if (
          !stored ||
          stored.day_number !==
            canonical.dayNumber
        ) {
          throw new Error(
            'TripDay repair did not produce the canonical date range',
          );
        }
      }
    },
  );
}

function validateStopOrder(
  stops: readonly TripStop[],
): void {
  const first = stops[0];

  if (!first) {
    return;
  }

  assertUnique(
    stops.map((stop) => stop.id),
    'TripStop IDs',
  );

  for (const stop of stops) {
    if (
      stop.tripId !==
        first.tripId ||
      stop.dayId !== first.dayId
    ) {
      throw new Error(
        'A stop reorder must contain exactly one TripDay',
      );
    }
  }
}

export async function reorderTripStops(
  database: Database,
  stops: readonly TripStop[],
): Promise<void> {
  if (stops.length === 0) {
    return;
  }

  validateStopOrder(stops);

  const { tripId, dayId } =
    stops[0];

  await database.transaction(
    async (transaction) => {
      const existing =
        await transaction.query<PersistedStopRow>(
          `
            SELECT
              id,
              trip_id,
              day_id,
              position
            FROM trip_stops
            WHERE day_id = ?
            ORDER BY
              position ASC,
              created_at ASC,
              id ASC;
          `,
          [dayId],
        );

      if (
        existing.length !==
        stops.length
      ) {
        throw new Error(
          'A stop reorder must include every stop in the TripDay',
        );
      }

      assertUnique(
        existing.map(
          (stop) => stop.position,
        ),
        'stored TripStop positions',
      );

      if (
        existing.some(
          (stop) =>
            stop.trip_id !== tripId ||
            stop.day_id !== dayId ||
            stop.position < 1,
        )
      ) {
        throw new Error(
          'Stored TripStop order is invalid',
        );
      }

      const existingIds =
        new Set(
          existing.map(
            (stop) => stop.id,
          ),
        );

      if (
        stops.some(
          (stop) =>
            !existingIds.has(
              stop.id,
            ),
        )
      ) {
        throw new Error(
          'A stop reorder cannot add or remove TripStops',
        );
      }

      const isAlreadyOrdered =
        stops.every(
          (stop, index) =>
            existing[index]?.id ===
              stop.id &&
            existing[index]
              .position ===
              index + 1,
        );

      if (isAlreadyOrdered) {
        return;
      }

      const maximumPosition =
        existing.reduce(
          (maximum, stop) =>
            Math.max(
              maximum,
              stop.position,
            ),
          0,
        );

      const temporaryOffset =
        maximumPosition +
        existing.length +
        1;

      await transaction.execute(
        `
          UPDATE trip_stops
          SET position =
            position + ?
          WHERE day_id = ?;
        `,
        [
          temporaryOffset,
          dayId,
        ],
      );

      for (
        let index = 0;
        index < stops.length;
        index += 1
      ) {
        const stop = stops[index];

        await transaction.execute(
          `
            UPDATE trip_stops
            SET
              position = ?,
              updated_at = ?
            WHERE
              id = ?
              AND trip_id = ?
              AND day_id = ?;
          `,
          [
            index + 1,
            stop.updatedAt,
            stop.id,
            tripId,
            dayId,
          ],
        );
      }

      const reordered =
        await transaction.query<PersistedStopRow>(
          `
            SELECT
              id,
              trip_id,
              day_id,
              position
            FROM trip_stops
            WHERE day_id = ?
            ORDER BY position ASC;
          `,
          [dayId],
        );

      if (
        !stops.every(
          (stop, index) =>
            reordered[index]?.id ===
              stop.id &&
            reordered[index]
              .position ===
              index + 1,
        )
      ) {
        throw new Error(
          'TripStop reorder did not produce the requested order',
        );
      }
    },
  );
}
