import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';

/** Route removal (including parent-stack removal), not harmless retained-tab blur. */
export function useRouteEditorGuard(draft: Record<string, unknown>, saving: boolean) {
  const navigation = useNavigation();
  const serialized = JSON.stringify(draft);
  const [baseline, setBaseline] = useState(serialized);
  const [committedExit, setCommittedExit] = useState(false);
  const afterCommit = useRef<(() => void) | null>(null);
  const confirming = useRef(false);
  const dirty = baseline !== serialized;

  usePreventRemove(!committedExit && (dirty || saving), ({ data }) => {
    if (saving || confirming.current) return;
    confirming.current = true;
    const reset = () => { confirming.current = false; };
    Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
      { text: 'Keep editing', style: 'cancel', onPress: reset },
      { text: 'Discard', style: 'destructive', onPress: () => { reset(); navigation.dispatch(data.action); } },
    ], { cancelable: true, onDismiss: reset });
  });

  useEffect(() => {
    if (committedExit && afterCommit.current) {
      const action = afterCommit.current;
      afterCommit.current = null;
      action();
    }
  }, [committedExit]);

  const markSaved = useCallback((value: Record<string, unknown>) => {
    setBaseline(JSON.stringify(value));
  }, []);
  const finish = useCallback((action: () => void) => {
    afterCommit.current = action;
    setCommittedExit(true);
  }, []);
  return { dirty, markSaved, finish };
}
