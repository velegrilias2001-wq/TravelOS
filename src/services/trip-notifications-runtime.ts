import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  loadNotificationPreferences,
} from '@/data/repositories/notification-preferences-persistence';
import { tripService } from '@/services/trip-service';
import {
  planStopStartReminders,
  STOP_REMINDER_IDENTIFIER_PREFIX,
  type PlannedStopReminder,
} from '@/services/trip-notifications';

const ANDROID_CHANNEL_ID = 'trip-reminders';

let handlerConfigured = false;
let reconcileInFlight: Promise<void> | null =
  null;

function ensureNotificationHandler(): void {
  if (handlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  handlerConfigured = true;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    ANDROID_CHANNEL_ID,
    {
      name: 'Trip reminders',
      importance:
        Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#1F4B45',
    },
  );
}

export async function getNotificationPermissionGranted(): Promise<boolean> {
  const permissions =
    await Notifications.getPermissionsAsync();
  return Boolean(permissions.granted);
}

export async function requestNotificationPermissionGranted(): Promise<boolean> {
  ensureNotificationHandler();
  await ensureAndroidChannel();

  const current =
    await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const requested =
    await Notifications.requestPermissionsAsync();

  return Boolean(requested.granted);
}

async function cancelTravelOSStopReminders(): Promise<void> {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter((item) =>
        item.identifier.startsWith(
          STOP_REMINDER_IDENTIFIER_PREFIX,
        ),
      )
      .map((item) =>
        Notifications.cancelScheduledNotificationAsync(
          item.identifier,
        ),
      ),
  );
}

async function scheduleReminders(
  reminders: PlannedStopReminder[],
): Promise<void> {
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: {
        title: reminder.title,
        body: reminder.body,
        data: {
          tripId: reminder.tripId,
          stopId: reminder.stopId,
          kind: 'stop_start_reminder',
        },
        ...(Platform.OS === 'android'
          ? { channelId: ANDROID_CHANNEL_ID }
          : {}),
      },
      trigger: {
        type: Notifications
          .SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
      },
    });
  }
}

/**
 * Reconcile local stop-start reminders from SQLite truth.
 * Fail closed when disabled, permission denied, or timezone unknown.
 */
export async function reconcileTripNotifications(
  now: Date = new Date(),
): Promise<void> {
  if (reconcileInFlight) {
    return reconcileInFlight;
  }

  reconcileInFlight = (async () => {
    try {
      ensureNotificationHandler();

      const preferences =
        await loadNotificationPreferences();

      if (!preferences.enabled) {
        await cancelTravelOSStopReminders();
        return;
      }

      const permission =
        await Notifications.getPermissionsAsync();

      if (!permission.granted) {
        await cancelTravelOSStopReminders();
        return;
      }

      await ensureAndroidChannel();
      await cancelTravelOSStopReminders();

      const trips = await tripService.listTrips();
      const schedulableTrips = trips.filter(
        (trip) =>
          trip.status !== 'completed' &&
          trip.status !== 'archived',
      );

      const planned: PlannedStopReminder[] = [];

      for (const trip of schedulableTrips) {
        const workspace =
          await tripService.getWorkspace(trip.id);

        if (!workspace) {
          continue;
        }

        planned.push(
          ...planStopStartReminders({
            trip: workspace.trip,
            days: workspace.days,
            destinations:
              workspace.trip.destinations,
            stops: workspace.stops,
            livedStates: workspace.stopLivedStates,
            now,
            leadMinutes: preferences.leadMinutes,
          }),
        );
      }

      planned.sort(
        (left, right) =>
          left.fireAt.getTime() -
          right.fireAt.getTime(),
      );

      await scheduleReminders(
        planned.slice(0, 40),
      );
    } catch (error) {
      if (__DEV__) {
        console.warn(
          '[TravelOS] Notification reconcile failed',
          error,
        );
      }
    } finally {
      reconcileInFlight = null;
    }
  })();

  return reconcileInFlight;
}
