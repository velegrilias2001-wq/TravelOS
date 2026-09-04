/**
 * Tool registry for a future agent loop.
 * Only lists capabilities that are real in TravelOS today, or stubs marked not_configured.
 * Tools never write SQLite directly — the native app owns confirmation and persistence.
 */

const AI_TOOLS = [
  {
    name: 'getCurrentTripContext',
    status: 'available',
    description:
      'Read-only trip / day / stop / booking snapshot already built by AI context builders.',
  },
  {
    name: 'getTravelDNA',
    status: 'available',
    description:
      'Explicit local Travel DNA preferences only. Nothing is inferred.',
  },
  {
    name: 'searchGroundedDiscoverCandidates',
    status: 'available',
    description:
      'Deterministic matcher plus optional semantic retrieve over the grounded catalogue.',
  },
  {
    name: 'explainGroundedDiscoverCandidate',
    status: 'available',
    description:
      'Opt-in grounded explanation of one catalogue candidate. Fail-closed on invention.',
  },
  {
    name: 'adviseFreeTimeGap',
    status: 'available',
    description:
      'Structured free-time ideas for a verified Plan gap. Does not insert stops.',
  },
  {
    name: 'getSavedPlaces',
    status: 'available',
    description:
      'Wishlist identities distinct from trips and World history.',
  },
  {
    name: 'searchPlaces',
    status: 'not_configured',
    description:
      'Live place provider search is not a TravelOS AI tool yet. Destination authoring uses the native picker.',
  },
  {
    name: 'getWeather',
    status: 'not_configured',
    description: 'No weather provider in tree.',
  },
  {
    name: 'getDirections',
    status: 'not_configured',
    description:
      'In-app routes/ETAs are parked. Saved-pin deep links to system maps remain outside AI tools.',
  },
  {
    name: 'searchEvents',
    status: 'not_configured',
    description: 'No events provider in tree.',
  },
  {
    name: 'transcribeAudio',
    status: 'not_configured',
    description: 'Voice / Whisper stays flagged off until explicitly enabled.',
  },
  {
    name: 'analyzeTravelImage',
    status: 'not_configured',
    description:
      'Vision / confirmation OCR stays parked. Import only extracts embedded iCalendar.',
  },
];

function listAiTools() {
  return AI_TOOLS.map((tool) => ({ ...tool }));
}

function getConfiguredAiTools() {
  return AI_TOOLS.filter(
    (tool) => tool.status === 'available',
  ).map((tool) => ({ ...tool }));
}

module.exports = {
  AI_TOOLS,
  listAiTools,
  getConfiguredAiTools,
};
