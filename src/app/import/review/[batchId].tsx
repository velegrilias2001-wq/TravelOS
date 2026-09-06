import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';
import type { BookingType, Trip } from '@/domain/entities';
import { formatBookingTemporalValue } from '@/services/booking-time';
import {
  tripDestinationLabel,
} from '@/services/destination-authoring';
import type {
  ImportBookingAcceptOverrides,
  ImportClaimListing,
} from '@/services/import-review-service';
import { buildImportLineStopHandoff } from '@/services/import-line-stop-handoff';
import { buildImportSeedTripHandoff } from '@/services/import-seed-handoff';
import { importReviewService } from '@/services/import-review-runtime';
import { useTripStore } from '@/store/trip-store';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

export default function ImportReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    batchId?: string | string[];
    tripId?: string | string[];
  }>();
  const batchId = Array.isArray(params.batchId)
    ? params.batchId[0]
    : params.batchId;
  const initialTripId = Array.isArray(params.tripId)
    ? params.tripId[0]
    : params.tripId;

  const trips = useTripStore((state) => state.trips);
  const [selectedTripId, setSelectedTripId] = useState<
    string | undefined
  >(initialTripId);
  const [listings, setListings] = useState<ImportClaimListing[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const selectedTrip = useMemo(
    () =>
      trips.find(
        (trip) =>
          trip.id === selectedTripId &&
          trip.status !== 'archived',
      ),
    [selectedTripId, trips],
  );

  const selectableTrips = useMemo(
    () =>
      trips.filter((trip) => trip.status !== 'archived'),
    [trips],
  );

  const reload = useCallback(async () => {
    if (!batchId) {
      setError('Import review was not found.');
      setLoaded(true);
      return;
    }

    const review = await importReviewService.listClaimReviews(
      batchId,
      selectedTripId,
    );

    setListings(review.listings);
    setError(null);
    setLoaded(true);
  }, [batchId, selectedTripId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        try {
          if (!batchId) {
            if (active) {
              setError('Import review was not found.');
              setLoaded(true);
            }

            return;
          }

          const review =
            await importReviewService.listClaimReviews(
              batchId,
              selectedTripId,
            );

          if (active) {
            setListings(review.listings);
            setError(null);
            setLoaded(true);
          }
        } catch (caught) {
          if (active) {
            setError(
              caught instanceof Error
                ? caught.message
                : 'This review could not be opened.',
            );
            setLoaded(true);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [batchId, selectedTripId]),
  );

  const accept = async (
    listing: ImportClaimListing,
    overrides: ImportBookingAcceptOverrides = {},
  ) => {
    if (!selectedTripId) {
      setError('Choose a trip before accepting a claim.');
      return;
    }

    try {
      await importReviewService.accept(
        listing.claim.id,
        selectedTripId,
        overrides,
      );
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'This claim could not become a booking.',
      );
    }
  };

  const startCreateTripFromSeed = async (
    listing: ImportClaimListing,
  ) => {
    try {
      await importReviewService.acknowledgeSeed(
        listing.claim.id,
      );
      const handoff = buildImportSeedTripHandoff(listing.claim);
      router.push({
        pathname: '/new-trip',
        params: handoff,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'This seed claim could not open Create Trip.',
      );
    }
  };

  const acknowledgeLine = async (listing: ImportClaimListing) => {
    try {
      await importReviewService.acknowledgeSeed(
        listing.claim.id,
        selectedTripId,
      );
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'This line could not be marked reviewed.',
      );
    }
  };

  const addLineAsStop = (listing: ImportClaimListing) => {
    if (!selectedTripId) {
      setError('Choose a trip before adding a line as a stop.');
      return;
    }

    try {
      const handoff = buildImportLineStopHandoff(listing.claim);
      router.push({
        pathname: '/trip/[tripId]/plan',
        params: {
          tripId: selectedTripId,
          ...handoff,
        },
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'This line could not open Plan.',
      );
    }
  };

  const dismiss = async (listing: ImportClaimListing) => {
    try {
      await importReviewService.dismiss(listing.claim.id);
      await reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'This claim could not be dismissed.',
      );
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>

        <Text style={styles.eyebrow}>
          IMPORTED CLAIMS
        </Text>

        <Text style={styles.title}>
          Review before it becomes a booking
        </Text>

        <Text style={styles.subtitle}>
          Accepting a calendar claim writes one planned booking onto the trip you choose. Seed claims open Create Trip instead — they never invent a destination or write a trip alone.
        </Text>
      </View>

      {selectableTrips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEyebrow}>
            NEEDS A TRIP
          </Text>

          <Text style={styles.emptyTitle}>
            Create a trip first
          </Text>

          <Text style={styles.emptyBody}>
            Imported claims cannot invent a destination or dates. Confirm a trip, then accept the events onto it.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plan a trip"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/new-trip')}
          >
            <Text style={styles.primaryButtonText}>
              Plan a trip
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.tripList}>
          <Text style={styles.sectionEyebrow}>
            ACCEPT ONTO
          </Text>

          {selectableTrips.map((trip) => (
            <TripChoice
              key={trip.id}
              trip={trip}
              selected={trip.id === selectedTripId}
              onPress={() => setSelectedTripId(trip.id)}
            />
          ))}
        </View>
      )}

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}

      {loaded ? (
        <View style={styles.list}>
          {listings.length === 0 ? (
            <Text style={styles.emptyBody}>
              This calendar did not leave any claims to review.
            </Text>
          ) : (
            listings.map((listing) => (
              <ClaimCard
                key={listing.claim.id}
                listing={listing}
                canAccept={Boolean(selectedTrip)}
                onAccept={(overrides) => {
                  void accept(listing, overrides);
                }}
                onStartCreateTrip={() => {
                  void startCreateTripFromSeed(listing);
                }}
                onAddAsStop={() => {
                  addLineAsStop(listing);
                }}
                onAcknowledgeLine={() => {
                  void acknowledgeLine(listing);
                }}
                onDismiss={() => {
                  void dismiss(listing);
                }}
              />
            ))
          )}
        </View>
      ) : null}

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function TripChoice({
  trip,
  selected,
  onPress,
}: {
  trip: Trip;
  selected: boolean;
  onPress(): void;
}) {
  const destination =
    trip.destinations.length === 0
      ? 'No destination yet'
      : tripDestinationLabel(trip.destinations);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose ${trip.title}`}
      style={({ pressed }) => [
        styles.tripCard,
        selected && styles.tripCardSelected,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.tripTitle}>
        {trip.title}
      </Text>

      <Text style={styles.tripDetail}>
        {destination}
      </Text>
    </Pressable>
  );
}

function ClaimCard({
  listing,
  canAccept,
  onAccept,
  onStartCreateTrip,
  onAddAsStop,
  onAcknowledgeLine,
  onDismiss,
}: {
  listing: ImportClaimListing;
  canAccept: boolean;
  onAccept(overrides: ImportBookingAcceptOverrides): void;
  onStartCreateTrip(): void;
  onAddAsStop(): void;
  onAcknowledgeLine(): void;
  onDismiss(): void;
}) {
  const { claim, conflicts } = listing;
  const startLabel = formatBookingTemporalValue(claim.startAt);
  const endLabel = formatBookingTemporalValue(claim.endAt);
  const pending = claim.status === 'pending';
  const kindLabel =
    claim.kind === 'trip_seed'
      ? 'TRIP SEED'
      : claim.kind === 'itinerary_line'
        ? 'ITINERARY LINE'
        : 'BOOKING';

  const [bookingType, setBookingType] =
    useState<BookingType>('other');
  const [provider, setProvider] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>
        {kindLabel} · {claim.confidence.toUpperCase()} ·{' '}
        {claim.status.toUpperCase()}
      </Text>

      <Text style={styles.cardTitle}>
        {claim.title}
      </Text>

      <Text style={styles.cardDetail}>
        {startLabel ??
          (claim.kind === 'itinerary_line'
            ? 'No fixed time'
            : 'Start unknown')}
        {endLabel ? ` → ${endLabel}` : ''}
      </Text>

      {claim.locationText ? (
        <Text style={styles.cardDetail}>
          Location text: {claim.locationText}
        </Text>
      ) : null}

      {conflicts.map((conflict) => (
        <Text
          key={`${conflict.kind}-${conflict.detail}`}
          style={styles.conflict}
        >
          {conflict.detail}
        </Text>
      ))}

      {pending && claim.kind === 'trip_seed' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start Create Trip from ${claim.title}`}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={onStartCreateTrip}
        >
          <Text style={styles.primaryButtonText}>
            Start Create Trip
          </Text>
        </Pressable>
      ) : null}

      {pending && claim.kind === 'itinerary_line' ? (
        <View style={styles.lineActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${claim.title} as stop`}
            accessibilityState={{ disabled: !canAccept }}
            style={({ pressed }) => [
              styles.primaryButton,
              !canAccept && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
            disabled={!canAccept}
            onPress={onAddAsStop}
          >
            <Text style={styles.primaryButtonText}>
              Add as stop
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mark ${claim.title} reviewed`}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            onPress={onAcknowledgeLine}
          >
            <Text style={styles.secondaryButtonText}>
              Mark reviewed (not a stop)
            </Text>
          </Pressable>
        </View>
      ) : null}

      {pending && claim.kind === 'booking' ? (
        <View style={styles.acceptEditor}>
          <Text style={styles.acceptEditorLabel}>
            EDIT BEFORE ACCEPT
          </Text>
          <Text style={styles.cardDetail}>
            Optional fields stay empty when blank. Nothing is invented.
          </Text>
          <View style={styles.typeRow}>
            {(
              [
                'flight',
                'train',
                'ferry',
                'accommodation',
                'other',
              ] as BookingType[]
            ).map((type) => {
              const selected = bookingType === type;

              return (
                <Pressable
                  key={type}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[
                    styles.typeChip,
                    selected && styles.typeChipSelected,
                  ]}
                  onPress={() => setBookingType(type)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      selected && styles.typeChipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            accessibilityLabel="Provider"
            placeholder="Provider"
            placeholderTextColor={colors.textMuted}
            value={provider}
            onChangeText={setProvider}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Confirmation code"
            placeholder="Confirmation code"
            placeholderTextColor={colors.textMuted}
            value={confirmationCode}
            onChangeText={setConfirmationCode}
            autoCapitalize="characters"
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Booking link"
            placeholder="Booking link (https://…)"
            placeholderTextColor={colors.textMuted}
            value={externalUrl}
            onChangeText={setExternalUrl}
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Accept ${claim.title} as a booking`}
            disabled={!canAccept}
            style={({ pressed }) => [
              styles.primaryButton,
              !canAccept && styles.primaryButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              onAccept({
                type: bookingType,
                provider,
                confirmationCode,
                externalUrl,
              })
            }
          >
            <Text style={styles.primaryButtonText}>
              Accept as planned booking
            </Text>
          </Pressable>
        </View>
      ) : null}

      {pending ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${claim.title}`}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
          onPress={onDismiss}
        >
          <Text style={styles.secondaryButtonText}>
            Dismiss this claim
          </Text>
        </Pressable>
      ) : null}

      {claim.status === 'accepted' && claim.kind === 'booking' ? (
        <Text style={styles.cardDetail}>
          Accepted as a planned booking. It is still not confirmed reservation truth.
        </Text>
      ) : null}

      {claim.status === 'accepted' && claim.kind !== 'booking' ? (
        <Text style={styles.cardDetail}>
          Reviewed. Canonical trip facts still require Create Trip or Plan.
        </Text>
      ) : null}

      {claim.status === 'dismissed' ? (
        <Text style={styles.cardDetail}>
          Dismissed. This claim did not become trip truth.
        </Text>
      ) : null}
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

  tripList: {
    gap: spacing[2],
    marginBottom: spacing[5],
  },

  sectionEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.teal,
  },

  tripCard: {
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  tripCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },

  tripTitle: {
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },

  tripDetail: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
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

  acceptEditor: {
    gap: spacing[2],
    marginTop: spacing[2],
  },

  acceptEditorLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.brass,
  },

  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },

  typeChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  typeChipSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },

  typeChipText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },

  typeChipTextSelected: {
    color: colors.teal,
  },

  input: {
    minHeight: 48,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },

  conflict: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.warning,
  },

  emptyCard: {
    padding: spacing[5],
    marginBottom: spacing[5],
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

  lineActions: {
    gap: spacing[1],
    marginTop: spacing[2],
  },

  primaryButton: {
    minHeight: 48,
    marginTop: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    ...shadows.card,
  },

  primaryButtonDisabled: {
    opacity: 0.45,
  },

  primaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
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

  error: {
    marginBottom: spacing[4],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.danger,
  },

  pressed: {
    opacity: 0.84,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
