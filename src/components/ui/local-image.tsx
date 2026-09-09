import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
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
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (uri && failedUri === uri) {
    return (
      <View accessibilityLabel="Photo unavailable on this device" style={[styles.fallback, style, styles.unavailable]}>
        <Text numberOfLines={2} style={styles.unavailableText}>Photo unavailable on this device</Text>
      </View>
    );
  }
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
      onError={event => { setFailedUri(uri); rest.onError?.(event); }}
    />
  );
}

const styles = StyleSheet.create({
  unavailable: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  unavailableText: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  fallback: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
  },
});
