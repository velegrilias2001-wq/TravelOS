require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  ZodError,
} = require('zod');

const {
  chatWithOllama,
  embedWithOllama,
} = require('./ollama-provider');

const {
  buildFreeTimeAdvisorPrompt,
  freeTimeResponseFormat,
  parseFreeTimeAdvisorResponse,
} = require('./free-time-advisor');

const {
  loadDiscoverEmbeddingArtifact,
  parseDiscoverRetrieveRequest,
  rankDiscoverEmbeddings,
} = require('./discover-retrieve');

const {
  buildDiscoverExplainPrompt,
  explainResponseFormat,
  parseDiscoverExplainRequest,
  parseDiscoverExplainResponse,
} = require('./discover-explain');

let discoverEmbeddings = null;

try {
  discoverEmbeddings =
    loadDiscoverEmbeddingArtifact();
} catch (error) {
  console.error(error);
}

const app = express();

const PORT = Number(
  process.env.PORT || 8787,
);

app.use(cors());

app.use(
  express.json({
    limit: '1mb',
  }),
);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'travelos-ai',
  });
});

app.get('/ai/health', async (_req, res) => {
  try {
    const result =
      await chatWithOllama({
        messages: [
          {
            role: 'user',
            content:
              'Reply exactly TRAVELOS_AI_OK',
          },
        ],
      });

    res.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      response: result.content,
    });
  } catch (error) {
    console.error(error);

    res.status(503).json({
      ok: false,
      error: 'ai_provider_unavailable',
    });
  }
});

app.post(
  '/ai/free-time',
  async (req, res) => {
    try {
      const {
        prompt,
        gap,
      } =
        buildFreeTimeAdvisorPrompt(
          req.body,
        );

      const result =
        await chatWithOllama({
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

          format:
            freeTimeResponseFormat,
        });

      const parsed =
        parseFreeTimeAdvisorResponse(
          result.content,
          gap.durationMinutes,
        );

      res.json({
        ok: true,

        provider:
          result.provider,

        model:
          result.model,

        verifiedGap: {
          startTime:
            gap.startTime,

          endTime:
            gap.endTime,

          durationMinutes:
            gap.durationMinutes,
        },

        suggestions:
          parsed.suggestions,
      });
    } catch (error) {
      if (
        error instanceof ZodError
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            error:
              'invalid_request',
          });
      }

      const message =
        error instanceof Error
          ? error.message
          : '';

      if (
        message ===
          'Requested itinerary day was not found' ||
        message ===
          'Requested free-time gap was not found' ||
        message ===
          'Free-time boundary moments were not found'
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            error:
              'invalid_free_time_context',
          });
      }

      if (
        message ===
          'AI returned invalid JSON' ||
        message ===
          'AI suggestion exceeds the verified free-time gap'
      ) {
        console.error(error);

        return res
          .status(502)
          .json({
            ok: false,
            error:
              'invalid_ai_response',
          });
      }

      console.error(error);

      return res
        .status(503)
        .json({
          ok: false,
          error:
            'ai_provider_unavailable',
        });
    }
  },
);

app.post(
  '/ai/discover-retrieve',
  async (req, res) => {
    try {
      if (!discoverEmbeddings) {
        return res
          .status(503)
          .json({
            ok: false,
            error:
              'embeddings_unavailable',
          });
      }

      const request =
        parseDiscoverRetrieveRequest(
          req.body,
        );

      if (
        request.contentHash !==
        discoverEmbeddings.contentHash
      ) {
        return res
          .status(409)
          .json({
            ok: false,
            error:
              'stale_embeddings',
          });
      }

      const embedded =
        await embedWithOllama({
          input: request.query,
          model:
            discoverEmbeddings.model,
        });

      const matches =
        rankDiscoverEmbeddings({
          artifact:
            discoverEmbeddings,
          queryVector:
            embedded.embeddings[0],
          limit:
            request.limit ?? 8,
        });

      res.json({
        ok: true,
        provider: embedded.provider,
        model: embedded.model,
        matches,
      });
    } catch (error) {
      if (
        error instanceof ZodError
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            error:
              'invalid_request',
          });
      }

      const message =
        error instanceof Error
          ? error.message
          : '';

      if (
        message ===
          'Query embedding dimension mismatch' ||
        message ===
          'Cannot normalize an empty embedding vector'
      ) {
        console.error(error);

        return res
          .status(502)
          .json({
            ok: false,
            error:
              'invalid_ai_response',
          });
      }

      console.error(error);

      return res
        .status(503)
        .json({
          ok: false,
          error:
            'ai_provider_unavailable',
        });
    }
  },
);

app.post(
  '/ai/discover-explain',
  async (req, res) => {
    try {
      const request =
        parseDiscoverExplainRequest(
          req.body,
        );

      const result =
        await chatWithOllama({
          messages: [
            {
              role: 'system',
              content:
                'Follow TravelOS truth rules exactly. Return only the requested structured output.',
            },
            {
              role: 'user',
              content:
                buildDiscoverExplainPrompt(
                  request,
                ),
            },
          ],

          format:
            explainResponseFormat,
        });

      const parsed =
        parseDiscoverExplainResponse(
          result.content,
          request,
        );

      res.json({
        ok: true,
        provider: result.provider,
        model: result.model,
        identity: parsed.identity,
        sentences: parsed.sentences,
      });
    } catch (error) {
      if (
        error instanceof ZodError
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            error:
              'invalid_request',
          });
      }

      const message =
        error instanceof Error
          ? error.message
          : '';

      if (
        message ===
          'AI returned invalid JSON' ||
        message ===
          'AI returned an invalid explanation' ||
        message ===
          'AI explanation invented unsupported facts' ||
        message ===
          'AI explanation mentioned another destination'
      ) {
        console.error(error);

        return res
          .status(502)
          .json({
            ok: false,
            error:
              'invalid_ai_response',
          });
      }

      console.error(error);

      return res
        .status(503)
        .json({
          ok: false,
          error:
            'ai_provider_unavailable',
        });
    }
  },
);

app.use(
  (err, _req, res, _next) => {
    console.error(err);

    res.status(500).json({
      error:
        'internal_server_error',
    });
  },
);

app.listen(PORT, () => {
  console.log(
    `TravelOS AI server listening on http://localhost:${PORT}`,
  );
});