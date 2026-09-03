import { Image, type ImageProps } from 'expo-image';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ImageStyle,
} from 'react-native';

import { colors, radius } from '@/theme';

type LocalImageProps = Omit<ImageProps, 'source' | 'style'> & {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/**
 * Traveler-owned local media only. Missing URIs stay empty — never invent a remote URL.
 */
export function LocalImage({
  uri,
  style,
  accessibilityLabel,
  contentFit = 'cover',
  ...rest
}: LocalImageProps) {
  if (!uri) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        style={[styles.fallback, style]}
      />
    );
  }

  return (
    <Image
      {...rest}
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
  },
});
