import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { buildTripShareSnapshot } from './trip-share-snapshot';
import type { Trip } from '@/domain/entities/trip';
import type { TripDay } from '@/domain/entities/trip-day';
import type { TripStop } from '@/domain/entities/trip-stop';
import type { Booking } from '@/domain/entities/booking';
import type { Accommodation } from '@/domain/entities/accommodation';

export async function shareTripSnapshot(input: {
  trip: Trip;
  days: readonly TripDay[];
  stops: readonly TripStop[];
  bookings: readonly Booking[];
  accommodations: readonly Accommodation[];
  packingTotal?: number;
  packingPacked?: number;
}): Promise<'shared' | 'saved' | 'unavailable'> {
  const snapshot = buildTripShareSnapshot(input);

  if (!FileSystem.documentDirectory) {
    throw new Error('Share directory unavailable');
  }

  const directory = `${FileSystem.documentDirectory}travelos/exports/`;
  await FileSystem.makeDirectoryAsync(directory, {
    intermediates: true,
  });

  const path = `${directory}${snapshot.fileName}`;
  await FileSystem.writeAsStringAsync(path, snapshot.text, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    return 'saved';
  }

  await Sharing.shareAsync(path, {
    mimeType: 'text/plain',
    dialogTitle: `Share ${snapshot.title}`,
    UTI: 'public.plain-text',
  });

  return 'shared';
}
