import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';

import {
  buildDiscoverJourneyBrief,
  buildDiscoverJourneyTripPrefill,
  findDiscoverJourney,
  listDiscoverJourneys,
  type DiscoverJourney,
} from '@/services/discover-journeys';

import {
  serializeDiscoverTripPrefill,
} from '@/services/discover-trip-handoff';

import {
  savedPlaceService,
} from '@/services/saved-place-runtime';

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

export default function DiscoverJourneysScreen() {
  const router = useRouter();
  const setBrief = useDiscoverStore(
    (state) => state.setBrief,
  );
  const [selectedIdentity, setSelectedIdentity] =
    useState<string | null>(null);

  const journeys = useMemo(
    () => listDiscoverJourneys(),
    [],
  );
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!selectedIdentity) {
        setSaved(false);
        return;
      }

      let active = true;

      void savedPlaceService
        .isSaved(selectedIdentity)
        .then((value) => {
          if (active) {
            setSaved(value);
          }
        });

      return () => {
        active = false;
      };
    }, [selectedIdentity]),
  );

  const journey = selectedIdentity
    ? findDiscoverJourney(selectedIdentity)
    : null;

  const openTrip = (idea: DiscoverJourney) => {
    const brief = buildDiscoverJourneyBrief(idea);
    const prefill = buildDiscoverJourneyTripPrefill(idea);

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
          onPress={() => {
            if (selectedIdentity) {
              setSelectedIdentity(null);
              return;
            }

            router.back();
          }}
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
          Ready-made journeys
        </Text>

        <Text style={styles.subtitle}>
          These are catalogue ideas, not trips. TravelOS will not invent an itinerary, extra destinations, or dates. Nothing is saved until you confirm Create Trip.
        </Text>
      </View>

      {journey ? (
        <JourneyDetail
          journey={journey}
          saved={saved}
          onToggleSave={async () => {
            const next = await savedPlaceService.toggle({
              kind: 'journey',
              groundedIdentity: journey.identity,
            });
            setSaved(next);
          }}
          onChooseAnother={() =>
            setSelectedIdentity(null)
          }
          onMakeTrip={() => openTrip(journey)}
        />
      ) : (
        <View style={styles.list}>
          {journeys.map((idea) => (
            <JourneyRow
              key={idea.identity}
              journey={idea}
              onPress={() =>
                setSelectedIdentity(idea.identity)
              }
            />
          ))}
        </View>
      )}

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function JourneyRow({
  journey,
  onPress,
}: {
  journey: DiscoverJourney;
  onPress: () => void;
}) {
  const destinationLabel = journey.destinations
    .map((destination) => destination.name)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={journey.title}
      style={({ pressed }) => [
        styles.destinationCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.destinationCopy}>
        <Text style={styles.destinationEyebrow}>
          JOURNEY IDEA
        </Text>

        <Text style={styles.destinationTitle}>
          {journey.title}
        </Text>

        <Text style={styles.destinationMeta}>
          {destinationLabel}
        </Text>
      </View>

      <Ionicons
        name="arrow-forward"
        size={18}
        color={colors.brand}
      />
    </Pressable>
  );
}

function JourneyDetail({
  journey,
  saved,
  onToggleSave,
  onChooseAnother,
  onMakeTrip,
}: {
  journey: DiscoverJourney;
  saved: boolean;
  onToggleSave(): Promise<void>;
  onChooseAnother: () => void;
  onMakeTrip: () => void;
}) {
  const primary = journey.destinations[0];
  const extraDestinations = journey.destinations.slice(1);

  return (
    <View style={styles.guidance}>
      <View style={styles.guidanceCard}>
        <Text style={styles.guidanceEyebrow}>
          IDEA, NOT A TRIP
        </Text>

        <Text style={styles.guidanceTitle}>
          {journey.title}
        </Text>

        <Text style={styles.guidanceBody}>
          {journey.summary}
        </Text>
      </View>

      <View style={styles.destinationCard}>
        <View style={styles.destinationCopy}>
          <Text style={styles.destinationEyebrow}>
            PRIMARY DESTINATION
          </Text>

          <Text style={styles.destinationTitle}>
            {primary?.name}
          </Text>

          {primary?.countryCode ? (
            <Text style={styles.destinationMeta}>
              {primary.countryCode}
            </Text>
          ) : null}
        </View>
      </View>

      {extraDestinations.map((destination, index) => (
        <View
          key={`${destination.name}:${index}`}
          style={styles.destinationCard}
        >
          <View style={styles.destinationCopy}>
            <Text style={styles.destinationEyebrow}>
              ALSO IN THIS IDEA
            </Text>

            <Text style={styles.destinationTitle}>
              {destination.name}
            </Text>

            <Text style={styles.destinationMeta}>
              Not added to Create Trip yet. Multi-destination trips are not authored here.
            </Text>
          </View>
        </View>
      ))}

      {journey.evidence.map((item) => (
        <Pressable
          key={`${item.url}:${item.checkedAt}`}
          accessibilityRole="link"
          accessibilityLabel={`Open cited source ${item.label}`}
          style={({ pressed }) => [
            styles.evidenceCard,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            void Linking.openURL(item.url);
          }}
        >
          <View style={styles.evidenceCopy}>
            <Text style={styles.evidenceEyebrow}>
              CITED SOURCE
            </Text>

            <Text style={styles.evidenceTitle}>
              {item.label}
            </Text>

            <Text style={styles.evidenceMeta}>
              Checked {formatCheckedAt(item.checkedAt)}
            </Text>
          </View>

          <Ionicons
            name="open-outline"
            size={18}
            color={colors.teal}
          />
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Make this idea a trip"
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
            Open Create Trip with {primary?.name}
          </Text>
        </View>

        <Ionicons
          name="arrow-forward"
          size={21}
          color={colors.textInverse}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          saved
            ? 'Remove this journey from saved ideas'
            : 'Save this journey idea'
        }
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
        onPress={() => {
          void onToggleSave();
        }}
      >
        <Text style={styles.secondaryButtonText}>
          {saved
            ? 'Remove from saved ideas'
            : 'Save this idea'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose another journey"
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
        onPress={onChooseAnother}
      >
        <Text style={styles.secondaryButtonText}>
          Choose another idea
        </Text>
      </Pressable>
    </View>
  );
}

function formatCheckedAt(value: string): string {
  const [year, month, day] = value.split('-');
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
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

  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  destinationCopy: {
    flex: 1,
  },

  destinationEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.brass,
  },

  destinationTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.titleSmall,
    lineHeight: lineHeight.titleSmall,
    color: colors.textPrimary,
  },

  destinationMeta: {
    marginTop: 2,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  guidance: {
    gap: spacing[3],
  },

  guidanceCard: {
    padding: spacing[5],
    borderRadius: radius.lg,
    backgroundColor: colors.tealSoft,
  },

  guidanceEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.4,
    color: colors.teal,
  },

  guidanceTitle: {
    marginTop: spacing[2],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
  },

  guidanceBody: {
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },

  evidenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  evidenceCopy: {
    flex: 1,
  },

  evidenceEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.2,
    color: colors.brass,
  },

  evidenceTitle: {
    marginTop: spacing[1],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },

  evidenceMeta: {
    marginTop: 2,
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  primaryButton: {
    minHeight: 64,
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
    maxWidth: 280,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
    color: colors.textInverse,
  },

  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },

  secondaryButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.brand,
  },

  pressed: {
    opacity: 0.84,
  },

  bottomSpace: {
    height: spacing[12],
  },
});
