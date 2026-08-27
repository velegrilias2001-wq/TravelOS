import {
  repositories,
} from './repository-registry';
import {
  TravelDNAService,
} from './travel-dna-service';

export const travelDNAService =
  new TravelDNAService(repositories);
