import type { PropsWithChildren } from 'react';

import {
    ScrollView,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import {
    SafeAreaView,
    type Edge,
} from 'react-native-safe-area-context';

import {
    colors,
    spacing,
} from '@/theme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;

  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  padded = true,
  style,
  contentStyle,
}: ScreenProps) {
  const contentStyles = [
    styles.content,
    padded && styles.padded,
    contentStyle,
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, style]}
      edges={edges}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={contentStyles}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyles}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  flex: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
  },

  padded: {
    paddingHorizontal: spacing[6],
  },
});