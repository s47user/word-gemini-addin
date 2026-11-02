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
    // Sandboxed iframes without storage permission fall back to defaults
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

/**
 * Calls the Google Gemini REST API.
 * CRITICAL RULE: The prompt argument must NEVER be edited, trimmed destructively,
 * or summarized. It must be passed verbatim to preserve user voice and instructions.
 * Security: Uses the official x-goog-api-key header instead of a query parameter.
 */
export async function generateContent(
  config: GeminiConfig,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error('Gemini API key is missing. Please set your API key in the add-in settings.');
  }

  const model = config.model || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt // Exact user words passed directly
          }
        ]
      }
    ]
  };

  if (systemInstruction && systemInstruction.trim() !== '') {
    requestBody.systemInstruction = {
      parts: [
        {
          text: systemInstruction
        }
      ]
    };
  }

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
