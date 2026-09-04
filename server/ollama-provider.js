const DEFAULT_BASE_URL =
  process.env.OLLAMA_BASE_URL ||
  'http://127.0.0.1:11434';

const DEFAULT_MODEL =
  process.env.OLLAMA_MODEL ||
  'qwen3:4b';

const DEFAULT_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ||
  'bge-m3';

function cleanModelContent(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const closingThinkTag = '</think>';
  const closingIndex =
    value.lastIndexOf(closingThinkTag);

  if (closingIndex >= 0) {
    return value
      .slice(
        closingIndex +
          closingThinkTag.length,
      )
      .trim();
  }

  return value
    .replace(
      /<think>[\s\S]*?<\/think>/gi,
      '',
    )
    .trim();
}

async function chatWithOllama({
  messages,
  model = DEFAULT_MODEL,
  format,
  baseUrl = DEFAULT_BASE_URL,
}) {
  const requestBody = {
    model,
    messages,
    stream: false,
    think: false,
  };

  if (format) {
    requestBody.format = format;
  }

  const response = await fetch(
    `${baseUrl}/api/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify(
        requestBody,
      ),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status}`,
    );
  }

  const result =
    await response.json();

  const content =
    cleanModelContent(
      result?.message?.content,
    );

  if (!content) {
    throw new Error(
      'Ollama returned an empty response',
    );
  }

  return {
    provider: 'ollama',
    model: result.model || model,
    content,
  };
}

async function embedWithOllama({
  input,
  model = DEFAULT_EMBED_MODEL,
  baseUrl = DEFAULT_BASE_URL,
}) {
  const inputs = Array.isArray(input)
    ? input
    : [input];

  if (
    inputs.length === 0 ||
    inputs.some(
      (value) =>
        typeof value !== 'string' ||
        !value.trim(),
    )
  ) {
    throw new Error(
      'Ollama embed request requires non-empty text',
    );
  }

  const response = await fetch(
    `${baseUrl}/api/embed`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        model,
        input: inputs,
      }),
    },
  );

  if (response.ok) {
    const result =
      await response.json();

    if (
      !Array.isArray(
        result.embeddings,
      ) ||
      result.embeddings.length !==
        inputs.length
    ) {
      throw new Error(
        'Ollama returned an invalid embedding batch',
      );
    }

    return {
      provider: 'ollama',
      model: result.model || model,
      embeddings: result.embeddings,
    };
  }

  if (response.status !== 404) {
    throw new Error(
      `Ollama embed request failed: ${response.status}`,
    );
  }

  const embeddings = [];

  for (const value of inputs) {
    const legacy = await fetch(
      `${baseUrl}/api/embeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: value,
        }),
      },
    );

    if (!legacy.ok) {
      throw new Error(
        `Ollama embeddings request failed: ${legacy.status}`,
      );
    }

    const payload =
      await legacy.json();

    if (
      !Array.isArray(
        payload.embedding,
      )
    ) {
      throw new Error(
        'Ollama returned an invalid embedding',
      );
    }

    embeddings.push(
      payload.embedding,
    );
  }

  return {
    provider: 'ollama',
    model,
    embeddings,
  };
}

module.exports = {
  chatWithOllama,
  cleanModelContent,
  embedWithOllama,
};