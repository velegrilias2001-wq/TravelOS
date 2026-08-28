require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  ZodError,
} = require('zod');

const {
  chatWithOllama,
} = require('./ollama-provider');

const {
  buildFreeTimeAdvisorPrompt,
  freeTimeResponseFormat,
  parseFreeTimeAdvisorResponse,
} = require('./free-time-advisor');

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