import type { ReactNode } from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  radius,
  spacing,
} from '@/theme';

interface UtilityScreenHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  action?: ReactNode;
}

export function UtilityScreenHeader({
  eyebrow,
  title,
  subtitle,
  leading,
  action,
}: UtilityScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export interface CompactSummaryItem {
  value: string | number;
  label: string;
}

export function CompactSummaryStrip({
  items,
  accessibilityLabel,
}: {
  items: CompactSummaryItem[];
  accessibilityLabel: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.summary}
    >
      {items.map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.summaryItem}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <Text style={styles.summaryValue}>{item.value}</Text>
          <Text numberOfLines={1} style={styles.summaryLabel}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
  },
  leading: {
    marginRight: spacing[3],
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.micro,
    letterSpacing: 1.5,
    color: colors.brass,
  },
  title: {
    marginTop: spacing[1],
    fontFamily: fontFamily.serifSemiBold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    color: colors.textPrimary,
  },
  subtitle: {
    maxWidth: 390,
    marginTop: spacing[2],
    fontFamily: fontFamily.sansRegular,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    color: colors.textSecondary,
  },
  action: {
    marginLeft: spacing[3],
  },
  summary: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[5],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWarm,
  },
  summaryItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing[1],
  },
  divider: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  summaryValue: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  summaryLabel: {
    flexShrink: 1,
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
});
