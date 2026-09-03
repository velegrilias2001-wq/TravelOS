import {
  useEffect,
  useState,
  useRef,
} from 'react';

import {
  companionPlanSnapshot,
  describeCompanionPlanChange,
} from '@/services/companion-itinerary-change';
import type { TripWorkspace } from '@/services/trip-service';

export function useCompanionPlanChangeNotice(
  workspace: TripWorkspace,
): {
  notice: string | null;
  dismiss: () => void;
} {
  const previousRef = useRef(
    companionPlanSnapshot(workspace),
  );
  const [notice, setNotice] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const current = companionPlanSnapshot(workspace);
    const previous = previousRef.current;

    if (previous.tripId !== current.tripId) {
      previousRef.current = current;
      setNotice(null);
      return;
    }

    const change = describeCompanionPlanChange(
      previous,
      current,
    );

    previousRef.current = current;

    if (change) {
      setNotice(change.body);
    }
  }, [workspace]);

  return {
    notice,
    dismiss: () => {
      setNotice(null);
    },
  };
}
