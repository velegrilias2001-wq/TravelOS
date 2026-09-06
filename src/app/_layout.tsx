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
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { travelOSDatabase } from '@/data/database/expo-sqlite-database';
import { runPersistenceSelfTestOnce } from '@/lib/persistence-self-test';
import { reconcileTripNotifications } from '@/services/trip-notifications-runtime';
import { useTripStore } from '@/store/trip-store';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [
    bootstrapStatus,
    setBootstrapStatus,
  ] = useState<
    'loading' | 'ready' | 'error'
  >('loading');

  const [
    bootstrapAttempt,
    setBootstrapAttempt,
  ] = useState(0);

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
    let active = true;

    const bootstrap = async () => {
      setBootstrapStatus('loading');

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

        void reconcileTripNotifications();

        console.log(
          '[TravelOS] Bootstrap ready',
        );

        if (active) {
          setBootstrapStatus('ready');
        }
      } catch (error) {
        console.error(
          '[TravelOS] Bootstrap failed:',
          error,
        );

        if (active) {
          setBootstrapStatus('error');
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [bootstrapAttempt]);

  useEffect(() => {
    if (
      bootstrapStatus !== 'loading' &&
      (fontsLoaded || fontError)
    ) {
      void SplashScreen.hideAsync();
    }
  }, [
    bootstrapStatus,
    fontsLoaded,
    fontError,
  ]);

  useEffect(() => {
    if (bootstrapStatus !== 'ready') {
      return;
    }

    const subscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          void reconcileTripNotifications();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [bootstrapStatus]);

  if (
    bootstrapStatus === 'loading' ||
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
      {bootstrapStatus === 'error' ? (
        <BootstrapErrorState
          onRetry={() => {
            setBootstrapAttempt(
              (attempt) => attempt + 1,
            );
          }}
        />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />

          <Stack.Screen
            name="discover/find-destination"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="discover/results"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="import/index"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="import/review/[batchId]"
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="new-trip"
            options={{
              presentation: 'card',
            }}
          />

          <Stack.Screen
            name="travel-chat"
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
      )}
    </ThemeProvider>
  );
}

function BootstrapErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <View style={styles.bootstrapScreen}>
      <Text style={styles.bootstrapEyebrow}>
        TRAVEL OS
      </Text>

      <Text style={styles.bootstrapTitle}>
        Your travel data couldn&apos;t be opened.
      </Text>

      <Text style={styles.bootstrapBody}>
        Nothing has been changed. Try opening your local travel data again.
      </Text>

      <Pressable
        style={styles.bootstrapButton}
        onPress={onRetry}
      >
        <Text
          style={styles.bootstrapButtonText}
        >
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bootstrapScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    backgroundColor: colors.background,
  },

  bootstrapEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
  },

  bootstrapTitle: {
    maxWidth: 340,
    marginTop: spacing[4],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  bootstrapBody: {
    maxWidth: 330,
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  bootstrapButton: {
    minWidth: 180,
    height: 52,
    marginTop: spacing[7],
    paddingHorizontal: spacing[6],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },

  bootstrapButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textInverse,
  },
});
