import { Tabs } from 'expo-router';

import {
  useTravelOSTabBarLabelStyle,
  useTravelOSTabBarStyle,
} from '@/features/navigation/use-travelos-tab-bar-style';
import { TabBarIcon } from '@/features/motion/tab-bar-icon';
import { colors } from '@/theme';

export default function MainTabsLayout() {
  const tabBarStyle = useTravelOSTabBarStyle();
  const tabBarLabelStyle = useTravelOSTabBarLabelStyle();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,

        tabBarLabelStyle,
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarStyle,
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
            <TabBarIcon
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              size={22}
              color={color}
              focused={focused}
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
            <TabBarIcon
              name={
                focused
                  ? 'map'
                  : 'map-outline'
              }
              size={22}
              color={color}
              focused={focused}
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
            <TabBarIcon
              name={
                focused
                  ? 'compass'
                  : 'compass-outline'
              }
              size={23}
              color={color}
              focused={focused}
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
            <TabBarIcon
              name={
                focused
                  ? 'earth'
                  : 'earth-outline'
              }
              size={22}
              color={color}
              focused={focused}
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
            <TabBarIcon
              name={
                focused
                  ? 'person'
                  : 'person-outline'
              }
              size={22}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
