import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { editorClosePolicy } from '@/services/editor-close-policy';

/** Captures the populated form when its editor opens, not database snapshots.
 * Only wire this to user exits; successful saves use the original close action.
 */
export function useEditorCloseGuard(
  open: boolean,
  draft: Record<string, unknown>,
  saving: boolean,
  close: () => void,
): () => void {
  const baseline = useRef<string | null>(null);
  const confirming = useRef(false);
  const serialized = JSON.stringify(draft);
  useEffect(() => {
    if (!open) baseline.current = null;
    else if (baseline.current === null) baseline.current = serialized;
  }, [open, serialized]);
  return () => {
    const decision = editorClosePolicy(baseline.current, serialized, saving);
    if (decision === 'blocked' || confirming.current) return;
    if (decision === 'close') {
      close();
      return;
    }
    confirming.current = true;
    const reset = () => { confirming.current = false; };
    Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
      { text: 'Keep editing', style: 'cancel', onPress: reset },
      { text: 'Discard', style: 'destructive', onPress: () => { reset(); close(); } },
    ], { cancelable: true, onDismiss: reset });
  };
}
