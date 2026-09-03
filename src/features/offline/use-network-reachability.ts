import { useNetworkState } from 'expo-network';

import {
  resolveNetworkReachability,
  type NetworkReachability,
} from '@/services/offline-trip-context';

export function useNetworkReachability(): NetworkReachability {
  const state = useNetworkState();

  return resolveNetworkReachability({
    type: state.type,
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
  });
}
