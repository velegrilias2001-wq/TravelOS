import type {
  DiscoverBrief,
  DiscoverDestination,
  SavedPlace,
  SavedPlaceKind,
} from '@/domain/entities';
import type {
  SavedPlaceRepository,
} from '@/domain/repositories';

import {
  normalizeDiscoverBrief,
} from './discover-brief';

import {
  findGroundedDiscoverRecord,
} from './discover-explain';

import {
  buildDiscoverJourneyBrief,
  buildDiscoverJourneyTripPrefill,
  findDiscoverJourney,
} from './discover-journeys';

import {
  buildDiscoverTripPrefill,
  type DiscoverTripPrefill,
} from './discover-trip-handoff';

export interface SavedPlaceRepositories {
  savedPlaces: SavedPlaceRepository;
}

export interface SavePlaceInput {
  kind: SavedPlaceKind;
  groundedIdentity: string;
}

export interface SavedPlaceListing {
  place: SavedPlace;
  title: string;
  detail: string;
  available: boolean;
  kind: SavedPlaceKind;
  destination?: DiscoverDestination;
}

function assertGroundedCandidate(
  input: SavePlaceInput,
): void {
  if (input.kind === 'destination') {
    const record = findGroundedDiscoverRecord(
      input.groundedIdentity,
    );

    if (!record) {
      throw new Error(
        'Saved ideas can only keep grounded catalogue destinations.',
      );
    }

    return;
  }

  const journey = findDiscoverJourney(
    input.groundedIdentity,
  );

  if (!journey) {
    throw new Error(
      'Saved ideas can only keep grounded catalogue journeys.',
    );
  }
}

function listingFor(
  place: SavedPlace,
): SavedPlaceListing {
  if (place.kind === 'destination') {
    const record = findGroundedDiscoverRecord(
      place.groundedIdentity,
    );

    if (!record) {
      return {
        place,
        title: place.groundedIdentity,
        detail: 'No longer in the catalogue',
        available: false,
        kind: place.kind,
      };
    }

    return {
      place,
      title: record.destination.name,
      detail: record.destination.countryCode
        ? `Catalogue destination · ${record.destination.countryCode}`
        : 'Catalogue destination',
      available: true,
      kind: place.kind,
      destination: record.destination,
    };
  }

  const journey = findDiscoverJourney(
    place.groundedIdentity,
  );

  if (!journey) {
    return {
      place,
      title: place.groundedIdentity,
      detail: 'No longer in the catalogue',
      available: false,
      kind: place.kind,
    };
  }

  return {
    place,
    title: journey.title,
    detail: `Journey idea · ${journey.destinations
      .map((destination) => destination.name)
      .join(' · ')}`,
    available: true,
    kind: place.kind,
    destination: journey.destinations[0],
  };
}

export class SavedPlaceService {
  constructor(
    private readonly repo: SavedPlaceRepositories,
    private readonly createId: () => string,
    private readonly now: () => string =
      () => new Date().toISOString(),
  ) {}

  async list(): Promise<SavedPlaceListing[]> {
    const places = await this.repo.savedPlaces.list();

    return places.map(listingFor);
  }

  async isSaved(
    groundedIdentity: string,
  ): Promise<boolean> {
    const existing =
      await this.repo.savedPlaces.getByIdentity(
        groundedIdentity,
      );

    return existing !== null;
  }

  async savedIdentities(): Promise<string[]> {
    const places = await this.repo.savedPlaces.list();

    return places.map(
      (place) => place.groundedIdentity,
    );
  }

  async save(
    input: SavePlaceInput,
  ): Promise<SavedPlace> {
    assertGroundedCandidate(input);

    const existing =
      await this.repo.savedPlaces.getByIdentity(
        input.groundedIdentity,
      );

    if (existing) {
      return existing;
    }

    const timestamp = this.now();

    const place: SavedPlace = {
      id: this.createId(),
      kind: input.kind,
      groundedIdentity: input.groundedIdentity,
      source: 'curated',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.repo.savedPlaces.save(place);

    return place;
  }

  async remove(
    groundedIdentity: string,
  ): Promise<void> {
    const existing =
      await this.repo.savedPlaces.getByIdentity(
        groundedIdentity,
      );

    if (!existing) {
      return;
    }

    await this.repo.savedPlaces.delete(existing.id);
  }

  async toggle(
    input: SavePlaceInput,
  ): Promise<boolean> {
    const existing =
      await this.repo.savedPlaces.getByIdentity(
        input.groundedIdentity,
      );

    if (existing) {
      await this.repo.savedPlaces.delete(existing.id);
      return false;
    }

    await this.save(input);
    return true;
  }
}

export function buildSavedPlaceBrief(
  listing: SavedPlaceListing,
): DiscoverBrief | null {
  if (!listing.available || !listing.destination) {
    return null;
  }

  if (listing.kind === 'journey') {
    const journey = findDiscoverJourney(
      listing.place.groundedIdentity,
    );

    if (!journey) {
      return null;
    }

    return buildDiscoverJourneyBrief(journey);
  }

  return normalizeDiscoverBrief({
    mode: 'find_destination',
    destination: listing.destination,
    interests: [],
  });
}

export function buildSavedPlaceTripPrefill(
  listing: SavedPlaceListing,
): DiscoverTripPrefill | null {
  const brief = buildSavedPlaceBrief(listing);

  if (!brief || !listing.destination) {
    return null;
  }

  if (listing.kind === 'journey') {
    const journey = findDiscoverJourney(
      listing.place.groundedIdentity,
    );

    if (!journey) {
      return null;
    }

    return buildDiscoverJourneyTripPrefill(journey);
  }

  return buildDiscoverTripPrefill(
    brief,
    listing.destination,
  );
}
