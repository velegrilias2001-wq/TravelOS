import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';

import type {
  SavedPlaceListing,
} from '@/services/saved-place-service';

import {
  buildSavedPlaceBrief,
  buildSavedPlaceTripPrefill,
} from '@/services/saved-place-service';

import {
  savedPlaceService,
} from '@/services/saved-place-runtime';

import {
  serializeDiscoverTripPrefill,
} from '@/services/discover-trip-handoff';

import {
  useDiscoverStore,
} from '@/store/discover-store';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

export default function DiscoverSavedScreen() {
  const router = useRouter();
  const setBrief = useDiscoverStore(
    (state) => state.setBrief,
  );
  const [listings, setListings] = useState<
    SavedPlaceListing[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const next = await savedPlaceService.list();
    setListings(next);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        try {
          const next = await savedPlaceService.list();

          if (active) {
            setListings(next);
            setLoaded(true);
          }
        } catch (error) {
          console.error(
            '[DiscoverSaved] load failed:',
            error,
          );

          if (active) {
            setLoaded(true);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  const openTrip = (listing: SavedPlaceListing) => {
    const brief = buildSavedPlaceBrief(listing);
    const prefill = buildSavedPlaceTripPrefill(listing);

    if (!brief || !prefill) {
      return;
    }

    setBrief(brief);

    router.push({
      pathname: '/new-trip',
      params: serializeDiscoverTripPrefill(prefill),
    });
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={colors.brand}
          />
        </Pressable>

        <Text style={styles.eyebrow}>
          DISCOVER
        </Text>

        <Text style={styles.title}>
          Saved ideas
        </Text>

        <Text style={styles.subtitle}>
          These are candidates you chose to keep. They are not trips, not visited places, and not a plan until you confirm Create Trip.
        </Text>
      </View>

      {!loaded ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyBody}>
            Loading saved ideas…
          </Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEyebrow}>
            NOTHING SAVED YET
          </Text>

          <Text style={styles.emptyTitle}>
            Keep a destination or journey idea here
          </Text>

          <Text style={styles.emptyBody}>
            Saving an idea does not create a trip and does not appear as travel history.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {listings.map((listing) => (
            <SavedIdeaCard
              key={listing.place.id}
              listing={listing}
              onRemove={async () => {
                await savedPlaceService.remove(
                  listing.place.groundedIdentity,
                );
                await reload();
              }}
              onMakeTrip={() => openTrip(listing)}
            />
          ))}
        </View>
      )}

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function SavedIdeaCard({
  listing,
  onRemove,
  onMakeTrip,
}: {
  listing: SavedPlaceListing;
  onRemove(): Promise<void>;
  onMakeTrip(): void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>
        {listing.kind === 'journey'
          ? 'JOURNEY IDEA'
          : 'CATALOGUE DESTINATION'}
      </Text>

      <Text style={styles.cardTitle}>
        {listing.title}
      </Text>

      <Text style={styles.cardDetail}>
        {listing.detail}
      </Text>

      {listing.available ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Make ${listing.title} a trip`}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={onMakeTrip}
        >
          <View>
            <Text style={styles.primaryButtonEyebrow}>
              MAKE IT A TRIP
            </Text>

            <Text style={styles.primaryButtonText}>
              Open Create Trip with this idea
            </Text>
          </View>

          <Ionicons
            name="arrow-forward"
            size={21}
            color={colors.textInverse}
          />
        </Pressable>
      ) : (
        <Text style={styles.unavailable}>
          This idea can no longer be confirmed because it is not in the catalogue.
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${listing.title} from saved ideas`}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
        onPress={() => {
          void onRemove();
        }}
      >
        <Text style={styles.secondaryButtonText}>
          Remove from saved ideas
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing[4],
    marginBottom: spacing[6],
  },

  backButton: {
    width: 42,
    height: 42,
    marginBottom: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.8,
    color: colors.brass,
  },

  title: {
    maxWidth: 470,
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    color: colors.textPrimary,
  },

  subtitle: {
    maxWidth: 470,
    marginTop: spacing[3],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  list: {
    gap: spacing[3],
  },

  card: {
    gap: spacing[2],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  cardEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.brass,
  },

  cardTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  cardDetail: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  emptyCard: {
    padding: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: colors.tealSoft,
  },

  emptyEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.teal,
  },

  emptyTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  emptyBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  primaryButton: {
    minHeight: 64,
    marginTop: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    ...shadows.card,
  },

  primaryButtonEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.3,
    color: '#D5B887',
  },

  primaryButtonText: {
    marginTop: 2,
    maxWidth: 260,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },

  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.brand,
  },

  unavailable: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  pressed: {
    opacity: 0.84,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
