'use strict';

/**
 * Generate the committed Discover corpus embedding artifact.
 *
 * The native app never loads this file. The local AI server
 * ranks against it. Stale vectors fail closed via content hash.
 *
 * Usage:
 *   npx tsc --project tsconfig.test.json
 *   node scripts/generate-discover-embeddings.cjs [--model=…]
 *
 * Providers (pick one):
 *   Ollama (local-dev default):
 *     OLLAMA_BASE_URL=http://127.0.0.1:11434
 *   OpenAI-compatible (hosted / OpenAI API):
 *     AI_BASE_URL=https://api.openai.com/v1
 *     AI_API_KEY=…   (or HF_TOKEN)
 */

const fs = require('node:fs');
const path = require('node:path');

const OLLAMA_BASE_URL = (
  process.env.OLLAMA_BASE_URL ||
  'http://127.0.0.1:11434'
).replace(/\/+$/, '');

const OPENAI_BASE_URL = (
  process.env.AI_BASE_URL ||
  ''
)
  .trim()
  .replace(/\/+$/, '');

const OPENAI_API_KEY = (
  process.env.AI_API_KEY ||
  process.env.HF_TOKEN ||
  ''
).trim();

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

const OUT_PATH = path.join(
  __dirname,
  '..',
  'server',
  'data',
  'discover-corpus-embeddings.json',
);

function parseModel() {
  const flag = process.argv.find((argument) =>
    argument.startsWith('--model='),
  );

  if (!flag) {
    return null;
  }

  return flag.slice('--model='.length).trim() || null;
}

function resolveEmbedBackend() {
  if (OPENAI_BASE_URL && OPENAI_API_KEY) {
    return 'openai_compatible';
  }

  return 'ollama';
}

function loadModules() {
  if (
    !fs.existsSync(CORPUS_MODULE) ||
    !fs.existsSync(SEMANTIC_MODULE)
  ) {
    throw new Error(
      'Compiled Discover modules not found. Run: npx tsc --project tsconfig.test.json',
    );
  }

  const {
    loadGroundedDiscoverCorpus,
  } = require(CORPUS_MODULE);

  const semantic = require(SEMANTIC_MODULE);

  return {
    loadGroundedDiscoverCorpus,
    semantic,
  };
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  return response;
}

async function embedWithOllama(model, inputs) {
  const response = await postJson(
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
      model: payload.model || model,
      vectors: payload.embeddings,
    };
  }

  if (response.status !== 404) {
    throw new Error(
      `Ollama /api/embed failed: ${response.status} ${await response.text()}`,
    );
  }

  const vectors = [];

  for (const input of inputs) {
    const legacy = await postJson(
      `${OLLAMA_BASE_URL}/api/embeddings`,
      { model, prompt: input },
    );

    if (!legacy.ok) {
      throw new Error(
        `Ollama /api/embeddings failed: ${legacy.status}`,
      );
    }

    const payload = await legacy.json();
    vectors.push(payload.embedding);
  }

  return { model, vectors };
}

async function embedWithOpenAiCompatible(model, inputs) {
  const response = await postJson(
    `${OPENAI_BASE_URL}/embeddings`,
    { model, input: inputs },
    { Authorization: `Bearer ${OPENAI_API_KEY}` },
  );

  if (!response.ok) {
    throw new Error(
      `OpenAI-compatible /embeddings failed: ${response.status} ${await response.text()}`,
    );
  }

  const payload = await response.json();
  const rows = Array.isArray(payload.data)
    ? payload.data
        .slice()
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    : null;

  if (!rows || rows.length !== inputs.length) {
    throw new Error(
      `OpenAI-compatible /embeddings returned ${rows?.length ?? 0} vectors for ${inputs.length} inputs`,
    );
  }

  return {
    model: payload.model || model,
    vectors: rows.map((row) => row.embedding),
  };
}

async function embed(model, inputs) {
  const backend = resolveEmbedBackend();

  if (backend === 'openai_compatible') {
    return embedWithOpenAiCompatible(model, inputs);
  }

  return embedWithOllama(model, inputs);
}

function roundVector(vector) {
  return vector.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error(
        'Embedding provider returned a non-finite value',
      );
    }

    return Number(value.toFixed(6));
  });
}

async function main() {
  const {
    loadGroundedDiscoverCorpus,
    semantic,
  } = loadModules();

  const model =
    parseModel() ||
    process.env.AI_EMBEDDING_MODEL ||
    process.env.OLLAMA_EMBED_MODEL ||
    semantic.DISCOVER_EMBEDDING_MODEL_CANDIDATE;

  const backend = resolveEmbedBackend();
  console.log(`Embedding via ${backend} (${model})`);

  const corpus = loadGroundedDiscoverCorpus();
  const documents =
    semantic.buildDiscoverEmbeddingDocuments(
      corpus.records,
    );

  if (documents.length === 0) {
    throw new Error(
      'Grounded Discover corpus is empty; refusing to write embeddings.',
    );
  }

  const contentHash =
    semantic.hashDiscoverEmbeddingDocuments(
      model,
      documents,
    );

  const embedded = await embed(
    model,
    documents.map((document) => document.text),
  );

  const dimension = embedded.vectors[0]?.length;

  if (!dimension) {
    throw new Error(
      'Embedding provider returned an empty vector',
    );
  }

  const artifact = {
    version: semantic.DISCOVER_EMBEDDING_ARTIFACT_VERSION,
    model,
    dimension,
    contentHash,
    generatedAt: new Date().toISOString(),
    documents: documents.map((document, index) => {
      const vector = embedded.vectors[index];

      if (!Array.isArray(vector) || vector.length !== dimension) {
        throw new Error(
          `Embedding dimension mismatch for ${document.identity}`,
        );
      }

      return {
        identity: document.identity,
        text: document.text,
        vector: roundVector(vector),
      };
    }),
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
  );

  console.log(
    `Wrote ${artifact.documents.length} embeddings (${dimension}-d, ${model}) to ${OUT_PATH}`,
  );
  console.log(`contentHash ${contentHash}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
