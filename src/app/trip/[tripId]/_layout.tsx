import { Ionicons } from '@expo/vector-icons';

import {
  Tabs,
  useLocalSearchParams,
} from 'expo-router';

import {
  TripWorkspaceProvider,
} from '@/features/trip-workspace/trip-workspace-context';
import {
  colors,
  fontFamily,
  fontSize,
  shadows,
} from '@/theme';

export default function TripSpaceLayout() {
  const { tripId: routeTripId } =
    useLocalSearchParams<{
      tripId?: string | string[];
    }>();

  const tripId =
    typeof routeTripId === 'string' &&
    routeTripId.trim()
      ? routeTripId
      : null;

  return (
    <TripWorkspaceProvider tripId={tripId}>
      {tripId ? (
        <TripSpaceTabs tripId={tripId} />
      ) : null}
    </TripWorkspaceProvider>
  );
}

function TripSpaceTabs({
  tripId,
}: {
  tripId: string;
}) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,

        tabBarLabelStyle: {
          fontFamily: fontFamily.sansMedium,
          fontSize: fontSize.micro,
          marginTop: 2,
        },

        tabBarStyle: {
          height: 74,
          paddingTop: 8,
          paddingBottom: 9,

          backgroundColor: colors.surface,

          borderTopWidth: 1,
          borderTopColor: colors.border,

          ...shadows.subtle,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Companion',

          href: {
            pathname: '/trip/[tripId]',
            params: { tripId },
          },

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'today'
                  : 'today-outline'
              }
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',

          href: {
            pathname: '/trip/[tripId]/plan',
            params: { tripId },
          },

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'calendar'
                  : 'calendar-outline'
              }
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',

          href: {
            pathname: '/trip/[tripId]/map',
            params: { tripId },
          },

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'map'
                  : 'map-outline'
              }
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',

          href: {
            pathname: '/trip/[tripId]/bookings',
            params: { tripId },
          },

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'briefcase'
                  : 'briefcase-outline'
              }
              size={21}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: 'More',

          href: {
            pathname: '/trip/[tripId]/more',
            params: { tripId },
          },

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'ellipsis-horizontal-circle'
                  : 'ellipsis-horizontal-circle-outline'
              }
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="budget"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="details"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="accommodation"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="travelers"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="memories"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
