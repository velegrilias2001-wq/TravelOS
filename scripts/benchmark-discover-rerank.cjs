'use strict';

/**
 * Discover reranking benchmark.
 *
 * Compares embedding retrieval against a retrieve-then-rerank
 * pass. Gold sets come only from explicit corpus fit tags.
 * A BGE reranker is probed via Ollama /api/rerank when present;
 * this script does not pull or install models.
 *
 * Usage:
 *   npm run benchmark:discover-rerank
 *
 * Optional:
 *   --embed-model=bge-m3
 *   --rerank-model=qwen3:4b
 *   --top-k=8
 */

const fs = require('node:fs');
const path = require('node:path');

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ||
  'http://127.0.0.1:11434';

const CORPUS_MODULE = path.join(
  __dirname,
  '..',
  '.test-build',
  'src',
  'services',
  'discover-corpus.js',
);

const SEMANTIC_MODULE = path.join(
  __dirname,
  '..',
  '.test-build',
  'src',
  'services',
  'discover-semantic.js',
);

const RERANK_MODULE = path.join(
  __dirname,
  '..',
  '.test-build',
  'src',
  'services',
  'discover-rerank.js',
);

const SERVER_RERANK = path.join(
  __dirname,
  '..',
  'server',
  'discover-rerank.js',
);

const ARTIFACT_PATH = path.join(
  __dirname,
  '..',
  'server',
  'data',
  'discover-corpus-embeddings.json',
);

const OUT_DIR = path.join(
  __dirname,
  '..',
  'docs',
  'benchmarks',
);

const SCORED_QUERIES = [
  {
    id: 'romantic-slow-en',
    language: 'en',
    text: 'A romantic escape at a slow, unhurried pace',
    requires: {
      intents: ['romantic'],
      paces: ['slow'],
    },
  },
  {
    id: 'romantic-slow-el',
    language: 'el',
    text: 'Ρομαντική απόδραση με αργούς, χαλαρούς ρυθμούς',
    requires: {
      intents: ['romantic'],
      paces: ['slow'],
    },
  },
  {
    id: 'beach-nightlife-en',
    language: 'en',
    text: 'A city with beaches and lively nightlife for a group of friends',
    requires: {
      interests: ['beaches', 'nightlife'],
    },
  },
  {
    id: 'beach-nightlife-el',
    language: 'el',
    text: 'Πόλη με παραλίες και έντονη νυχτερινή ζωή για παρέα φίλων',
    requires: {
      interests: ['beaches', 'nightlife'],
    },
  },
  {
    id: 'slow-local-nature-en',
    language: 'en',
    text: 'A calm, local-feeling city close to nature',
    requires: {
      paces: ['slow'],
      travelStyles: ['local'],
      interests: ['nature'],
    },
  },
  {
    id: 'slow-local-nature-el',
    language: 'el',
    text: 'Ήρεμη πόλη με τοπικό χαρακτήρα κοντά στη φύση',
    requires: {
      paces: ['slow'],
      travelStyles: ['local'],
      interests: ['nature'],
    },
  },
  {
    id: 'family-nature-en',
    language: 'en',
    text: 'A family trip to a city with easy time in nature',
    requires: {
      intents: ['family'],
      interests: ['nature'],
    },
  },
  {
    id: 'family-nature-el',
    language: 'el',
    text: 'Οικογενειακό ταξίδι σε πόλη κοντά στη φύση',
    requires: {
      intents: ['family'],
      interests: ['nature'],
    },
  },
];

const PROBE_QUERIES = [
  {
    id: 'fjords-en',
    language: 'en',
    text: 'Fjords, mountains and dramatic nature in Norway',
    watchRecordId: 'no-bergen',
  },
  {
    id: 'fjords-el',
    language: 'el',
    text: 'Φιόρδ και άγρια φύση στη Νορβηγία',
    watchRecordId: 'no-bergen',
  },
];

function flagValue(name, fallback) {
  const flag = process.argv.find((argument) =>
    argument.startsWith(`--${name}=`),
  );

  if (!flag) {
    return fallback;
  }

  return flag.slice(`--${name}=`.length).trim() || fallback;
}

function loadModules() {
  for (const filePath of [
    CORPUS_MODULE,
    SEMANTIC_MODULE,
    RERANK_MODULE,
  ]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        'Compiled Discover modules not found. Run: npx tsc --project tsconfig.test.json',
      );
    }
  }

  return {
    loadGroundedDiscoverCorpus: require(CORPUS_MODULE)
      .loadGroundedDiscoverCorpus,
    semantic: require(SEMANTIC_MODULE),
    applyRerankedIdentities: require(RERANK_MODULE)
      .applyRerankedIdentities,
    serverRerank: require(SERVER_RERANK),
  };
}

function loadArtifact() {
  if (!fs.existsSync(ARTIFACT_PATH)) {
    throw new Error(
      'Embedding artifact not found. Run: npm run generate:discover-embeddings',
    );
  }

  return JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
}

function isGold(record, requires) {
  if (!record.fit) {
    return false;
  }

  return Object.entries(requires).every(([dimension, values]) =>
    values.every((value) => record.fit[dimension].includes(value)),
  );
}

function normalize(vector) {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );

  return vector.map((value) => value / magnitude);
}

function dot(left, right) {
  let sum = 0;

  for (let index = 0; index < left.length; index += 1) {
    sum += left[index] * right[index];
  }

  return sum;
}

function recallAt(k, rankedIds, goldIds) {
  if (goldIds.size === 0) {
    return null;
  }

  const hits = rankedIds
    .slice(0, k)
    .filter((identity) => goldIds.has(identity))
    .length;

  return hits / Math.min(k, goldIds.size);
}

function reciprocalRank(rankedIds, goldIds) {
  const index = rankedIds.findIndex((identity) =>
    goldIds.has(identity),
  );

  return index < 0 ? 0 : 1 / (index + 1);
}

function average(values) {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

function identityOf(record) {
  return `${record.source}:${record.id}`;
}

function recordIdFromIdentity(identity) {
  return identity.slice(identity.indexOf(':') + 1);
}

async function postJson(url, body) {
  const startedAt = process.hrtime.bigint();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const elapsedMs =
    Number(process.hrtime.bigint() - startedAt) / 1_000_000;

  return { response, elapsedMs };
}

async function embed(model, inputs) {
  const { response, elapsedMs } = await postJson(
    `${OLLAMA_BASE_URL}/api/embed`,
    { model, input: inputs },
  );

  if (!response.ok) {
    throw new Error(
      `Ollama /api/embed failed: ${response.status} ${await response.text()}`,
    );
  }

  const payload = await response.json();

  if (
    !Array.isArray(payload.embeddings) ||
    payload.embeddings.length !== inputs.length
  ) {
    throw new Error('Ollama returned an invalid embedding batch');
  }

  return {
    vectors: payload.embeddings,
    elapsedMs,
  };
}

function rankEmbeddings(queryVector, documents) {
  const query = normalize(queryVector);

  return documents
    .map((document) => ({
      identity: document.identity,
      name: document.name,
      text: document.text,
      score: dot(query, document.vector),
    }))
    .sort((left, right) => right.score - left.score);
}

async function probeOllamaRerank(model, query, documents) {
  const { response, elapsedMs } = await postJson(
    `${OLLAMA_BASE_URL}/api/rerank`,
    {
      model,
      query,
      documents: documents.map((document) => document.text),
    },
  );

  if (response.status === 404) {
    return {
      available: false,
      status: 404,
      elapsedMs,
      identities: null,
    };
  }

  if (!response.ok) {
    return {
      available: false,
      status: response.status,
      elapsedMs,
      error: await response.text(),
      identities: null,
    };
  }

  const payload = await response.json();
  const results = payload.results ?? payload.data ?? [];

  return {
    available: true,
    status: response.status,
    elapsedMs,
    identities: results.map((entry) => {
      const index =
        typeof entry.index === 'number' ? entry.index : -1;
      return documents[index]?.identity ?? null;
    }).filter(Boolean),
  };
}

function stripThink(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const closing = value.lastIndexOf('</think>');

  if (closing >= 0) {
    return value.slice(closing + '</think>'.length).trim();
  }

  return value.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function rerankWithChat({
  model,
  query,
  candidates,
  serverRerank,
  applyRerankedIdentities,
}) {
  const prompt = serverRerank.buildDiscoverRerankPrompt({
    query,
    candidates,
  });

  const { response, elapsedMs } = await postJson(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      model,
      stream: false,
      think: false,
      format: serverRerank.rerankResponseFormat,
      messages: [
        {
          role: 'system',
          content:
            'Follow TravelOS truth rules exactly. Return only the requested structured output.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
  );

  if (!response.ok) {
    throw new Error(
      `Ollama /api/chat failed: ${response.status} ${await response.text()}`,
    );
  }

  const payload = await response.json();
  const content = stripThink(payload?.message?.content);
  const proposed = serverRerank.parseDiscoverRerankResponse(content);
  const identities = applyRerankedIdentities(
    candidates.map((candidate) => candidate.identity),
    proposed,
  );

  return {
    identities,
    elapsedMs,
    raw: proposed,
  };
}

function summarizeLanguage(results, key) {
  return ['en', 'el'].map((language) => {
    const subset = results.filter(
      (result) =>
        result.kind === 'scored' && result.language === language,
    );

    return {
      language,
      queries: subset.length,
      averageRecallAt3: average(
        subset.map((result) => result[key].recallAt3),
      ),
      averageRecallAt5: average(
        subset.map((result) => result[key].recallAt5),
      ),
      averageReciprocalRank: average(
        subset.map((result) => result[key].reciprocalRank),
      ),
    };
  });
}

function scoreRanking(rankedIds, goldIds) {
  return {
    recallAt3: recallAt(3, rankedIds, goldIds),
    recallAt5: recallAt(5, rankedIds, goldIds),
    reciprocalRank: reciprocalRank(rankedIds, goldIds),
    top5: rankedIds.slice(0, 5),
  };
}

async function main() {
  const embedModel = flagValue('embed-model', 'bge-m3');
  const rerankModel = flagValue(
    'rerank-model',
    process.env.OLLAMA_MODEL || 'qwen3:4b',
  );
  const topK = Number(flagValue('top-k', '8'));

  const {
    loadGroundedDiscoverCorpus,
    semantic,
    applyRerankedIdentities,
    serverRerank,
  } = loadModules();

  const corpus = loadGroundedDiscoverCorpus();
  const artifact = loadArtifact();
  const documentsByIdentity = new Map(
    semantic
      .buildDiscoverEmbeddingDocuments(corpus.records)
      .map((document) => [document.identity, document]),
  );

  const namesByIdentity = new Map(
    corpus.records.map((record) => [
      identityOf(record),
      record.destination.name,
    ]),
  );

  const embeddingDocuments = artifact.documents.map((document) => {
    const live = documentsByIdentity.get(document.identity);

    if (!live) {
      throw new Error(
        `Artifact identity ${document.identity} is not in the live corpus`,
      );
    }

    return {
      identity: document.identity,
      name: namesByIdentity.get(document.identity) ?? document.identity,
      text: live.text,
      vector: normalize(document.vector),
    };
  });

  const ollamaRerankProbe = await probeOllamaRerank(
    'bge-reranker-v2-m3',
    'A romantic escape at a slow, unhurried pace',
    embeddingDocuments.slice(0, 3),
  );

  const queryResults = [];

  for (const query of [...SCORED_QUERIES, ...PROBE_QUERIES]) {
    const embedded = await embed(embedModel, [query.text]);
    const ranked = rankEmbeddings(
      embedded.vectors[0],
      embeddingDocuments,
    );
    const retrieved = ranked.slice(0, topK);
    const retrievedIds = retrieved.map((entry) => entry.identity);

    let chatRerank = null;
    let chatError = null;

    try {
      chatRerank = await rerankWithChat({
        model: rerankModel,
        query: query.text,
        candidates: retrieved.map((entry) => ({
          identity: entry.identity,
          text: entry.text,
        })),
        serverRerank,
        applyRerankedIdentities,
      });
    } catch (error) {
      chatError = error instanceof Error ? error.message : String(error);
    }

    const rerankedIds = chatRerank?.identities ?? retrievedIds;

    if (query.requires) {
      const gold = corpus.records
        .filter((record) => isGold(record, query.requires))
        .map((record) => identityOf(record));

      const goldIds = new Set(gold);

      queryResults.push({
        id: query.id,
        language: query.language,
        kind: 'scored',
        text: query.text,
        gold,
        retrieveMs: Math.round(embedded.elapsedMs),
        rerankMs: chatRerank
          ? Math.round(chatRerank.elapsedMs)
          : null,
        rerankError: chatError,
        embedding: scoreRanking(retrievedIds, goldIds),
        chatRerank: scoreRanking(rerankedIds, goldIds),
      });
    } else {
      const watchIdentity = `curated:${query.watchRecordId}`;

      queryResults.push({
        id: query.id,
        language: query.language,
        kind: 'probe',
        text: query.text,
        watchRecordId: query.watchRecordId,
        retrieveMs: Math.round(embedded.elapsedMs),
        rerankMs: chatRerank
          ? Math.round(chatRerank.elapsedMs)
          : null,
        rerankError: chatError,
        embedding: {
          watchedRank: retrievedIds.indexOf(watchIdentity) + 1,
          top5: retrievedIds.slice(0, 5),
        },
        chatRerank: {
          watchedRank: rerankedIds.indexOf(watchIdentity) + 1,
          top5: rerankedIds.slice(0, 5),
        },
      });
    }
  }

  const scored = queryResults.filter((result) => result.kind === 'scored');

  const report = {
    embedModel,
    rerankModel,
    topK,
    ollamaBaseUrl: OLLAMA_BASE_URL,
    generatedAt: new Date().toISOString(),
    corpusSize: embeddingDocuments.length,
    ollamaRerankApi: ollamaRerankProbe,
    embedding: {
      byLanguage: summarizeLanguage(queryResults, 'embedding'),
    },
    chatRerank: {
      byLanguage: summarizeLanguage(queryResults, 'chatRerank'),
      failures: scored.filter((result) => result.rerankError).length,
      averageRerankMs: average(
        scored
          .map((result) => result.rerankMs)
          .filter((value) => value !== null),
      ),
    },
    queries: queryResults.map((result) => {
      const named = (identities) =>
        identities.map((identity) => ({
          identity,
          recordId: recordIdFromIdentity(identity),
          name: namesByIdentity.get(identity) ?? identity,
        }));

      if (result.kind === 'scored') {
        return {
          ...result,
          embedding: {
            ...result.embedding,
            top5: named(result.embedding.top5),
          },
          chatRerank: {
            ...result.chatRerank,
            top5: named(result.chatRerank.top5),
          },
        };
      }

      return {
        ...result,
        embedding: {
          ...result.embedding,
          top5: named(result.embedding.top5),
        },
        chatRerank: {
          ...result.chatRerank,
          top5: named(result.chatRerank.top5),
        },
      };
    }),
  };

  printReport(report);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const day = report.generatedAt.slice(0, 10);
  const outPath = path.join(
    OUT_DIR,
    `${day}-discover-rerank-${rerankModel.replace(/[^a-z0-9.-]/gi, '-')}.json`,
  );
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nSaved ${outPath}`);
}

function formatMetric(value) {
  return value === null || value === undefined
    ? 'n/a'
    : value.toFixed(2);
}

function printReport(report) {
  console.log('\n=== Discover rerank ===');
  console.log(
    `embed ${report.embedModel}, chat-rerank ${report.rerankModel}, topK ${report.topK}`,
  );
  console.log(
    `Ollama /api/rerank available=${report.ollamaRerankApi.available} status=${report.ollamaRerankApi.status}`,
  );

  for (const language of report.embedding.byLanguage) {
    const rerank = report.chatRerank.byLanguage.find(
      (entry) => entry.language === language.language,
    );

    console.log(
      `[${language.language}] embed recall@3 ${formatMetric(language.averageRecallAt3)} / MRR ${formatMetric(language.averageReciprocalRank)} | chat-rerank recall@3 ${formatMetric(rerank?.averageRecallAt3)} / MRR ${formatMetric(rerank?.averageReciprocalRank)}`,
    );
  }

  console.log(
    `chat-rerank failures ${report.chatRerank.failures}, avg ${Math.round(report.chatRerank.averageRerankMs ?? 0)} ms`,
  );

  for (const query of report.queries) {
    if (query.kind === 'scored') {
      console.log(
        `\n${query.id} — embed r@3 ${formatMetric(query.embedding.recallAt3)} → chat r@3 ${formatMetric(query.chatRerank.recallAt3)}${query.rerankError ? ` (${query.rerankError})` : ''}`,
      );
    } else {
      console.log(
        `\n${query.id} — probe ${query.watchRecordId} embed #${query.embedding.watchedRank} → chat #${query.chatRerank.watchedRank}`,
      );
    }

    console.log(
      `   embed  ${query.embedding.top5.map((entry) => entry.name).join(', ')}`,
    );
    console.log(
      `   chat   ${query.chatRerank.top5.map((entry) => entry.name).join(', ')}`,
    );
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
