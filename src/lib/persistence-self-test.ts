import type {
    Booking,
    Trip,
    TripDay,
    TripStop,
} from '@/domain/entities';

import { repositories } from '@/services/repository-registry';

const IDS = {
  trip: '__travelos_self_test_trip__',
  destination: '__travelos_self_test_destination__',
  day: '__travelos_self_test_day__',
  stop: '__travelos_self_test_stop__',
  booking: '__travelos_self_test_booking__',
};

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `[TravelOS self-test] ${message}`,
    );
  }
}

async function performSelfTest(): Promise<void> {
  const now = new Date().toISOString();

  const trip: Trip = {
    id: IDS.trip,
    title: 'Persistence Self Test',
    status: 'planned',

    destinations: [
      {
        id: IDS.destination,
        name: 'Athens',
        countryCode: 'GR',
        currencyCode: 'EUR',
      },
    ],

    startDate: '2026-09-01',
    endDate: '2026-09-03',

    travelerIds: [],

    accountingCurrency: 'EUR',

    createdAt: now,
    updatedAt: now,
  };

  const day: TripDay = {
    id: IDS.day,
    tripId: IDS.trip,

    date: '2026-09-01',
    dayNumber: 1,

    title: 'Arrival',

    createdAt: now,
    updatedAt: now,
  };

  const stop: TripStop = {
    id: IDS.stop,
    tripId: IDS.trip,
    dayId: IDS.day,

    title: 'Acropolis',
    type: 'place',
    order: 1,

    location: {
      name: 'Acropolis of Athens',
      latitude: 37.9715,
      longitude: 23.7257,
    },

    startTime: '10:00',

    createdAt: now,
    updatedAt: now,
  };

  const booking: Booking = {
    id: IDS.booking,
    tripId: IDS.trip,
    stopId: IDS.stop,

    type: 'ticket',
    status: 'confirmed',

    title: 'Acropolis Ticket',

    amount: 30,
    currencyCode: 'EUR',
    isPaid: true,

    createdAt: now,
    updatedAt: now,
  };

  try {
    // Clean any residue from a previous interrupted test.
    await repositories.trip.delete(IDS.trip);

    // CREATE
    await repositories.trip.save(trip);
    await repositories.trip.saveDay(day);
    await repositories.trip.saveStop(stop);
    await repositories.booking.save(booking);

    // READ
    const storedTrip =
      await repositories.trip.getById(IDS.trip);

    const days =
      await repositories.trip.getDays(IDS.trip);

    const stops =
      await repositories.trip.getStops(IDS.trip);

    const bookings =
      await repositories.booking.getByTripId(
        IDS.trip,
      );

    assert(
      storedTrip?.title === trip.title,
      'Trip create/read failed',
    );

    assert(
      days.length === 1 &&
        days[0].id === IDS.day,
      'TripDay create/read failed',
    );

    assert(
      stops.length === 1 &&
        stops[0].id === IDS.stop,
      'TripStop create/read failed',
    );

    assert(
      bookings.length === 1 &&
        bookings[0].id === IDS.booking,
      'Booking create/read failed',
    );

    // UPDATE
    await repositories.trip.save({
      ...trip,
      title: 'Persistence Self Test Updated',
      updatedAt: new Date().toISOString(),
    });

    await repositories.booking.save({
      ...booking,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    });

    const updatedTrip =
      await repositories.trip.getById(IDS.trip);

    const updatedBooking =
      await repositories.booking.getById(
        IDS.booking,
      );

    assert(
      updatedTrip?.title ===
        'Persistence Self Test Updated',
      'Trip update failed',
    );

    assert(
      updatedBooking?.status === 'completed',
      'Booking update failed',
    );

    // DELETE booking
    await repositories.booking.delete(
      IDS.booking,
    );

    const deletedBooking =
      await repositories.booking.getById(
        IDS.booking,
      );

    assert(
      deletedBooking === null,
      'Booking delete failed',
    );

    // DELETE trip + cascade
    await repositories.trip.delete(IDS.trip);

    const deletedTrip =
      await repositories.trip.getById(IDS.trip);

    const remainingDays =
      await repositories.trip.getDays(IDS.trip);

    const remainingStops =
      await repositories.trip.getStops(IDS.trip);

    assert(
      deletedTrip === null,
      'Trip delete failed',
    );

    assert(
      remainingDays.length === 0,
      'TripDay cascade delete failed',
    );

    assert(
      remainingStops.length === 0,
      'TripStop cascade delete failed',
    );
  } finally {
    await repositories.trip.delete(IDS.trip);
  }
}

let selfTestPromise: Promise<void> | null = null;

export function runPersistenceSelfTestOnce(): Promise<void> {
  if (!selfTestPromise) {
    selfTestPromise = performSelfTest().catch(
      (error: unknown) => {
        selfTestPromise = null;

        throw error;
      },
    );
  }

  return selfTestPromise;
}
