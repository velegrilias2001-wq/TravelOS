import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';

import type {
  DiscoverDestination,
} from '@/domain/entities';

import {
  adviseDiscoverBestTime,
  buildDiscoverBestTimeBrief,
  buildDiscoverBestTimeTripPrefill,
  DISCOVER_MONTH_LABELS,
  formatDiscoverSupportedMonths,
  listDiscoverBestTimeDestinations,
  type DiscoverBestTimeAdvice,
  type DiscoverBestTimeDestinationOption,
} from '@/services/discover-best-time';

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

export default function DiscoverBestTimeScreen() {
  const router = useRouter();
  const setBrief = useDiscoverStore(
    (state) => state.setBrief,
  );
  const [selectedIdentity, setSelectedIdentity] =
    useState<string | null>(null);

  const destinations = useMemo(
    () => listDiscoverBestTimeDestinations(),
    [],
  );

  const advice = selectedIdentity
    ? adviseDiscoverBestTime(selectedIdentity)
    : null;

  const openTrip = (
    destination: DiscoverDestination,
  ) => {
    const brief = buildDiscoverBestTimeBrief(
      destination,
    );
    const prefill = buildDiscoverBestTimeTripPrefill(
      destination,
    );

    setBrief(brief);

    router.push({
      pathname: '/new-trip',
      params: serializeDiscoverTripPrefill(
        prefill,
      ),
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
          Best time to go
        </Text>

        <Text style={styles.subtitle}>
          Choose a catalogue destination. TravelOS only shows months that a cited source supports, and never turns those months into trip dates.
        </Text>
      </View>

      {advice ? (
        <BestTimeGuidance
          advice={advice}
          onChooseAnother={() =>
            setSelectedIdentity(null)
          }
          onMakeTrip={() =>
            openTrip(advice.destination)
          }
        />
      ) : (
        <View style={styles.list}>
          {destinations.map((option) => (
            <DestinationRow
              key={option.identity}
              option={option}
              onPress={() =>
                setSelectedIdentity(option.identity)
              }
            />
          ))}
        </View>
      )}

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function DestinationRow({
  option,
  onPress,
}: {
  option: DiscoverBestTimeDestinationOption;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${option.destination.name}. ${
        option.hasSeasonGuidance
          ? 'Season guidance available'
          : 'No season data yet'
      }`}
      style={({ pressed }) => [
        styles.destinationCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.destinationCopy}>
        <Text style={styles.destinationEyebrow}>
          {option.hasSeasonGuidance
            ? 'SEASON GUIDANCE'
            : 'NO SEASON DATA YET'}
        </Text>

        <Text style={styles.destinationTitle}>
          {option.destination.name}
        </Text>

        {option.destination.countryCode ? (
          <Text style={styles.destinationMeta}>
            {option.destination.countryCode}
          </Text>
        ) : null}
      </View>

      <Ionicons
        name="arrow-forward"
        size={18}
        color={colors.brand}
      />
    </Pressable>
  );
}

function BestTimeGuidance({
  advice,
  onChooseAnother,
  onMakeTrip,
}: {
  advice: DiscoverBestTimeAdvice;
  onChooseAnother: () => void;
  onMakeTrip: () => void;
}) {
  const country = advice.destination.countryCode
    ? ` · ${advice.destination.countryCode}`
    : '';

  return (
    <View style={styles.guidance}>
      <View style={styles.guidanceCard}>
        <Text style={styles.guidanceEyebrow}>
          {advice.kind === 'guided'
            ? 'FROM THE CATALOGUE'
            : 'NO SEASON SOURCE YET'}
        </Text>

        <Text style={styles.guidanceTitle}>
          {advice.destination.name}
          {country}
        </Text>

        {advice.kind === 'guided' ? (
          <>
            <Text style={styles.monthLabel}>
              {formatDiscoverSupportedMonths(
                advice.supportedMonths,
              )}
            </Text>

            <Text style={styles.guidanceBody}>
              {advice.yearRound
                ? `Official tourism sources describe ${advice.destination.name} as visitable throughout the year. That is not a ranked best week, and it is not a trip date.`
                : `Official tourism sources name ${formatDiscoverSupportedMonths(advice.supportedMonths)} as suitable months to visit ${advice.destination.name}. TravelOS does not invent a start or end date from that.`}
            </Text>
          </>
        ) : (
          <Text style={styles.guidanceBody}>
            TravelOS does not yet have sourced season guidance for {advice.destination.name}. Unknown months stay unknown. You can still carry this destination into Create Trip and choose dates there.
          </Text>
        )}
      </View>

      {advice.kind === 'guided'
        ? advice.evidence.map((item) => (
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
          ))
        : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Make this destination a trip"
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
            Open Create Trip with this destination
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
        accessibilityLabel="Choose another destination"
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
        onPress={onChooseAnother}
      >
        <Text style={styles.secondaryButtonText}>
          Choose another destination
        </Text>
      </Pressable>
    </View>
  );
}

function formatCheckedAt(value: string): string {
  const [year, month, day] = value.split('-');
  const monthLabel =
    DISCOVER_MONTH_LABELS[Number(month) - 1];

  return `${Number(day)} ${monthLabel} ${year}`;
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

  monthLabel: {
    marginTop: spacing[3],
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.body,
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
