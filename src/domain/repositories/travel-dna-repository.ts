import type { TravelDNA } from '../entities/travel-dna';

export interface TravelDNARepository {
  get(): Promise<TravelDNA | null>;

  save(profile: TravelDNA): Promise<void>;
}
