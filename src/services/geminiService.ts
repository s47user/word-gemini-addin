export const DEFAULT_MODEL = 'gemini-3.8-flash';

export const SUPPORTED_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Fast & Capable - Recommended)' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (High speed)' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' }
];

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

const STORAGE_KEY_API_KEY = 'gemini_word_api_key';
const STORAGE_KEY_MODEL = 'gemini_word_model';

export function getStoredConfig(): GeminiConfig {
  let apiKey = '';
  let model = DEFAULT_MODEL;

  try {
    if (typeof localStorage !== 'undefined') {
      apiKey = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
      model = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
    }
  } catch {
    // Sandboxed iframes
  }

  return { apiKey, model };
}

export function saveConfig(config: GeminiConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_API_KEY, config.apiKey.trim());
      localStorage.setItem(STORAGE_KEY_MODEL, config.model || DEFAULT_MODEL);
    }
  } catch {
    // Sandboxed iframes
  }
}

function buildRequestBody(contentsInput: string | ChatMessage[], systemInstruction?: string): any {
  let contents: ChatMessage[];

  if (typeof contentsInput === 'string') {
    contents = [
      {
        role: 'user',
        parts: [{ text: contentsInput }]
      }
    ];
  } else {
    contents = contentsInput;
  }

  const requestBody: any = { contents };

  if (systemInstruction && systemInstruction.trim() !== '') {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  return requestBody;
}

/**
 * Standard non-streaming Gemini call.
 */
export async function generateContent(
  config: GeminiConfig,
  contentsInput: string | ChatMessage[],
  systemInstruction?: string
): Promise<string> {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error('Gemini API key is missing. Please set your API key in the add-in settings.');
  }

  const model = config.model || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const requestBody = buildRequestBody(contentsInput, systemInstruction);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey.trim()
      },
      body: JSON.stringify(requestBody)
    });
  } catch (err: any) {
    throw new Error(`Network error connecting to Gemini API: ${err.message || 'Check your internet connection.'}`);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid API key (401 Unauthorized). Please check your key in settings.');
    }
    if (response.status === 429) {
      throw new Error('Rate limit or quota exceeded (429). Please wait a moment or check your API quotas.');
    }
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status} ${response.statusText}): ${errText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const textOutput = candidate?.content?.parts?.[0]?.text;

  if (!textOutput) {
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`Generation finished prematurely with status: ${candidate.finishReason}`);
    }
    throw new Error('Gemini returned an empty response.');
  }

  return textOutput;
}

/**
 * Streaming Gemini call via SSE (Server-Sent Events) with real-time typewriter feedback.
 */
export async function streamGenerateContent(
  config: GeminiConfig,
  contentsInput: string | ChatMessage[],
  onChunk: (accumulatedText: string, chunk: string) => void,
  systemInstruction?: string
): Promise<string> {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error('Gemini API key is missing. Please set your API key in the add-in settings.');
  }

  const model = config.model || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
  const requestBody = buildRequestBody(contentsInput, systemInstruction);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey.trim()
      },
      body: JSON.stringify(requestBody)
    });
  } catch (err: any) {
    throw new Error(`Network error connecting to Gemini API: ${err.message || 'Check your internet connection.'}`);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid API key (401 Unauthorized). Please check your key in settings.');
    }
    if (response.status === 429) {
      throw new Error('Rate limit or quota exceeded (429). Please wait a moment or check your API quotas.');
    }
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status} ${response.statusText}): ${errText}`);
  }

  if (!response.body) {
    throw new Error('Readable stream not supported or empty body.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;

      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (chunkText) {
          accumulated += chunkText;
          onChunk(accumulated, chunkText);
        }
      } catch {
        // Skip unparseable heartbeat or malformed SSE lines
      }
    }
  }

  return accumulated;
}
