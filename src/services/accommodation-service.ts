import * as Crypto from 'expo-crypto';

import type {
  Accommodation,
  AccommodationId,
  TripId,
} from '@/domain/entities';

import {
  cleanAccommodationInput,
  type AccommodationInput,
  validateAccommodationRelationships,
} from './accommodation-details';
import {
  repositories,
  type RepositoryRegistry,
} from './repository-registry';

export class AccommodationService {
  constructor(
    private readonly repo:
      RepositoryRegistry = repositories,
    private readonly createId: () => string =
      () => Crypto.randomUUID(),
    private readonly now: () => string =
      () => new Date().toISOString(),
  ) {}

  async addAccommodation(
    tripId: TripId,
    input: AccommodationInput,
  ): Promise<void> {
    await this.requireTrip(tripId);

    const cleanInput = cleanAccommodationInput(input);

    await this.validateLinks(
      tripId,
      cleanInput,
    );

    const timestamp = this.now();
    const accommodation: Accommodation = {
      id: this.createId(),
      tripId,
      ...cleanInput,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.repo.accommodation.save(
      accommodation,
    );
  }

  async updateAccommodation(
    tripId: TripId,
    accommodationId: AccommodationId,
    input: AccommodationInput,
  ): Promise<void> {
    const existing =
      await this.requireAccommodation(
        tripId,
        accommodationId,
      );
    const cleanInput = cleanAccommodationInput(input);

    await this.validateLinks(
      tripId,
      cleanInput,
    );

    await this.repo.accommodation.save({
      ...existing,
      ...cleanInput,
      updatedAt: this.now(),
    });
  }

  async deleteAccommodation(
    tripId: TripId,
    accommodationId: AccommodationId,
  ): Promise<void> {
    await this.requireAccommodation(
      tripId,
      accommodationId,
    );

    await this.repo.accommodation.delete(
      accommodationId,
    );
  }

  private async requireTrip(
    tripId: TripId,
  ): Promise<void> {
    const trip = await this.repo.trip.getById(
      tripId,
    );

    if (!trip) {
      throw new Error('Trip was not found');
    }
  }

  private async requireAccommodation(
    tripId: TripId,
    accommodationId: AccommodationId,
  ): Promise<Accommodation> {
    const accommodation =
      await this.repo.accommodation.getById(
        accommodationId,
      );

    if (
      !accommodation ||
      accommodation.tripId !== tripId
    ) {
      throw new Error(
        'Accommodation was not found in this trip',
      );
    }

    return accommodation;
  }

  private async validateLinks(
    tripId: TripId,
    input: AccommodationInput,
  ): Promise<void> {
    const [booking, stop] = await Promise.all([
      input.bookingId
        ? this.repo.booking.getById(
            input.bookingId,
          )
        : Promise.resolve(null),
      input.stopId
        ? this.repo.trip.getStopById(
            input.stopId,
          )
        : Promise.resolve(null),
    ]);

    validateAccommodationRelationships(
      tripId,
      input,
      booking,
      stop,
    );
  }
}

export const accommodationService =
  new AccommodationService();
