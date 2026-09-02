import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/screen';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  shadows,
  spacing,
} from '@/theme';

export default function DiscoverScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          DISCOVER
        </Text>

        <Text style={styles.title}>
          Where could this take you?
        </Text>

        <Text style={styles.subtitle}>
          Start with a place you already have in mind, or let TravelOS help you decide where and when to go.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start planning a destination you already know"
        style={({ pressed }) => [
          styles.primaryCard,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          router.push('/new-trip')
        }
      >
        <View style={styles.primaryTop}>
          <View style={styles.primaryIcon}>
            <Ionicons
              name="location-outline"
              size={24}
              color={colors.textInverse}
            />
          </View>

          <View style={styles.primaryArrow}>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.brand}
            />
          </View>
        </View>

        <Text style={styles.primaryEyebrow}>
          I KNOW WHERE
        </Text>

        <Text style={styles.primaryTitle}>
          Start with a place
        </Text>

        <Text style={styles.primaryBody}>
          Choose your destination and dates, then build the trip from there.
        </Text>
      </Pressable>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>
          FIND THE TRIP
        </Text>

        <Text style={styles.sectionTitle}>
          Let TravelOS help you choose
        </Text>
      </View>

      <View style={styles.optionList}>
        <DiscoverOption
          icon="sparkles-outline"
          title="Find me somewhere"
          body="Tell us when you can travel, your budget and what kind of trip you want."
          onPress={() =>
            router.push(
              '/discover/find-destination',
            )
          }
        />

        <DiscoverOption
          icon="calendar-outline"
          title="Best time to go"
          body="Already know the place? See sourced months for that destination."
          onPress={() =>
            router.push(
              '/discover/best-time',
            )
          }
        />

        <FutureOption
          icon="compass-outline"
          title="Ready-made journeys"
          body="Explore curated trip ideas you can keep, adapt and make your own."
        />
      </View>

      <View style={styles.promiseCard}>
        <View style={styles.promiseIcon}>
          <Ionicons
            name="options-outline"
            size={20}
            color={colors.teal}
          />
        </View>

        <View style={styles.promiseCopy}>
          <Text style={styles.promiseTitle}>
            Built around your real trip
          </Text>

          <Text style={styles.promiseBody}>
            Discover uses what you explicitly tell TravelOS about this trip, while keeping suggestions separate from confirmed plans.
          </Text>
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function DiscoverOption({
  icon,
  title,
  body,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.futureCard,
        styles.activeOptionCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.futureIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.teal}
        />
      </View>

      <View style={styles.futureCopy}>
        <Text style={styles.futureTitle}>
          {title}
        </Text>

        <Text style={styles.futureBody}>
          {body}
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

function FutureOption({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.futureCard}>
      <View style={styles.futureIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={colors.teal}
        />
      </View>

      <View style={styles.futureCopy}>
        <Text style={styles.futureTitle}>
          {title}
        </Text>

        <Text style={styles.futureBody}>
          {body}
        </Text>
      </View>

      <View style={styles.soonPill}>
        <Text style={styles.soonText}>
          SOON
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    header: {
      paddingTop: spacing[6],
      marginBottom: spacing[7],
    },

    eyebrow: {
      marginBottom: spacing[2],
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.8,
      color: colors.brass,
    },

    title: {
      maxWidth: 470,
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize: fontSize.display,
      lineHeight: lineHeight.display,
      color: colors.textPrimary,
    },

    subtitle: {
      maxWidth: 470,
      marginTop: spacing[3],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.bodySmall,
      lineHeight:
        lineHeight.bodySmall,
      color: colors.textSecondary,
    },

    primaryCard: {
      padding: spacing[5],
      borderRadius: radius.lg,
      backgroundColor: colors.brand,
      ...shadows.card,
    },

    primaryTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: spacing[6],
    },

    primaryIcon: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(255,255,255,0.12)',
    },

    primaryArrow: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },

    primaryEyebrow: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.4,
      color: '#D5B887',
    },

    primaryTitle: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize: fontSize.title,
      lineHeight: lineHeight.title,
      color: colors.textInverse,
    },

    primaryBody: {
      maxWidth: 400,
      marginTop: spacing[2],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.bodySmall,
      lineHeight:
        lineHeight.bodySmall,
      color:
        'rgba(255,255,255,0.76)',
    },

    sectionHeading: {
      marginTop: spacing[8],
      marginBottom: spacing[4],
    },

    sectionEyebrow: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1.5,
      color: colors.brass,
    },

    sectionTitle: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.serifSemiBold,
      fontSize: fontSize.titleSmall,
      lineHeight:
        lineHeight.titleSmall,
      color: colors.textPrimary,
    },

    optionList: {
      gap: spacing[3],
    },

    futureCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
      padding: spacing[4],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },

    activeOptionCard: {
      alignItems: 'center',
    },

    futureIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.tealSoft,
    },

    futureCopy: {
      flex: 1,
      paddingTop: spacing[1],
    },

    futureTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    futureBody: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color: colors.textSecondary,
    },

    soonPill: {
      marginTop: spacing[1],
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
      borderRadius: radius.pill,
      backgroundColor:
        colors.brassSoft,
    },

    soonText: {
      fontFamily: fontFamily.sansBold,
      fontSize: fontSize.micro,
      letterSpacing: 1,
      color: colors.brass,
    },

    promiseCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
      marginTop: spacing[5],
      padding: spacing[4],
      borderRadius: radius.lg,
      backgroundColor:
        colors.tealSoft,
    },

    promiseIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },

    promiseCopy: {
      flex: 1,
    },

    promiseTitle: {
      fontFamily:
        fontFamily.sansSemiBold,
      fontSize: fontSize.bodySmall,
      color: colors.textPrimary,
    },

    promiseBody: {
      marginTop: spacing[1],
      fontFamily:
        fontFamily.sansRegular,
      fontSize: fontSize.caption,
      lineHeight:
        lineHeight.caption,
      color: colors.textSecondary,
    },

    pressed: {
      opacity: 0.84,
    },

    bottomSpace: {
      height: spacing[12],
    },
  });