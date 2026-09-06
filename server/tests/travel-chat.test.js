const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TRAVEL_CHAT_ALLOWED_TOOLS,
  parseTravelChatRequest,
  parseTravelChatModelResponse,
  filterGroundedMatches,
  latestUserMessage,
} = require('../travel-chat');

test('travel chat allow-list stays read-only and discovery-scoped', () => {
  assert.ok(
    TRAVEL_CHAT_ALLOWED_TOOLS.includes(
      'searchGroundedDiscoverCandidates',
    ),
  );
  assert.ok(
    !TRAVEL_CHAT_ALLOWED_TOOLS.includes('createTrip'),
  );
  assert.ok(
    !TRAVEL_CHAT_ALLOWED_TOOLS.includes('writeSqlite'),
  );
});

test('parseTravelChatRequest requires a user message history', () => {
  const parsed = parseTravelChatRequest({
    messages: [
      { role: 'user', content: 'Slow coastal cities' },
    ],
    contentHash: 'abc',
  });

  assert.equal(
    latestUserMessage(parsed.messages),
    'Slow coastal cities',
  );

  assert.throws(() =>
    parseTravelChatRequest({
      messages: [],
      contentHash: 'abc',
    }),
  );
});

test('parseTravelChatModelResponse rejects empty replies', () => {
  assert.deepEqual(
    parseTravelChatModelResponse({
      reply: '  Porto looks calm.  ',
    }),
    { reply: 'Porto looks calm.' },
  );

  assert.throws(() =>
    parseTravelChatModelResponse({ reply: '   ' }),
  );
});

test('filterGroundedMatches drops invented identities', () => {
  const filtered = filterGroundedMatches(
    [
      { identity: 'catalogue:porto', score: 0.9 },
      { identity: 'invented:atlantis', score: 0.99 },
      { identity: 'catalogue:lisbon', score: 0.8 },
    ],
    ['catalogue:porto', 'catalogue:lisbon'],
  );

  assert.deepEqual(
    filtered.map((match) => match.identity),
    ['catalogue:porto', 'catalogue:lisbon'],
  );
});
