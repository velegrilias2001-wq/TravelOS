require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  ZodError,
} = require('zod');

const {
  AiProviderError,
  createAiProvider,
} = require('./ai-provider');

const {
  getConfiguredAiTools,
  listAiTools,
} = require('./ai-tools-registry');

const {
  TRAVELOS_COPILOT_SYSTEM_PROMPT,
} = require('./prompts/travelos-copilot');

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

const {
  lookupTimezoneFromCoordinates,
  parseTimezoneLookupRequest,
} = require('./timezone-lookup');

const {
  lookupDirections,
  parseDirectionsLookupRequest,
} = require('./directions-lookup');

const {
  extractOcrText,
  parseOcrExtractRequest,
} = require('./ocr-extract');

const {
  buildDiscoverRerankPrompt,
  parseDiscoverRerankRequest,
  parseDiscoverRerankResponse,
  rerankResponseFormat,
} = require('./discover-rerank');

const {
  parseTravelChatRequest,
  runTravelChatTurn,
  TRAVEL_CHAT_ALLOWED_TOOLS,
} = require('./travel-chat');

const {
  loadAiConfig,
} = require('./ai-config');

const ai = createAiProvider();

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
    limit: '8mb',
  }),
);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'travelos-ai',
    ai: ai.describe(),
  });
});

app.get('/ai/tools', (_req, res) => {
  res.json({
    ok: true,
    configured: getConfiguredAiTools(),
    all: listAiTools(),
  });
});

app.get('/ai/health', async (_req, res) => {
  try {
    const result =
      await ai.chat({
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
      config: ai.describe(),
    });
  } catch (error) {
    console.error(error);

    res.status(503).json({
      ok: false,
      error:
        error instanceof AiProviderError
          ? error.code
          : 'ai_provider_unavailable',
      config: ai.describe(),
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
        await ai.chat({
          messages: [
            {
              role: 'system',
              content:
                TRAVELOS_COPILOT_SYSTEM_PROMPT,
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
          'AI suggestion exceeds the verified free-time gap' ||
        (error instanceof AiProviderError &&
          error.code === 'invalid_ai_response')
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
            error instanceof AiProviderError
              ? error.code
              : 'ai_provider_unavailable',
        });
    }
  },
);

app.post(
  '/ai/discover-retrieve',
  async (req, res) => {
    try {
      if (
        !ai.config.semanticSearchEnabled
      ) {
        return res
          .status(503)
          .json({
            ok: false,
            error:
              'embeddings_unavailable',
          });
      }

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
        await ai.embed({
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
          'Cannot normalize an empty embedding vector' ||
        (error instanceof AiProviderError &&
          error.code === 'invalid_ai_response')
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
            error instanceof AiProviderError
              ? error.code
              : 'ai_provider_unavailable',
        });
    }
  },
);

app.post('/geo/timezone', async (req, res) => {
  try {
    const request = parseTimezoneLookupRequest(
      req.body,
    );

    const result =
      await lookupTimezoneFromCoordinates(
        request,
      );

    res.json({
      ok: true,
      timezone: result.timezone,
      source: result.source,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_request',
      });
    }

    const code =
      error &&
      typeof error === 'object' &&
      typeof error.code === 'string'
        ? error.code
        : 'timezone_provider_unavailable';

    if (code === 'timezone_api_key_missing') {
      return res.status(503).json({
        ok: false,
        error: 'timezone_api_key_missing',
      });
    }

    if (code === 'timezone_lookup_failed') {
      return res.status(502).json({
        ok: false,
        error: 'timezone_lookup_failed',
      });
    }

    console.error(error);

    return res.status(503).json({
      ok: false,
      error: 'timezone_provider_unavailable',
    });
  }
});

app.post('/geo/directions', async (req, res) => {
  try {
    const request = parseDirectionsLookupRequest(
      req.body,
    );

    const result = await lookupDirections(request);

    res.json({
      ok: true,
      mode: result.mode,
      source: result.source,
      durationSeconds: result.durationSeconds,
      distanceMeters: result.distanceMeters,
      durationText: result.durationText,
      distanceText: result.distanceText,
      coordinates: result.coordinates,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_request',
      });
    }

    const code =
      error &&
      typeof error === 'object' &&
      typeof error.code === 'string'
        ? error.code
        : 'directions_provider_unavailable';

    if (code === 'directions_api_key_missing') {
      return res.status(503).json({
        ok: false,
        error: 'directions_api_key_missing',
      });
    }

    if (code === 'directions_lookup_failed') {
      return res.status(502).json({
        ok: false,
        error: 'directions_lookup_failed',
      });
    }

    console.error(error);

    return res.status(503).json({
      ok: false,
      error: 'directions_provider_unavailable',
    });
  }
});

app.post('/import/ocr-extract', async (req, res) => {
  try {
    const request = parseOcrExtractRequest(req.body);
    const result = await extractOcrText(request);

    res.json({
      ok: true,
      source: result.source,
      text: result.text,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_request',
      });
    }

    const code =
      error &&
      typeof error === 'object' &&
      typeof error.code === 'string'
        ? error.code
        : 'ocr_provider_unavailable';

    if (
      code === 'ocr_api_key_missing' ||
      code === 'ocr_vision_disabled'
    ) {
      return res.status(503).json({
        ok: false,
        error: code,
      });
    }

    if (code === 'ocr_extract_failed') {
      return res.status(502).json({
        ok: false,
        error: 'ocr_extract_failed',
      });
    }

    console.error(error);

    return res.status(503).json({
      ok: false,
      error: 'ocr_provider_unavailable',
    });
  }
});

app.post('/ai/discover-rerank', async (req, res) => {
  const config = loadAiConfig();

  if (!config.rerankEnabled) {
    return res.status(503).json({
      ok: false,
      error: 'rerank_disabled',
    });
  }

  try {
    const request = parseDiscoverRerankRequest(req.body);

    const result = await ai.chat({
      messages: [
        {
          role: 'system',
          content: TRAVELOS_COPILOT_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: buildDiscoverRerankPrompt(request),
        },
      ],
      format: rerankResponseFormat,
    });

    const identities = parseDiscoverRerankResponse(
      result.content,
    );

    res.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      identities,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_request',
      });
    }

    const message =
      error instanceof Error ? error.message : '';

    if (
      message === 'AI returned invalid JSON' ||
      (error instanceof AiProviderError &&
        error.code === 'invalid_ai_response')
    ) {
      console.error(error);

      return res.status(502).json({
        ok: false,
        error: 'invalid_ai_response',
      });
    }

    console.error(error);

    return res.status(503).json({
      ok: false,
      error:
        error instanceof AiProviderError
          ? error.code
          : 'ai_provider_unavailable',
    });
  }
});

app.post(
  '/ai/discover-explain',
  async (req, res) => {
    try {
      const request =
        parseDiscoverExplainRequest(
          req.body,
        );

      const result =
        await ai.chat({
          messages: [
            {
              role: 'system',
              content:
                TRAVELOS_COPILOT_SYSTEM_PROMPT,
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
          'AI explanation mentioned another destination' ||
        (error instanceof AiProviderError &&
          error.code === 'invalid_ai_response')
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
            error instanceof AiProviderError
              ? error.code
              : 'ai_provider_unavailable',
        });
    }
  },
);

app.post(
  '/ai/chat',
  async (req, res) => {
    try {
      const request =
        parseTravelChatRequest(req.body);

      const result = await runTravelChatTurn({
        ai,
        embeddings: discoverEmbeddings,
        request,
      });

      return res.json({
        ok: true,
        provider: result.provider,
        model: result.model,
        reply: result.reply,
        matches: result.matches,
        toolsUsed: result.toolsUsed,
        allowedTools: TRAVEL_CHAT_ALLOWED_TOOLS,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'invalid_request',
        });
      }

      if (
        error instanceof SyntaxError ||
        error?.message === 'invalid_ai_response'
      ) {
        return res.status(502).json({
          ok: false,
          error: 'invalid_ai_response',
        });
      }

      const code =
        error instanceof AiProviderError
          ? error.code
          : typeof error?.code === 'string'
            ? error.code
            : 'ai_provider_unavailable';

      const status =
        code === 'stale_embeddings'
          ? 409
          : code === 'embeddings_unavailable' ||
              code === 'ai_disabled'
            ? 503
            : 503;

      console.error(error);

      return res.status(status).json({
        ok: false,
        error: code,
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
