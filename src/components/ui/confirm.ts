import { Alert } from 'react-native';

type ConfirmDestructiveOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

/**
 * Native destructive confirmation. No second dialog system.
 */
export function confirmDestructive({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
}: ConfirmDestructiveOptions): void {
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
}

/** Awaitable variant keeps an operation locked through confirmation/cancel. */
export function confirmDestructiveAsync(
  options: Omit<ConfirmDestructiveOptions, 'onConfirm'>,
): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(options.title, options.message, [
      { text: options.cancelLabel ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: options.confirmLabel ?? 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
