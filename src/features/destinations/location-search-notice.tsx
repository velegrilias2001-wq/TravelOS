import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LocationSelectionOutcome } from '@/services/location-selection';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';
import { strings } from '@/i18n';

type NoticeStatus = Exclude<
  LocationSelectionOutcome['status'],
  'selected'
>;

interface LocationSearchNoticeProps {
  status: NoticeStatus | null;
  reason?: string;
  onRetry(): void;
  onDismiss(): void;
}

/**
 * Explicit state for a location picker that closed without saving anything.
 *
 * The native picker cannot tell TravelOS whether the traveller cancelled or
 * whether place search failed: a blocked or disabled Places key is logged
 * natively and reaches JavaScript as an empty result. So the dismissed copy
 * states only what is certain — nothing was saved — and then names the
 * possibility the traveller cannot otherwise diagnose, without asserting it.
 */
export function LocationSearchNotice({
  status,
  reason,
  onRetry,
  onDismiss,
}: LocationSearchNoticeProps) {
  if (!status) {
    return null;
  }

  const unavailable = status === 'unavailable';

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.notice,
        unavailable && styles.noticeUnavailable,
      ]}
    >
      <View style={styles.header}>
        <Ionicons
          name={
            unavailable
              ? 'alert-circle-outline'
              : 'information-circle-outline'
          }
          size={18}
          color={unavailable ? colors.coral : colors.teal}
        />

        <Text style={styles.title}>
          {unavailable
            ? strings.locationNotice.unavailableTitle
            : strings.locationNotice.dismissedTitle}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.locationNotice.dismissLabel}
          hitSlop={10}
          onPress={onDismiss}
        >
          <Ionicons
            name="close"
            size={18}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      <Text style={styles.body}>
        {unavailable
          ? reason
          : strings.locationNotice.dismissedBody}
      </Text>

      {unavailable ? null : (
        <Text style={styles.hint}>
          {strings.locationNotice.dismissedHint}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.locationNotice.retryLabel}
        style={({ pressed }) => [
          styles.retry,
          pressed && styles.pressed,
        ]}
        onPress={onRetry}
      >
        <Text style={styles.retryText}>
          {strings.locationNotice.retry}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginTop: spacing[3],
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    gap: spacing[2],
  },
  noticeUnavailable: {
    borderColor: colors.coral,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  retry: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.bodySmall,
    color: colors.teal,
  },
  pressed: {
    opacity: 0.84,
  },
});
