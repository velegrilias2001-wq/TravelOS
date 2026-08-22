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

        const version =
          await travelOSDatabase.queryFirst<{ user_version: number }>(
            'PRAGMA user_version;'
          );

        const accommodationColumns =
          await travelOSDatabase.query<{ name: string }>(
            'PRAGMA table_info(accommodations);'
          );

        const hasStopId = accommodationColumns.some(
          (column) => column.name === 'stop_id'
        );

        console.log('[TravelOS] SQLite ready: true');
        console.log(
          '[TravelOS] Database version:',
          version?.user_version
        );
        console.log(
          '[TravelOS] accommodations.stop_id:',
          hasStopId
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