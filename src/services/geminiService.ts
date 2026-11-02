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
  antiSlopGuard?: 'strict' | 'moderate' | 'off';
  preserveCitations?: boolean;
  customSystemInstruction?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

const STORAGE_KEY_API_KEY = 'gemini_word_api_key';
const STORAGE_KEY_MODEL = 'gemini_word_model';
const STORAGE_KEY_SLOP_GUARD = 'gemini_word_slop_guard';
const STORAGE_KEY_PRESERVE_CITATIONS = 'gemini_word_preserve_citations';
const STORAGE_KEY_CUSTOM_SYSTEM = 'gemini_word_custom_system';

export function getStoredConfig(): GeminiConfig {
  let apiKey = '';
  let model = DEFAULT_MODEL;
  let antiSlopGuard: 'strict' | 'moderate' | 'off' = 'strict';
  let preserveCitations = true;
  let customSystemInstruction = '';

  try {
    if (typeof localStorage !== 'undefined') {
      apiKey = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
      model = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
      const storedGuard = localStorage.getItem(STORAGE_KEY_SLOP_GUARD);
      if (storedGuard === 'strict' || storedGuard === 'moderate' || storedGuard === 'off') {
        antiSlopGuard = storedGuard;
      }
      const storedCitations = localStorage.getItem(STORAGE_KEY_PRESERVE_CITATIONS);
      if (storedCitations !== null) {
        preserveCitations = storedCitations === 'true';
      }
      customSystemInstruction = localStorage.getItem(STORAGE_KEY_CUSTOM_SYSTEM) || '';
    }
  } catch {
    // Sandboxed iframes
  }

  return { apiKey, model, antiSlopGuard, preserveCitations, customSystemInstruction };
}

export function saveConfig(config: GeminiConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_API_KEY, config.apiKey.trim());
      localStorage.setItem(STORAGE_KEY_MODEL, config.model || DEFAULT_MODEL);
      localStorage.setItem(STORAGE_KEY_SLOP_GUARD, config.antiSlopGuard || 'strict');
      localStorage.setItem(STORAGE_KEY_PRESERVE_CITATIONS, String(config.preserveCitations !== false));
      localStorage.setItem(STORAGE_KEY_CUSTOM_SYSTEM, config.customSystemInstruction || '');
    }
  } catch {
    // Sandboxed iframes
  }
}

/**
 * Combines task-specific instructions with user-level anti-slop rules and citation protection.
 */
export function composeSystemInstruction(
  baseInstruction?: string,
  config?: Partial<GeminiConfig>
): string | undefined {
  const parts: string[] = [];

  if (baseInstruction && baseInstruction.trim() !== '') {
    parts.push(baseInstruction.trim());
  }

  const guard = config?.antiSlopGuard;
  if (guard === 'strict') {
    parts.push(
      "Anti-AI-Slop Policy (Strict): You are strictly forbidden from using generic, hollow AI words: 'delve', 'tapestry', 'beacon', 'testament', 'pivotal', 'foster', 'holistic', 'game-changer', 'unleash', 'streamline', 'seamless', or 'not merely X, but Y'. State concrete facts, active verbs, and varied sentence lengths directly."
    );
  } else if (guard === 'moderate') {
    parts.push(
      "Tone Directive: Write cleanly and concisely. Avoid clichés like 'delve', 'tapestry', or 'pivotal'."
    );
  }

  if (config?.preserveCitations === true) {
    parts.push(
      "Citation & Term Protection: Never rewrite, mangle, or delete academic citations (e.g., '(Smith et al., 2021)', '[1, 2]'), equations, or domain-specific terminology."
    );
  }

  if (config?.customSystemInstruction && config.customSystemInstruction.trim() !== '') {
    parts.push(config.customSystemInstruction.trim());
  }

  return parts.length > 0 ? parts.join('\n\n') : undefined;
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
  const resolvedSystem = composeSystemInstruction(systemInstruction, config);
  const requestBody = buildRequestBody(contentsInput, resolvedSystem);

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
  const resolvedSystem = composeSystemInstruction(systemInstruction, config);
  const requestBody = buildRequestBody(contentsInput, resolvedSystem);

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
