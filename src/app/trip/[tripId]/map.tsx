import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

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

import MapView, {
  Marker,
  type LatLng,
  type Region,
} from 'react-native-maps';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type {
  TripStop,
} from '@/domain/entities';

import {
  tripService,
  type TripWorkspace,
} from '@/services/trip-service';

import {
  colors,
  fontFamily,
  fontSize,
  radius,
  shadows,
  spacing,
} from '@/theme';

interface MappedStop {
  stop: TripStop;
  coordinate: LatLng;
}

const WORLD_REGION: Region = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 100,
  longitudeDelta: 100,
};

export default function TripMapScreen() {
  const { tripId } =
    useLocalSearchParams<{
      tripId: string;
    }>();

  const insets =
    useSafeAreaInsets();

  const mapRef =
    useRef<MapView | null>(
      null,
    );

  const [
    workspace,
    setWorkspace,
  ] =
    useState<TripWorkspace | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const loadWorkspace =
    useCallback(
      async () => {
        if (!tripId) {
          return;
        }

        try {
          setIsLoading(true);

          const result =
            await tripService.getWorkspace(
              tripId,
            );

          setWorkspace(
            result,
          );
        } catch (error) {
          console.error(
            '[Map] Load error:',
            error,
          );
        } finally {
          setIsLoading(false);
        }
      },
      [tripId],
    );

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const mappedStops =
    useMemo<MappedStop[]>(
      () => {
        if (!workspace) {
          return [];
        }

        return workspace.stops
          .filter(
            (
              stop,
            ): stop is TripStop & {
              location: NonNullable<
                TripStop['location']
              > & {
                latitude: number;
                longitude: number;
              };
            } =>
              typeof stop.location
                ?.latitude ===
                'number' &&
              typeof stop.location
                ?.longitude ===
                'number',
          )
          .map((stop) => ({
            stop,

            coordinate: {
              latitude:
                stop.location
                  .latitude,

              longitude:
                stop.location
                  .longitude,
            },
          }));
      },
      [workspace],
    );

  const destinationCoordinate =
    useMemo<LatLng | null>(
      () => {
        const destination =
          workspace?.trip
            .destinations[0];

        if (
          !destination ||
          typeof destination.latitude !==
            'number' ||
          typeof destination.longitude !==
            'number'
        ) {
          return null;
        }

        return {
          latitude:
            destination.latitude,

          longitude:
            destination.longitude,
        };
      },
      [workspace],
    );

  const allCoordinates =
    useMemo<LatLng[]>(
      () => {
        const coordinates =
          mappedStops.map(
            (item) =>
              item.coordinate,
          );

        if (
          destinationCoordinate
        ) {
          coordinates.unshift(
            destinationCoordinate,
          );
        }

        return coordinates;
      },
      [
        destinationCoordinate,
        mappedStops,
      ],
    );

  const initialRegion =
    useMemo<Region>(
      () => {
        const first =
          allCoordinates[0];

        if (!first) {
          return WORLD_REGION;
        }

        return {
          ...first,

          latitudeDelta:
            0.15,

          longitudeDelta:
            0.15,
        };
      },
      [allCoordinates],
    );

  const fitMap =
    useCallback(() => {
      if (
        !mapRef.current ||
        allCoordinates.length ===
          0
      ) {
        return;
      }

      if (
        allCoordinates.length ===
        1
      ) {
        mapRef.current.animateToRegion(
          {
            ...allCoordinates[0],

            latitudeDelta:
              0.08,

            longitudeDelta:
              0.08,
          },
          500,
        );

        return;
      }

      mapRef.current.fitToCoordinates(
        allCoordinates,
        {
          animated: true,

          edgePadding: {
            top: 150,
            right: 60,
            bottom: 220,
            left: 60,
          },
        },
      );
    }, [allCoordinates]);

  const focusStop = (
    item: MappedStop,
  ) => {
    mapRef.current?.animateToRegion(
      {
        ...item.coordinate,

        latitudeDelta:
          0.025,

        longitudeDelta:
          0.025,
      },
      450,
    );
  };

  if (
    isLoading ||
    !workspace
  ) {
    return (
      <View
        style={styles.loadingScreen}
      >
        <Text
          style={styles.loadingText}
        >
          Preparing your map…
        </Text>
      </View>
    );
  }

  const destinationName =
    workspace.trip
      .destinations[0]
      ?.name ??
    'Your trip';

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          initialRegion
        }
        onMapReady={fitMap}
        showsCompass
        showsScale
        toolbarEnabled={false}
        moveOnMarkerPress
      >
        {destinationCoordinate && (
          <Marker
            coordinate={
              destinationCoordinate
            }
            title={
              destinationName
            }
            description="Trip destination"
            pinColor={
              colors.brass
            }
          />
        )}

        {mappedStops.map(
          ({ stop, coordinate }) => (
            <Marker
              key={stop.id}
              coordinate={
                coordinate
              }
              title={stop.title}
              description={
                stop.startTime
                  ? `${stop.startTime} · ${stop.type}`
                  : stop.type
              }
            />
          ),
        )}
      </MapView>

      <View
        pointerEvents="box-none"
        style={[
          styles.headerWrap,
          {
            paddingTop:
              insets.top +
              spacing[2],
          },
        ]}
      >
        <View
          style={styles.header}
        >
          <View
            style={
              styles.headerCopy
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              TRIP MAP
            </Text>

            <Text
              numberOfLines={1}
              style={
                styles.title
              }
            >
              {destinationName}
            </Text>
          </View>

          <Pressable
            style={
              styles.fitButton
            }
            onPress={fitMap}
          >
            <Ionicons
              name="scan-outline"
              size={21}
              color={
                colors.brand
              }
            />
          </Pressable>
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.bottomWrap,
          {
            paddingBottom:
              Math.max(
                insets.bottom,
                spacing[3],
              ),
          },
        ]}
      >
        {mappedStops.length ===
        0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <View
              style={
                styles.emptyTop
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="map-outline"
                  size={23}
                  color={
                    colors.teal
                  }
                />
              </View>

              <View
                style={
                  styles.emptyCopy
                }
              >
                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No mapped places
                  yet
                </Text>

                <Text
                  style={
                    styles.emptyBody
                  }
                >
                  Your itinerary is
                  ready. Locations
                  will appear here
                  as soon as they
                  have real map
                  coordinates.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.truthRow
              }
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={
                  colors.teal
                }
              />

              <Text
                style={
                  styles.truthText
                }
              >
                No guessed
                locations
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View
              style={
                styles.mapSummary
              }
            >
              <View>
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  ON YOUR MAP
                </Text>

                <Text
                  style={
                    styles.summaryValue
                  }
                >
                  {
                    mappedStops.length
                  }{' '}
                  {mappedStops.length ===
                  1
                    ? 'place'
                    : 'places'}
                </Text>
              </View>

              <Pressable
                style={
                  styles.summaryFit
                }
                onPress={
                  fitMap
                }
              >
                <Text
                  style={
                    styles.summaryFitText
                  }
                >
                  View all
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.stopScroll
              }
            >
              {mappedStops.map(
                (item) => (
                  <Pressable
                    key={
                      item.stop.id
                    }
                    style={
                      styles.stopCard
                    }
                    onPress={() =>
                      focusStop(
                        item,
                      )
                    }
                  >
                    <View
                      style={
                        styles.stopIcon
                      }
                    >
                      <Ionicons
                        name="location-outline"
                        size={19}
                        color={
                          colors.teal
                        }
                      />
                    </View>

                    <Text
                      numberOfLines={
                        1
                      }
                      style={
                        styles.stopTitle
                      }
                    >
                      {
                        item.stop
                          .title
                      }
                    </Text>

                    <Text
                      style={
                        styles.stopMeta
                      }
                    >
                      {item.stop
                        .startTime
                        ? `${item.stop.startTime} · `
                        : ''}

                      {
                        item.stop
                          .type
                      }
                    </Text>
                  </Pressable>
                ),
              )}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    map: {
      ...StyleSheet.absoluteFill,
    },

    loadingScreen: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.background,
    },

    loadingText: {
      fontFamily:
        fontFamily.sansMedium,
      fontSize:
        fontSize.bodySmall,
      color:
        colors.textMuted,
    },

    headerWrap: {
      position:
        'absolute',
      top: 0,
      left: 0,
      right: 0,

      paddingHorizontal:
        spacing[4],
    },

    header: {
      minHeight: 72,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        colors.surface,

      borderRadius:
        radius.lg,

      paddingHorizontal:
        spacing[5],

      borderWidth: 1,

      borderColor:
        colors.border,

      ...shadows.subtle,
    },

    headerCopy: {
      flex: 1,

      paddingRight:
        spacing[4],
    },

    eyebrow: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing: 1.4,

      color:
        colors.brass,
    },

    title: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.title,

      color:
        colors.textPrimary,

      marginTop: 2,
    },

    fitButton: {
      width: 42,
      height: 42,

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.backgroundSoft,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    bottomWrap: {
      position:
        'absolute',

      left: 0,
      right: 0,
      bottom: 0,
    },

    emptyCard: {
      marginHorizontal:
        spacing[4],

      backgroundColor:
        colors.surface,

      borderRadius:
        radius.lg,

      borderWidth: 1,

      borderColor:
        colors.border,

      padding:
        spacing[5],

      ...shadows.subtle,
    },

    emptyTop: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    emptyIcon: {
      width: 46,
      height: 46,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.tealSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing[4],
    },

    emptyCopy: {
      flex: 1,
    },

    emptyTitle: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.titleSmall,

      color:
        colors.textPrimary,
    },

    emptyBody: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.caption,

      lineHeight: 19,

      color:
        colors.textSecondary,

      marginTop:
        spacing[2],
    },

    truthRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing[2],

      marginTop:
        spacing[4],

      paddingTop:
        spacing[4],

      borderTopWidth: 1,

      borderTopColor:
        colors.border,
    },

    truthText: {
      fontFamily:
        fontFamily.sansMedium,

      fontSize:
        fontSize.caption,

      color:
        colors.teal,
    },

    mapSummary: {
      marginHorizontal:
        spacing[4],

      marginBottom:
        spacing[3],

      paddingHorizontal:
        spacing[5],

      paddingVertical:
        spacing[4],

      backgroundColor:
        colors.surface,

      borderRadius:
        radius.lg,

      borderWidth: 1,

      borderColor:
        colors.border,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      ...shadows.subtle,
    },

    summaryLabel: {
      fontFamily:
        fontFamily.sansBold,

      fontSize:
        fontSize.micro,

      letterSpacing: 1.2,

      color:
        colors.brass,
    },

    summaryValue: {
      fontFamily:
        fontFamily.serifSemiBold,

      fontSize:
        fontSize.titleSmall,

      color:
        colors.textPrimary,

      marginTop: 2,
    },

    summaryFit: {
      paddingHorizontal:
        spacing[4],

      paddingVertical:
        spacing[2],

      borderRadius:
        radius.pill,

      backgroundColor:
        colors.brandSoft,
    },

    summaryFitText: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.caption,

      color:
        colors.brand,
    },

    stopScroll: {
      paddingHorizontal:
        spacing[4],

      gap:
        spacing[3],
    },

    stopCard: {
      width: 190,

      minHeight: 100,

      backgroundColor:
        colors.surface,

      borderRadius:
        radius.lg,

      borderWidth: 1,

      borderColor:
        colors.border,

      padding:
        spacing[4],

      ...shadows.subtle,
    },

    stopIcon: {
      width: 34,
      height: 34,

      borderRadius:
        radius.sm,

      backgroundColor:
        colors.tealSoft,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        spacing[3],
    },

    stopTitle: {
      fontFamily:
        fontFamily.sansSemiBold,

      fontSize:
        fontSize.bodySmall,

      color:
        colors.textPrimary,
    },

    stopMeta: {
      fontFamily:
        fontFamily.sansRegular,

      fontSize:
        fontSize.micro,

      color:
        colors.textMuted,

      textTransform:
        'capitalize',

      marginTop: 3,
    },
  });