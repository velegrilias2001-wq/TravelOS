import type {
  DiscoverGroundedPack,
} from '../../services/discover-source';

const CHECKED_AT = '2026-09-01';

/**
 * Second grounded Discover pack.
 *
 * Fitted records can be deterministically matched.
 * Bergen is grounded without editorial fit so it can live
 * in the corpus without being ranked until semantic retrieval.
 */
export const CURATED_SOUTH_CENTRAL_EUROPE_PACK:
  DiscoverGroundedPack = {
  id: 'curated-south-central-europe-v1',
  source: 'curated',
  records: [
    {
      id: 'gr-athens',

      destination: {
        name: 'Athens',
        countryCode: 'GR',
        latitude: 37.9838,
        longitude: 23.7275,
        timezone: 'Europe/Athens',
        currencyCode: 'EUR',
      },

      fit: {
        intents: [
          'explore',
          'food',
          'family',
        ],

        interests: [
          'food',
          'culture',
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
          label: 'This is Athens — Official City Guide',
          url: 'https://www.thisisathens.org/',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'es-seville',

      destination: {
        name: 'Seville',
        countryCode: 'ES',
        latitude: 37.3891,
        longitude: -5.9845,
        timezone: 'Europe/Madrid',
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
          'couple',
          'friends',
        ],

        budgetStyles: [],
      },

      evidence: [
        {
          label: 'Visit Seville — Official Tourism',
          url: 'https://www.visitasevilla.es/en',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'pl-krakow',

      destination: {
        name: 'Krakow',
        countryCode: 'PL',
        latitude: 50.0647,
        longitude: 19.945,
        timezone: 'Europe/Warsaw',
        currencyCode: 'PLN',
      },

      fit: {
        intents: [
          'explore',
          'food',
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
          label: 'Krakow.pl — Visit Krakow',
          url: 'https://www.krakow.pl/english/',
          checkedAt: CHECKED_AT,
        },
      ],
    },

    {
      id: 'no-bergen',

      destination: {
        name: 'Bergen',
        countryCode: 'NO',
        latitude: 60.3913,
        longitude: 5.3221,
      },

      timing: {
        supportedMonths: [
          1, 2, 3, 4, 5, 6,
          7, 8, 9, 10, 11, 12,
        ],
        evidence: [
          {
            label:
              'Visit Norway — Facts about the fjords',
            url: 'https://www.visitnorway.com/things-to-do/nature-attractions/fjords/facts-about-the-fjords/',
            checkedAt: '2026-09-02',
          },
        ],
      },

      evidence: [
        {
          label: 'Visit Bergen — Official Guide',
          url: 'https://en.visitbergen.com/',
          checkedAt: CHECKED_AT,
        },
      ],
    },
  ],
};
