import { Tabs } from 'expo-router';

export default function TripSpaceLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today' }}
      />

      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan' }}
      />

      <Tabs.Screen
        name="map"
        options={{ title: 'Map' }}
      />

      <Tabs.Screen
        name="bookings"
        options={{ title: 'Bookings' }}
      />

      <Tabs.Screen
        name="more"
        options={{ title: 'More' }}
      />
    </Tabs>
  );
}