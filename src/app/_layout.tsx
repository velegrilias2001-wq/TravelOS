import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';

import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { travelOSDatabase } from '@/data/database/expo-sqlite-database';
import { runPersistenceSelfTestOnce } from '@/lib/persistence-self-test';
import { useTripStore } from '@/store/trip-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await travelOSDatabase.initialize();

        if (__DEV__) {
          await runPersistenceSelfTestOnce();

          console.log(
            '[TravelOS] Persistence self-test: PASS',
          );
        }

        await useTripStore.getState().loadTrips();

        console.log('[TravelOS] Bootstrap ready');

        await SplashScreen.hideAsync();
      } catch (error) {
        console.error(
          '[TravelOS] Bootstrap failed:',
          error,
        );

        await SplashScreen.hideAsync();
      }
    };

    void bootstrap();
  }, []);

  return (
    <ThemeProvider
      value={
        colorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />

        <Stack.Screen
          name="trip/[tripId]"
          options={{
            presentation: 'card',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}