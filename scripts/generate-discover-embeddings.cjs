'use strict';

/**
 * Generate the committed Discover corpus embedding artifact.
 *
 * The native app never loads this file. The local AI server
 * ranks against it. Stale vectors fail closed via content hash.
 *
 * Usage:
 *   npx tsc --project tsconfig.test.json
 *   node scripts/generate-discover-embeddings.cjs [--model=bge-m3]
 *
 * Requires a running local Ollama with the embedding model pulled.
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

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response;
}

async function embed(model, inputs) {
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

function roundVector(vector) {
  return vector.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error(
        'Ollama returned a non-finite embedding value',
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
    process.env.OLLAMA_EMBED_MODEL ||
    semantic.DISCOVER_EMBEDDING_MODEL_CANDIDATE;

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
      'Ollama returned an empty embedding vector',
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
