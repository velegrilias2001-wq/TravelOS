import type {
  BudgetStyle,
  DailyRhythm,
  DiscoverDestination,
  TravelInterest,
  TravelStyle,
  TripIntent,
  TripPace,
  TypicalTravelParty,
} from '@/domain/entities';

/**
 * A source that supports one or more facts used in the
 * curated Discover catalogue.
 *
 * Curated does not mean invented.
 * Every catalogue destination must retain explicit provenance.
 */
export interface DiscoverCatalogueEvidence {
  label: string;
  url: string;

  /**
   * ISO calendar date:
   * YYYY-MM-DD
   */
  checkedAt: string;
}

/**
 * Explicit editorial fit metadata used for matching.
 *
 * These are catalogue assertions, not AI-generated facts.
 */
export interface DiscoverCatalogueFitProfile {
  intents: TripIntent[];

  interests: TravelInterest[];

  paces: TripPace[];

  travelStyles: TravelStyle[];

  dailyRhythms: DailyRhythm[];

  parties: TypicalTravelParty[];

  /**
   * Empty means this dimension is not used for matching.
   */
  budgetStyles: BudgetStyle[];
}

/**
 * Optional source-backed timing information.
 */
export interface DiscoverCatalogueTimingProfile {
  /**
   * Calendar month numbers:
   * 1 = January, 12 = December.
   */
  supportedMonths: number[];
}

/**
 * One grounded destination in the TravelOS Discover catalogue.
 */
export interface DiscoverCatalogueRecord {
  id: string;

  destination: DiscoverDestination;

  fit: DiscoverCatalogueFitProfile;

  timing?: DiscoverCatalogueTimingProfile;

  evidence: DiscoverCatalogueEvidence[];
}

const CHECKED_AT = '2026-08-29';

/**
 * Initial grounded TravelOS Discover catalogue.
 *
 * V1 deliberately starts compact.
 *
 * Important:
 * - destinations are real
 * - coordinates are explicit
 * - AI is not a destination source
 * - budget fit is currently not scored
 * - seasonality is currently not scored
 */
export const CURATED_DISCOVER_CATALOGUE:
  readonly DiscoverCatalogueRecord[] = [
    {
      id: 'pt-lisbon',

      destination: {
        name: 'Lisbon',
        countryCode: 'PT',
        latitude: 38.7223,
        longitude: -9.1393,
        timezone: 'Europe/Lisbon',
        currencyCode: 'EUR',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'social',
          'romantic',
          'family',
        ],

        interests: [
          'food',
          'culture',
          'nature',
          'beaches',
          'nightlife',
          'shopping',
        ],

        paces: [
          'balanced',
          'full',
        ],

        travelStyles: [
          'local',
          'iconic',
          'mix',
        ],

        dailyRhythms: [
          'flexible',
          'night',
        ],

        parties: [
          'solo',
          'couple',
          'friends',
          'family',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'Visit Lisboa — Discover Lisbon',
          url: 'https://www.visitlisboa.com/en/regions/lisbon',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'Visit Lisboa — Why Lisbon?',
          url: 'https://www.visitlisboa.com/en/p/why-lisbon',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'pt-porto',

      destination: {
        name: 'Porto',
        countryCode: 'PT',
        latitude: 41.1579,
        longitude: -8.6291,
        timezone: 'Europe/Lisbon',
        currencyCode: 'EUR',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'romantic',
        ],

        interests: [
          'food',
          'culture',
          'nature',
          'shopping',
        ],

        paces: [
          'slow',
          'balanced',
        ],

        travelStyles: [
          'local',
          'mix',
        ],

        dailyRhythms: [
          'morning',
          'flexible',
        ],

        parties: [
          'solo',
          'couple',
          'friends',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'Visit Porto — Official Guide',
          url: 'https://visitporto.travel/en-GB/',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'Visit Porto — Districts',
          url: 'https://visitporto.travel/en-GB/districts',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'es-barcelona',

      destination: {
        name: 'Barcelona',
        countryCode: 'ES',
        latitude: 41.3874,
        longitude: 2.1686,
        timezone: 'Europe/Madrid',
        currencyCode: 'EUR',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'social',
          'family',
        ],

        interests: [
          'food',
          'culture',
          'beaches',
          'nightlife',
          'shopping',
          'adventure',
        ],

        paces: [
          'balanced',
          'full',
        ],

        travelStyles: [
          'local',
          'iconic',
          'mix',
        ],

        dailyRhythms: [
          'flexible',
          'night',
        ],

        parties: [
          'solo',
          'couple',
          'friends',
          'family',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'Barcelona Turisme — Why Barcelona?',
          url: 'https://professional.barcelonaturisme.com/en/travel-trade/why-barcelona',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'it-rome',

      destination: {
        name: 'Rome',
        countryCode: 'IT',
        latitude: 41.9028,
        longitude: 12.4964,
        timezone: 'Europe/Rome',
        currencyCode: 'EUR',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'romantic',
          'family',
        ],

        interests: [
          'food',
          'culture',
          'nightlife',
          'shopping',
        ],

        paces: [
          'balanced',
          'full',
        ],

        travelStyles: [
          'iconic',
          'mix',
        ],

        dailyRhythms: [
          'morning',
          'flexible',
          'night',
        ],

        parties: [
          'solo',
          'couple',
          'friends',
          'family',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'Turismo Roma — The City',
          url: 'https://www.turismoroma.it/en/page/city',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'Turismo Roma — Traditional Cuisine',
          url: 'https://turismoroma.it/en/page/traditional-cuisine',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'Turismo Roma — Nightlife',
          url: 'https://www.turismoroma.it/en/page/nightlife',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'nl-amsterdam',

      destination: {
        name: 'Amsterdam',
        countryCode: 'NL',
        latitude: 52.3676,
        longitude: 4.9041,
        timezone: 'Europe/Amsterdam',
        currencyCode: 'EUR',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'social',
          'family',
        ],

        interests: [
          'food',
          'culture',
          'nature',
          'nightlife',
          'shopping',
        ],

        paces: [
          'balanced',
          'full',
        ],

        travelStyles: [
          'local',
          'iconic',
          'mix',
        ],

        dailyRhythms: [
          'flexible',
          'night',
        ],

        parties: [
          'solo',
          'couple',
          'friends',
          'family',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'I amsterdam — Neighbourhoods',
          url: 'https://www.iamsterdam.com/en/explore/neighbourhoods',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'I amsterdam — Amsterdam Like a Local',
          url: 'https://www.iamsterdam.com/en/see-and-do/amsterdam-like-a-local',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'I amsterdam — Clubbing and Nightlife',
          url: 'https://www.iamsterdam.com/en/whats-on/clubbing-and-nightlife',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'at-vienna',

      destination: {
        name: 'Vienna',
        countryCode: 'AT',
        latitude: 48.2082,
        longitude: 16.3738,
        timezone: 'Europe/Vienna',
        currencyCode: 'EUR',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'romantic',
          'family',
        ],

        interests: [
          'food',
          'culture',
          'shopping',
        ],

        paces: [
          'slow',
          'balanced',
        ],

        travelStyles: [
          'local',
          'iconic',
          'mix',
        ],

        dailyRhythms: [
          'morning',
          'flexible',
        ],

        parties: [
          'solo',
          'couple',
          'friends',
          'family',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'Vienna.info — Official Travel Guide',
          url: 'https://www.wien.info/en',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'Vienna.info — Districts to Savor',
          url: 'https://www.wien.info/en/dine-drink/markets/districts-to-savor-344620',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'dk-copenhagen',

      destination: {
        name: 'Copenhagen',
        countryCode: 'DK',
        latitude: 55.6761,
        longitude: 12.5683,
        timezone: 'Europe/Copenhagen',
        currencyCode: 'DKK',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'social',
          'family',
        ],

        interests: [
          'food',
          'culture',
          'nature',
          'nightlife',
          'shopping',
        ],

        paces: [
          'slow',
          'balanced',
        ],

        travelStyles: [
          'local',
          'mix',
        ],

        dailyRhythms: [
          'morning',
          'flexible',
          'night',
        ],

        parties: [
          'solo',
          'couple',
          'friends',
          'family',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'Visit Copenhagen — Official Guide',
          url: 'https://www.visitcopenhagen.com/',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'Visit Copenhagen — Neighbourhood Guide',
          url: 'https://www.visitcopenhagen.com/copenhagen/areas/neighborhoods/the-copenhagen-neighbourhood-guide',
          checkedAt: CHECKED_AT,
        },
        {
          label: 'Visit Copenhagen — Copenhagen Lifestyle',
          url: 'https://www.visitcopenhagen.com/copenhagen/this-is-copenhagen/about/breathe-in-the-copenhagen-lifestyle',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'cz-prague',

      destination: {
        name: 'Prague',
        countryCode: 'CZ',
        latitude: 50.0755,
        longitude: 14.4378,
        timezone: 'Europe/Prague',
        currencyCode: 'CZK',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'romantic',
          'social',
        ],

        interests: [
          'food',
          'culture',
          'nightlife',
          'shopping',
        ],

        paces: [
          'balanced',
          'full',
        ],

        travelStyles: [
          'iconic',
          'mix',
        ],

        dailyRhythms: [
          'flexible',
          'night',
        ],

        parties: [
          'solo',
          'couple',
          'friends',
          'family',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'Prague City Tourism — Discover Prague',
          url: 'https://prague.eu/en/discover/',
          checkedAt: CHECKED_AT,
        },
      ],
    },
  ];