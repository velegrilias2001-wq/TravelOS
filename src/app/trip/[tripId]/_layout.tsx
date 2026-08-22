import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import {
  colors,
  fontFamily,
  fontSize,
  shadows,
} from '@/theme';

export default function TripSpaceLayout() {
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
          title: 'Today',
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
    </Tabs>
  );
}