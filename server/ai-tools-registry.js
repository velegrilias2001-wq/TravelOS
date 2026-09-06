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
    name: 'travelChat',
    status: 'available',
    description:
      'Session Travel Chat: grounded retrieve + reply. Destination cards only from catalogue identities. No SQLite writes.',
  },
  {
    name: 'tripCopilot',
    status: 'available',
    description:
      'Trip-scoped proposals: readiness links, Plan Assist accept→addStop, free-time ideas display-only, import review door.',
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
    status: 'available',
    description:
      'Local-dev Directions proxy for Map polyline/ETA legs. Fail-closed without a provider key. System Maps deep links remain for turn-by-turn.',
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
    status: 'available',
    description:
      'Confirmation-photo OCR via local-dev Vision proxy. Returns text for import review claims only — never writes bookings.',
  },
  {
    name: 'rerankGroundedDiscoverCandidates',
    status: 'available',
    description:
      'Optional listwise reorder of already-retrieved grounded identities (qwen). Fail-closed; no BGE install.',
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
