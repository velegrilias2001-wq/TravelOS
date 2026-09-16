import {
  Text,
  TextInput,
  View,
} from 'react-native';

import { styles } from '@/features/trip-bookings/bookings-styles';
import { colors } from '@/theme';

/**
 * Labelled text field used across the Bookings editor.
 * Extracted verbatim from bookings.tsx.
 */
export interface FieldProps {
  label: string;
  placeholder: string;
  value: string;

  onChangeText(
    value: string,
  ): void;

  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';

  keyboardType?:
    | 'default'
    | 'decimal-pad'
    | 'numeric';

  multiline?: boolean;
}

export function Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  multiline = false,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text
        style={styles.fieldLabel}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          colors.textMuted
        }
        autoCapitalize={
          autoCapitalize
        }
        keyboardType={
          keyboardType
        }
        multiline={
          multiline
        }
        style={[
          styles.input,

          multiline &&
            styles.multilineInput,
        ]}
      />
    </View>
  );
}
