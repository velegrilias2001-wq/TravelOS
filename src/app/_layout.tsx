import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';

import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import {
  AnimatedSplashOverlay,
} from '@/components/animated-icon';

import AppTabs from '@/components/app-tabs';

import {
  travelOSDatabase,
} from '@/data/database/expo-sqlite-database';

import {
  runPersistenceSelfTestOnce,
} from '@/lib/persistence-self-test';

import {
  useTripStore,
} from '@/store/trip-store';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
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
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}