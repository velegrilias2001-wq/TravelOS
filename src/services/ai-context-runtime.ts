import {
  AIContextService,
} from './ai-context-service';
import {
  tripService,
} from './trip-service';
import {
  travelDNAService,
} from './travel-dna-runtime';

/**
 * Native app runtime wiring for AI context.
 *
 * The core AIContextService remains dependency-injected and Node-testable.
 * Expo/native dependencies live only in this runtime composition layer.
 */
export const aiContextService =
  new AIContextService(
    tripService,
    travelDNAService,
  );
