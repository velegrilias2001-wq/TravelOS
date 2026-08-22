import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { travelOSDatabase } from '@/data/database/expo-sqlite-database';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await travelOSDatabase.initialize();

        const tripsTable =
          await travelOSDatabase.queryFirst<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'trips';"
          );

        console.log(
          '[TravelOS] SQLite ready:',
          tripsTable?.name === 'trips'
        );
      } catch (error) {
        console.error(
          '[TravelOS] SQLite initialization failed:',
          error
        );
      }
    };

    initializeDatabase();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}