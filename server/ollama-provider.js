const DEFAULT_BASE_URL =
  process.env.OLLAMA_BASE_URL ||
  'http://127.0.0.1:11434';

const DEFAULT_MODEL =
  process.env.OLLAMA_MODEL ||
  'qwen3:4b';

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
    `${DEFAULT_BASE_URL}/api/chat`,
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

module.exports = {
  chatWithOllama,
  cleanModelContent,
};