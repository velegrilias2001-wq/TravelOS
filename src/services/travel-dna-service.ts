import type {
  BudgetStyle,
  DailyRhythm,
  TravelDNA,
  TravelInterest,
  TravelPace,
  TravelStyle,
  TypicalTravelParty,
} from '@/domain/entities';
import type {
  TravelDNARepository,
} from '@/domain/repositories';

export interface TravelDNAInput {
  pace?: TravelPace;
  interests: TravelInterest[];
  travelStyle?: TravelStyle;
  budgetStyle?: BudgetStyle;
  dailyRhythm?: DailyRhythm;
  typicalParty?: TypicalTravelParty;
}

export interface TravelDNARepositories {
  travelDNA: TravelDNARepository;
}

const createLocalTravelDNAId = (): string =>
  'travel-dna-local';

export class TravelDNAService {
  constructor(
    private readonly repo: TravelDNARepositories,
    private readonly createId: () => string =
      createLocalTravelDNAId,
    private readonly now: () => string =
      () => new Date().toISOString(),
  ) {}

  async get(): Promise<TravelDNA | null> {
    return this.repo.travelDNA.get();
  }

  async save(
    input: TravelDNAInput,
  ): Promise<TravelDNA> {
    const existing =
      await this.repo.travelDNA.get();

    const timestamp = this.now();

    const profile: TravelDNA = {
      id: existing?.id ?? this.createId(),
      pace: input.pace,
      interests: [...input.interests],
      travelStyle: input.travelStyle,
      budgetStyle: input.budgetStyle,
      dailyRhythm: input.dailyRhythm,
      typicalParty: input.typicalParty,
      createdAt:
        existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    await this.repo.travelDNA.save(profile);

    return profile;
  }
}
