const fs = require('node:fs');
const path = require('node:path');

const { z } = require('zod');

const DEFAULT_ARTIFACT_PATH = path.join(
  __dirname,
  'data',
  'discover-corpus-embeddings.json',
);

const retrieveRequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  contentHash: z.string().trim().min(1).max(64),
  limit: z.number().int().min(1).max(20).optional(),
});

function loadDiscoverEmbeddingArtifact(
  filePath = DEFAULT_ARTIFACT_PATH,
) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = JSON.parse(
    fs.readFileSync(filePath, 'utf8'),
  );

  return assertDiscoverEmbeddingArtifact(raw);
}

function assertDiscoverEmbeddingArtifact(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Discover embeddings artifact is invalid');
  }

  if (
    value.version !== 1 ||
    typeof value.model !== 'string' ||
    !value.model ||
    typeof value.contentHash !== 'string' ||
    !value.contentHash ||
    !Number.isInteger(value.dimension) ||
    value.dimension <= 0 ||
    !Array.isArray(value.documents) ||
    value.documents.length === 0
  ) {
    throw new Error('Discover embeddings artifact is invalid');
  }

  const identities = new Set();

  const documents = value.documents.map((document) => {
    if (
      !document ||
      typeof document !== 'object' ||
      typeof document.identity !== 'string' ||
      !document.identity.includes(':') ||
      !Array.isArray(document.vector) ||
      document.vector.length !== value.dimension
    ) {
      throw new Error(
        'Discover embeddings artifact contains an invalid document',
      );
    }

    if (identities.has(document.identity)) {
      throw new Error(
        `Discover embeddings artifact has a duplicate identity "${document.identity}"`,
      );
    }

    identities.add(document.identity);

    if (
      document.vector.some(
        (component) => !Number.isFinite(component),
      )
    ) {
      throw new Error(
        'Discover embeddings artifact contains a non-finite vector',
      );
    }

    return {
      identity: document.identity,
      vector: normalize(document.vector),
    };
  });

  return {
    version: value.version,
    model: value.model,
    dimension: value.dimension,
    contentHash: value.contentHash,
    documents,
  };
}

function parseDiscoverRetrieveRequest(body) {
  return retrieveRequestSchema.parse(body);
}

function rankDiscoverEmbeddings({
  artifact,
  queryVector,
  limit = 8,
}) {
  if (
    !Array.isArray(queryVector) ||
    queryVector.length !== artifact.dimension ||
    queryVector.some((component) => !Number.isFinite(component))
  ) {
    throw new Error('Query embedding dimension mismatch');
  }

  const query = normalize(queryVector);

  return artifact.documents
    .map((document) => ({
      identity: document.identity,
      score: Number(dot(query, document.vector).toFixed(6)),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.identity.localeCompare(right.identity);
    })
    .slice(0, limit);
}

function normalize(vector) {
  const magnitude = Math.sqrt(
    vector.reduce(
      (sum, value) => sum + value * value,
      0,
    ),
  );

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error('Cannot normalize an empty embedding vector');
  }

  return vector.map((value) => value / magnitude);
}

function dot(left, right) {
  let sum = 0;

  for (let index = 0; index < left.length; index += 1) {
    sum += left[index] * right[index];
  }

  return sum;
}

module.exports = {
  DEFAULT_ARTIFACT_PATH,
  assertDiscoverEmbeddingArtifact,
  loadDiscoverEmbeddingArtifact,
  parseDiscoverRetrieveRequest,
  rankDiscoverEmbeddings,
  retrieveRequestSchema,
};
