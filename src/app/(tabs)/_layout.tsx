import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import {
  colors,
  fontFamily,
  fontSize,
  shadows,
} from '@/theme';

export default function MainTabsLayout() {
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
          title: 'Home',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',

          tabBarIcon: ({
            color,
            focused,
          }) => (
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
        name="discover"
        options={{
          title: 'Discover',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'compass'
                  : 'compass-outline'
              }
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="world"
        options={{
          title: 'World',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'earth'
                  : 'earth-outline'
              }
              size={23}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'person'
                  : 'person-outline'
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