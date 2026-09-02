import type {
  DiscoverJourneyRecord,
} from '../../services/discover-journeys';

const CHECKED_AT = '2026-09-02';

/**
 * Ready-made journey ideas.
 *
 * These are editorial packages over grounded catalogue
 * destinations. They are not Trips and do not invent
 * itinerary stops, transport, or calendar dates.
 */
export const CURATED_JOURNEY_RECORDS:
  readonly DiscoverJourneyRecord[] = [
  {
    id: 'slow-porto',
    title: 'Slow days in Porto',
    summary:
      'A grounded Porto idea with a slow, romantic catalogue fit. This is not an itinerary. Nothing is saved until you confirm Create Trip.',
    destinationIdentities: [
      'curated:pt-porto',
    ],
    intent: 'romantic',
    pace: 'slow',
    evidence: [
      {
        label: 'Visit Porto — Official Guide',
        url: 'https://visitporto.travel/en-GB/',
        checkedAt: CHECKED_AT,
      },
    ],
  },
  {
    id: 'lisbon-porto',
    title: 'Lisbon and Porto',
    summary:
      'Two grounded Portuguese cities from the catalogue. Create Trip can currently confirm one destination; the second city stays an idea until you add it yourself.',
    destinationIdentities: [
      'curated:pt-lisbon',
      'curated:pt-porto',
    ],
    intent: 'explore',
    pace: 'balanced',
    evidence: [
      {
        label: 'Visit Lisboa — Discover Lisbon',
        url: 'https://www.visitlisboa.com/en/regions/lisbon',
        checkedAt: CHECKED_AT,
      },
      {
        label: 'Visit Porto — Official Guide',
        url: 'https://visitporto.travel/en-GB/',
        checkedAt: CHECKED_AT,
      },
    ],
  },
  {
    id: 'bergen-fjords',
    title: 'Bergen for the fjords',
    summary:
      'Bergen is in the catalogue as a fjord gateway without editorial fit tags. This idea does not invent a route, season, or day-by-day plan.',
    destinationIdentities: [
      'curated:no-bergen',
    ],
    evidence: [
      {
        label: 'Visit Norway — Facts about the fjords',
        url: 'https://www.visitnorway.com/things-to-do/nature-attractions/fjords/facts-about-the-fjords/',
        checkedAt: CHECKED_AT,
      },
      {
        label: 'Visit Bergen — Official Guide',
        url: 'https://en.visitbergen.com/',
        checkedAt: CHECKED_AT,
      },
    ],
  },
];
