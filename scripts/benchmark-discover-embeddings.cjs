'use strict';

/**
 * Semantic Discover V1 embedding benchmark.
 *
 * Embeds the grounded Discover corpus and brief-style queries
 * (English and Greek) with a local Ollama embedding model, then
 * measures retrieval quality against gold sets derived ONLY from
 * the corpus's own explicit fit tags. No destination, tag, or
 * relevance judgment is invented outside the grounded records.
 *
 * Usage:
 *   npx tsc --project tsconfig.test.json
 *   node scripts/benchmark-discover-embeddings.cjs [--models=bge-m3[,other]]
 *
 * Requires a running local Ollama with the model(s) pulled.
 * Results are printed and written to docs/benchmarks/.
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

const OUT_DIR = path.join(
  __dirname,
  '..',
  'docs',
  'benchmarks',
);

/**
 * Scored queries pair one English and one Greek phrasing of the
 * same explicit need. `requires` lists fit-tag values a record
 * must ALL contain to count as gold. Gold sets are computed from
 * the corpus at runtime, never hardcoded.
 */
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

/**
 * Probe queries are reported but not scored. Bergen is grounded
 * without fit tags, so tag-based gold cannot exist for it; these
 * probes show whether semantic retrieval can still surface it.
 */
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

function parseModels() {
  const flag = process.argv.find((argument) =>
    argument.startsWith('--models='),
  );

  if (!flag) {
    return ['bge-m3'];
  }

  return flag
    .slice('--models='.length)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function loadCorpus() {
  if (!fs.existsSync(CORPUS_MODULE)) {
    throw new Error(
      'Compiled corpus not found. Run: npx tsc --project tsconfig.test.json',
    );
  }

  const {
    loadGroundedDiscoverCorpus,
  } = require(CORPUS_MODULE);

  return loadGroundedDiscoverCorpus();
}

/**
 * Document text uses only grounded facts already present in the
 * record: name, country code, and explicit fit tags when present.
 */
function recordText(record) {
  const heading = record.destination.countryCode
    ? `${record.destination.name}, ${record.destination.countryCode}`
    : record.destination.name;

  if (!record.fit) {
    return heading;
  }

  return [
    heading,
    `Trip intents: ${record.fit.intents.join(', ')}`,
    `Interests: ${record.fit.interests.join(', ')}`,
    `Pace: ${record.fit.paces.join(', ')}`,
    `Travel style: ${record.fit.travelStyles.join(', ')}`,
    `Daily rhythm: ${record.fit.dailyRhythms.join(', ')}`,
    `Typical party: ${record.fit.parties.join(', ')}`,
  ].join('. ');
}

function isGold(record, requires) {
  if (!record.fit) {
    return false;
  }

  return Object.entries(requires).every(
    ([dimension, values]) =>
      values.every((value) =>
        record.fit[dimension].includes(value),
      ),
  );
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
    Number(process.hrtime.bigint() - startedAt) /
    1_000_000;

  return { response, elapsedMs };
}

/**
 * Embed inputs with /api/embed (batch), falling back to the
 * legacy /api/embeddings endpoint when unavailable.
 */
async function embed(model, inputs) {
  const { response, elapsedMs } = await postJson(
    `${OLLAMA_BASE_URL}/api/embed`,
    { model, input: inputs },
  );

  if (response.ok) {
    const payload = await response.json();

    if (
      !Array.isArray(payload.embeddings) ||
      payload.embeddings.length !== inputs.length
    ) {
      throw new Error(
        `Ollama /api/embed returned ${payload.embeddings?.length ?? 0} vectors for ${inputs.length} inputs`,
      );
    }

    return {
      vectors: payload.embeddings,
      elapsedMs,
    };
  }

  if (response.status !== 404) {
    throw new Error(
      `Ollama /api/embed failed: ${response.status} ${await response.text()}`,
    );
  }

  const vectors = [];
  let totalMs = 0;

  for (const input of inputs) {
    const legacy = await postJson(
      `${OLLAMA_BASE_URL}/api/embeddings`,
      { model, prompt: input },
    );

    if (!legacy.response.ok) {
      throw new Error(
        `Ollama /api/embeddings failed: ${legacy.response.status}`,
      );
    }

    const payload = await legacy.response.json();
    vectors.push(payload.embedding);
    totalMs += legacy.elapsedMs;
  }

  return { vectors, elapsedMs: totalMs };
}

function normalize(vector) {
  const magnitude = Math.sqrt(
    vector.reduce(
      (sum, value) => sum + value * value,
      0,
    ),
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

function rank(queryVector, documents) {
  return documents
    .map((document) => ({
      recordId: document.recordId,
      name: document.name,
      score: dot(queryVector, document.vector),
    }))
    .sort((left, right) => right.score - left.score);
}

function recallAt(k, ranked, goldIds) {
  if (goldIds.size === 0) {
    return null;
  }

  const hits = ranked
    .slice(0, k)
    .filter((entry) => goldIds.has(entry.recordId))
    .length;

  return hits / Math.min(k, goldIds.size);
}

function reciprocalRank(ranked, goldIds) {
  const index = ranked.findIndex((entry) =>
    goldIds.has(entry.recordId),
  );

  return index < 0 ? 0 : 1 / (index + 1);
}

function average(values) {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

async function fetchModelInfo(model) {
  const tagsResponse = await fetch(
    `${OLLAMA_BASE_URL}/api/tags`,
  );
  const tags = await tagsResponse.json();

  const installed = (tags.models ?? []).find(
    (entry) =>
      entry.name === model ||
      entry.name === `${model}:latest`,
  );

  const psResponse = await fetch(
    `${OLLAMA_BASE_URL}/api/ps`,
  );
  const ps = await psResponse.json();

  const loaded = (ps.models ?? []).find(
    (entry) =>
      entry.name === model ||
      entry.name === `${model}:latest`,
  );

  return {
    diskBytes: installed?.size ?? null,
    loadedBytes: loaded?.size ?? null,
    loadedVramBytes: loaded?.size_vram ?? null,
  };
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) {
    return 'unknown';
  }

  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

async function benchmarkModel(model, corpus) {
  const documents = corpus.records.map((record) => ({
    recordId: record.id,
    name: record.destination.name,
    text: recordText(record),
  }));

  const goldByQuery = SCORED_QUERIES.map((query) => {
    const gold = corpus.records
      .filter((record) =>
        isGold(record, query.requires),
      )
      .map((record) => record.id);

    if (gold.length === 0) {
      throw new Error(
        `Scored query "${query.id}" has an empty gold set; fix the query or the corpus tags.`,
      );
    }

    return { queryId: query.id, gold };
  });

  const documentEmbedding = await embed(
    model,
    documents.map((document) => document.text),
  );

  const embeddedDocuments = documents.map(
    (document, index) => ({
      ...document,
      vector: normalize(
        documentEmbedding.vectors[index],
      ),
    }),
  );

  const queryResults = [];
  const queryLatencies = [];

  for (const query of [
    ...SCORED_QUERIES,
    ...PROBE_QUERIES,
  ]) {
    const embedded = await embed(model, [query.text]);
    queryLatencies.push(embedded.elapsedMs);

    const ranked = rank(
      normalize(embedded.vectors[0]),
      embeddedDocuments,
    );

    if (query.requires) {
      const goldIds = new Set(
        goldByQuery.find(
          (entry) => entry.queryId === query.id,
        ).gold,
      );

      queryResults.push({
        id: query.id,
        language: query.language,
        kind: 'scored',
        text: query.text,
        gold: [...goldIds],
        recallAt3: recallAt(3, ranked, goldIds),
        recallAt5: recallAt(5, ranked, goldIds),
        reciprocalRank: reciprocalRank(
          ranked,
          goldIds,
        ),
        top5: ranked.slice(0, 5),
      });
    } else {
      const watchedIndex = ranked.findIndex(
        (entry) =>
          entry.recordId === query.watchRecordId,
      );

      queryResults.push({
        id: query.id,
        language: query.language,
        kind: 'probe',
        text: query.text,
        watchRecordId: query.watchRecordId,
        watchedRank: watchedIndex + 1,
        top5: ranked.slice(0, 5),
      });
    }
  }

  const scored = queryResults.filter(
    (result) => result.kind === 'scored',
  );

  const byLanguage = ['en', 'el'].map((language) => {
    const subset = scored.filter(
      (result) => result.language === language,
    );

    return {
      language,
      queries: subset.length,
      averageRecallAt3: average(
        subset.map((result) => result.recallAt3),
      ),
      averageRecallAt5: average(
        subset.map((result) => result.recallAt5),
      ),
      averageReciprocalRank: average(
        subset.map(
          (result) => result.reciprocalRank,
        ),
      ),
    };
  });

  const modelInfo = await fetchModelInfo(model);

  return {
    model,
    ollamaBaseUrl: OLLAMA_BASE_URL,
    generatedAt: new Date().toISOString(),
    corpusSize: documents.length,
    embeddingDimension:
      documentEmbedding.vectors[0].length,
    documentBatchMs: Math.round(
      documentEmbedding.elapsedMs,
    ),
    documentAverageMs: Math.round(
      documentEmbedding.elapsedMs /
        documents.length,
    ),
    queryLatencyMs: {
      min: Math.round(Math.min(...queryLatencies)),
      average: Math.round(
        average(queryLatencies),
      ),
      max: Math.round(Math.max(...queryLatencies)),
    },
    modelInfo,
    byLanguage,
    queries: queryResults,
    documents: documents.map((document) => ({
      recordId: document.recordId,
      text: document.text,
    })),
  };
}

function printReport(result) {
  console.log(`\n=== ${result.model} ===`);
  console.log(
    `corpus ${result.corpusSize} docs, dimension ${result.embeddingDimension}`,
  );
  console.log(
    `docs batch ${result.documentBatchMs} ms (${result.documentAverageMs} ms/doc), query ${result.queryLatencyMs.min}/${result.queryLatencyMs.average}/${result.queryLatencyMs.max} ms (min/avg/max)`,
  );
  console.log(
    `disk ${formatBytes(result.modelInfo.diskBytes)}, loaded ${formatBytes(result.modelInfo.loadedBytes)}, vram ${formatBytes(result.modelInfo.loadedVramBytes)}`,
  );

  for (const language of result.byLanguage) {
    console.log(
      `[${language.language}] recall@3 ${language.averageRecallAt3?.toFixed(2)}, recall@5 ${language.averageRecallAt5?.toFixed(2)}, MRR ${language.averageReciprocalRank?.toFixed(2)}`,
    );
  }

  for (const query of result.queries) {
    if (query.kind === 'scored') {
      console.log(
        `\n${query.id} — recall@3 ${query.recallAt3?.toFixed(2)}, MRR ${query.reciprocalRank.toFixed(2)}, gold [${query.gold.join(', ')}]`,
      );
    } else {
      console.log(
        `\n${query.id} — probe, ${query.watchRecordId} ranked #${query.watchedRank}`,
      );
    }

    for (const entry of query.top5) {
      console.log(
        `   ${entry.score.toFixed(4)}  ${entry.name} (${entry.recordId})`,
      );
    }
  }
}

async function main() {
  const models = parseModels();
  const corpus = loadCorpus();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const model of models) {
    const result = await benchmarkModel(
      model,
      corpus,
    );

    printReport(result);

    const day = result.generatedAt.slice(0, 10);
    const safeModel = model.replace(
      /[^a-z0-9.-]/gi,
      '-',
    );
    const outPath = path.join(
      OUT_DIR,
      `${day}-discover-embeddings-${safeModel}.json`,
    );

    fs.writeFileSync(
      outPath,
      `${JSON.stringify(result, null, 2)}\n`,
    );

    console.log(`\nSaved ${outPath}`);
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
