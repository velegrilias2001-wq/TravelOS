import { Tabs } from 'expo-router';

export default function MainTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home' }}
      />

      <Tabs.Screen
        name="trips"
        options={{ title: 'Trips' }}
      />

      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover' }}
      />

      <Tabs.Screen
        name="world"
        options={{ title: 'World' }}
      />

      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}