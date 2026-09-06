import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LatLng,
} from 'react-native-maps';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { FadeIn } from '@/features/motion/fade-in';
import type {
  Trip,
} from '@/domain/entities';
import {
  useTripStore,
} from '@/store/trip-store';
import { tripService } from '@/services/trip-service';
import {
  filterWorldPlaces,
  selectWorldFootprintStats,
  selectWorldPlaces,
  worldPlaceCounts,
  type WorldPlace,
  type WorldPlaceContext,
  type WorldPlaceFilter,
} from '@/services/world-places';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

const EMPTY_WORLD_CONTEXT: WorldPlaceContext = {
  days: [],
  stops: [],
  livedStates: [],
  memories: [],
};

const WORLD_REGION = {
  latitude: 18,
  longitude: 8,
  latitudeDelta: 125,
  longitudeDelta: 160,
};

export default function WorldScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const trips = useTripStore(
    (state) => state.trips,
  );

  const [filter, setFilter] =
    useState<WorldPlaceFilter>('all');
  const [mapReady, setMapReady] =
    useState(false);
  const [
    selectedDestinationId,
    setSelectedDestinationId,
  ] = useState<string | null>(null);
  const [placeContext, setPlaceContext] =
    useState(EMPTY_WORLD_CONTEXT);

  const tripIds = useMemo(
    () => trips.map((trip) => trip.id).join('\0'),
    [trips],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        try {
          const loaded =
            await tripService.listWorldPlaceContext(
              trips.map((trip) => trip.id),
            );

          if (!cancelled) {
            setPlaceContext(loaded);
          }
        } catch {
          if (!cancelled) {
            setPlaceContext(EMPTY_WORLD_CONTEXT);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [tripIds, trips]),
  );

  const destinations = useMemo(
    () => selectWorldPlaces(trips, placeContext),
    [placeContext, trips],
  );

  const filteredDestinations = useMemo(
    () => filterWorldPlaces(destinations, filter),
    [destinations, filter],
  );

  const mappedDestinations = useMemo(
    () =>
      filteredDestinations.filter(
        (item) => item.mapped,
      ),
    [filteredDestinations],
  );

  const counts = useMemo(
    () => worldPlaceCounts(destinations),
    [destinations],
  );

  const footprint = useMemo(
    () => selectWorldFootprintStats(destinations),
    [destinations],
  );

  const fitMap = useCallback(() => {
    if (
      !mapReady ||
      mappedDestinations.length === 0
    ) {
      return;
    }

    const coordinates: LatLng[] =
      mappedDestinations.map((item) => ({
        latitude:
          item.destination.latitude as number,
        longitude:
          item.destination.longitude as number,
      }));

    if (coordinates.length === 1) {
      mapRef.current?.animateToRegion(
        {
          ...coordinates[0],
          latitudeDelta: 8,
          longitudeDelta: 8,
        },
        450,
      );
      return;
    }

    mapRef.current?.fitToCoordinates(
      coordinates,
      {
        animated: true,
        edgePadding: {
          top: 210,
          right: 56,
          bottom: 300,
          left: 56,
        },
      },
    );
  }, [mapReady, mappedDestinations]);

  useEffect(() => {
    fitMap();
  }, [fitMap]);

  useFocusEffect(
    useCallback(() => {
      const frame =
        requestAnimationFrame(() => {
          fitMap();
        });

      return () => {
        cancelAnimationFrame(frame);
      };
    }, [fitMap]),
  );

  const openTrip = (trip: Trip) => {
    router.push({
      pathname: '/trip/[tripId]',
      params: {
        tripId: trip.id,
      },
    });
  };

  const openDestinationDetails = (
    trip: Trip,
  ) => {
    router.push({
      pathname: '/trip/[tripId]/details',
      params: {
        tripId: trip.id,
      },
    });
  };

  const focusDestination = (
    item: WorldPlace,
  ) => {
    setSelectedDestinationId(item.id);

    if (
      !item.mapped ||
      typeof item.destination.latitude !==
        'number' ||
      typeof item.destination.longitude !==
        'number'
    ) {
      openDestinationDetails(item.trip);
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude:
          item.destination.latitude,
        longitude:
          item.destination.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      },
      400,
    );
  };

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={WORLD_REGION}
        mapType="standard"
        rotateEnabled={false}
        pitchEnabled={false}
        zoomEnabled
        scrollEnabled
        zoomControlEnabled
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onMapReady={() => setMapReady(true)}
      >
        {mappedDestinations.map((item) => (
          <Marker
            key={item.id}
            coordinate={{
              latitude:
                item.destination
                  .latitude as number,
              longitude:
                item.destination
                  .longitude as number,
            }}
            title={item.destination.name}
            description={item.trip.title}
            pinColor={
              item.kind === 'lived'
                ? colors.teal
                : colors.brass
            }
            onPress={() =>
              setSelectedDestinationId(
                item.id,
              )
            }
            onCalloutPress={() =>
              openTrip(item.trip)
            }
          />
        ))}
      </MapView>

      <SafeAreaView
        pointerEvents="box-none"
        style={styles.overlay}
      >
        <View
          style={[
            styles.headerCard,
            {
              marginTop:
                Math.max(insets.top, 0) +
                spacing[2],
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>
                YOUR WORLD
              </Text>

              <Text style={styles.title}>
                The places that make up your story.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show all mapped destinations"
              style={({ pressed }) => [
                styles.fitButton,
                pressed && styles.pressed,
              ]}
              onPress={fitMap}
            >
              <Ionicons
                name="scan-outline"
                size={20}
                color={colors.brand}
              />
            </Pressable>
          </View>

          <View style={styles.stats}>
            <Stat
              value={trips.length}
              label={
                trips.length === 1
                  ? 'trip'
                  : 'trips'
              }
            />

            <View style={styles.statDivider} />

            <Stat
              value={footprint.livedCountries}
              label={
                footprint.livedCountries === 1
                  ? 'country'
                  : 'countries'
              }
            />

            <View style={styles.statDivider} />

            <Stat
              value={counts.lived}
              label="lived"
            />

            <View style={styles.statDivider} />

            <Stat
              value={counts.planned}
              label="planned"
            />
          </View>

          <View style={styles.filters}>
            <FilterPill
              label="All"
              active={filter === 'all'}
              onPress={() => setFilter('all')}
            />

            <FilterPill
              label="Planned"
              active={filter === 'planned'}
              onPress={() =>
                setFilter('planned')
              }
            />

            <FilterPill
              label="Lived"
              active={filter === 'lived'}
              onPress={() =>
                setFilter('lived')
              }
            />
          </View>
        </View>
      </SafeAreaView>

      <View
        style={[
          styles.bottomPanel,
          {
            bottom: Math.max(
              insets.bottom + 72,
              88,
            ),
          },
        ]}
      >
        {filteredDestinations.length ===
        0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="earth-outline"
                size={23}
                color={colors.brand}
              />
            </View>

            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>
                {filter === 'lived'
                  ? 'No lived places yet.'
                  : filter === 'planned'
                    ? 'No planned places in this list.'
                    : 'Your world starts with a trip.'}
              </Text>

              <Text style={styles.emptyBody}>
                {filter === 'lived'
                  ? 'Mark a planned stop done in Companion after you are there. A completed trip is not a visit.'
                  : filter === 'planned'
                    ? 'Every saved destination on these trips already has a done stop on an assigned day.'
                    : 'Plan somewhere new and your travel world will grow from there.'}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelEyebrow}>
                  YOUR DESTINATIONS
                </Text>

                <Text style={styles.panelTitle}>
                  {filteredDestinations.length}{' '}
                  {filteredDestinations.length ===
                  1
                    ? 'place'
                    : 'places'}
                </Text>
              </View>

              {mappedDestinations.length <
              filteredDestinations.length ? (
                <Text style={styles.mapHint}>
                  {filteredDestinations.length -
                    mappedDestinations.length}{' '}
                  need map details
                </Text>
              ) : null}
            </View>

            <FadeIn factKey={`world-filter:${filter}`}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.destinationList
                }
              >
                {filteredDestinations.map(
                  (item) => (
                    <DestinationCard
                      key={item.id}
                      item={item}
                      selected={
                        item.id ===
                        selectedDestinationId
                      }
                      onPress={() =>
                        focusDestination(item)
                      }
                    />
                  ),
                )}
              </ScrollView>
            </FadeIn>
          </>
        )}
      </View>
    </View>
  );
}

function Stat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} places`}
      accessibilityState={{
        selected: active,
      }}
      style={[
        styles.filterPill,
        active && styles.filterPillActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DestinationCard({
  item,
  selected,
  onPress,
}: {
  item: WorldPlace;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        item.mapped
          ? item.archive.memoryCount > 0
            ? `Show ${item.destination.name} on the map, ${item.archive.memoryCount} ${item.archive.memoryCount === 1 ? 'memory' : 'memories'}`
            : `Show ${item.destination.name} on the map`
          : `Add map details for ${item.destination.name}`
      }
      style={({ pressed }) => [
        styles.destinationCard,
        selected &&
          styles.destinationCardSelected,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {item.archive.coverUri ? (
        <Image
          source={{ uri: item.archive.coverUri }}
          style={styles.archiveCover}
          contentFit="cover"
        />
      ) : null}
      <View style={styles.destinationCardTop}>
        <View
          style={[
            styles.destinationIcon,
            item.kind === 'lived' &&
              styles.destinationIconLived,
          ]}
        >
          <Ionicons
            name={
              item.mapped
                ? 'location'
                : 'location-outline'
            }
            size={18}
            color={
              item.kind === 'lived'
                ? colors.teal
                : colors.brand
            }
          />
        </View>

        <Ionicons
          name={
            item.mapped
              ? 'navigate-outline'
              : 'chevron-forward'
          }
          size={16}
          color={colors.textMuted}
        />
      </View>

      <Text
        numberOfLines={1}
        style={styles.destinationName}
      >
        {item.destination.name}
      </Text>

      <Text
        numberOfLines={1}
        style={styles.destinationTrip}
      >
        {item.trip.title}
      </Text>

      <View style={styles.destinationMeta}>
        <Text style={styles.destinationState}>
          {item.kind === 'lived'
            ? 'LIVED'
            : 'PLANNED'}
        </Text>

        {!item.mapped ? (
          <Text style={styles.unmapped}>
            ADD MAP
          </Text>
        ) : item.archive.memoryCount > 0 ? (
          <Text style={styles.archiveCount}>
            {item.archive.memoryCount}{' '}
            {item.archive.memoryCount === 1
              ? 'MEMORY'
              : 'MEMORIES'}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  overlay: {
    ...StyleSheet.absoluteFill,
  },

  headerCard: {
    marginHorizontal: spacing[4],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      'rgba(247,245,239,0.96)',
    ...shadows.card,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },

  headerCopy: {
    flex: 1,
  },

  eyebrow: {
    marginBottom: spacing[1],
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.6,
    color: colors.brass,
  },

  title: {
    maxWidth: 420,
    fontFamily:
      fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  fitButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontFamily:
      fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },

  statLabel: {
    marginTop: 1,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  filters: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },

  filterPill: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    borderRadius: radius.pill,
    backgroundColor:
      colors.backgroundSoft,
  },

  filterPillActive: {
    backgroundColor: colors.brand,
  },

  filterText: {
    fontFamily:
      fontFamily.sansSemiBold,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  filterTextActive: {
    color: colors.textInverse,
  },

  bottomPanel: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      'rgba(247,245,239,0.97)',
    ...shadows.card,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[3],
  },

  panelEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.brass,
  },

  panelTitle: {
    marginTop: spacing[1],
    fontFamily:
      fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    color: colors.textPrimary,
  },

  mapHint: {
    maxWidth: 120,
    textAlign: 'right',
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },

  destinationList: {
    gap: spacing[3],
    paddingRight: spacing[1],
  },

  destinationCard: {
    width: 172,
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },

  destinationCardSelected: {
    borderColor: colors.teal,
  },

  destinationCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },

  archiveCover: {
    height: 88,
    marginHorizontal: -spacing[3],
    marginTop: -spacing[3],
    marginBottom: spacing[3],
    backgroundColor: colors.tealSoft,
  },

  destinationIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.brandSoft,
  },

  destinationIconLived: {
    backgroundColor: colors.tealSoft,
  },

  destinationName: {
    fontFamily:
      fontFamily.serifSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },

  destinationTrip: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },

  destinationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginTop: spacing[3],
  },

  destinationState: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1,
    color: colors.brass,
  },

  unmapped: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 0.9,
    color: colors.teal,
  },

  archiveCount: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 0.9,
    color: colors.teal,
  },

  emptyState: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.brandSoft,
  },

  emptyCopy: {
    flex: 1,
  },

  emptyTitle: {
    fontFamily:
      fontFamily.serifSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },

  emptyBody: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },

  pressed: {
    opacity: 0.84,
  },
});
