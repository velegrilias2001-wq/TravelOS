import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';

import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { travelOSDatabase } from '@/data/database/expo-sqlite-database';
import { runPersistenceSelfTestOnce } from '@/lib/persistence-self-test';
import { useTripStore } from '@/store/trip-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [databaseReady, setDatabaseReady] =
    useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,

    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

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

        await useTripStore
          .getState()
          .loadTrips();

        console.log(
          '[TravelOS] Bootstrap ready',
        );
      } catch (error) {
        console.error(
          '[TravelOS] Bootstrap failed:',
          error,
        );
      } finally {
        setDatabaseReady(true);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (
      databaseReady &&
      (fontsLoaded || fontError)
    ) {
      void SplashScreen.hideAsync();
    }
  }, [
    databaseReady,
    fontsLoaded,
    fontError,
  ]);

  if (
    !databaseReady ||
    (!fontsLoaded && !fontError)
  ) {
    return null;
  }

  return (
    <ThemeProvider
      value={
        colorScheme === 'dark'
          ? DarkTheme
          : DefaultTheme
      }
    >
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="new-trip"
          options={{
            presentation: 'card',
          }}
        />
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