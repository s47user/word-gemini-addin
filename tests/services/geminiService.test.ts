import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateContent,
  streamGenerateContent,
  getStoredConfig,
  saveConfig,
  DEFAULT_MODEL,
  GeminiConfig,
  ChatMessage
} from '../../src/services/geminiService';

describe('Gemini API Service', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockStorage) {
      delete mockStorage[key];
    }

    // Mock localStorage
    globalThis.localStorage = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        mockStorage[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        for (const key in mockStorage) delete mockStorage[key];
      }),
      length: 0,
      key: vi.fn(() => null)
    };
  });

  it('defaults to gemini-3.8-flash and handles config storage in localStorage', () => {
    expect(DEFAULT_MODEL).toBe('gemini-3.8-flash');

    const emptyConfig = getStoredConfig();
    expect(emptyConfig.apiKey).toBe('');
    expect(emptyConfig.model).toBe('gemini-3.8-flash');

    const newConfig: GeminiConfig = {
      apiKey: 'test-api-key-12345',
      model: 'gemini-3.8-flash'
    };
    saveConfig(newConfig);

    const loaded = getStoredConfig();
    expect(loaded.apiKey).toBe('test-api-key-12345');
    expect(loaded.model).toBe('gemini-3.8-flash');
  });

  it('preserves exact user words in the prompt without modifying voice', async () => {
    const rawUserPrompt = '  Do not edit my words! Here is what I need: 1. Keep tone as-is.  ';
    let interceptedUrl = '';
    let interceptedBody: any = null;
    let interceptedHeaders: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      interceptedUrl = url;
      interceptedBody = JSON.parse(init.body);
      interceptedHeaders = init.headers;
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Response from Gemini 3.8 Flash' }]
              }
            }
          ]
        })
      };
    });

    const result = await generateContent(
      { apiKey: 'test-key', model: 'gemini-3.8-flash' },
      rawUserPrompt,
      'You are a helpful writing assistant.'
    );

    expect(result).toBe('Response from Gemini 3.8 Flash');
    expect(interceptedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    expect(interceptedHeaders['x-goog-api-key']).toBe('test-key');
    // Verbatim prompt fidelity: parts[0].text matches rawUserPrompt exactly
    expect(interceptedBody.contents[0].parts[0].text).toBe(rawUserPrompt);
    expect(interceptedBody.systemInstruction.parts[0].text).toBe('You are a helpful writing assistant.');
  });

  it('supports multi-turn conversation history with full fidelity', async () => {
    const history: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'Summarize the intro.' }] },
      { role: 'model', parts: [{ text: 'Here is the summary.' }] },
      { role: 'user', parts: [{ text: 'Make it even shorter.' }] }
    ];

    let interceptedBody: any = null;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      interceptedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Shorter summary.' }] } }]
        })
      };
    });

    const res = await generateContent({ apiKey: 'key', model: 'gemini-3.8-flash' }, history);
    expect(res).toBe('Shorter summary.');
    expect(interceptedBody.contents.length).toBe(3);
    expect(interceptedBody.contents[0].parts[0].text).toBe('Summarize the intro.');
    expect(interceptedBody.contents[2].parts[0].text).toBe('Make it even shorter.');
  });

  it('streams content chunks in real time via streamGenerateContent', async () => {
    const sseData = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello "}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"from Gemini "}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"streaming!"}]}}]}\n\n'
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn(async () => {
        if (chunkIndex < sseData.length) {
          const chunkStr = sseData[chunkIndex++];
          return { done: false, value: new TextEncoder().encode(chunkStr) };
        }
        return { done: true, value: undefined };
      })
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader
      }
    });

    const chunksReceived: string[] = [];
    const fullText = await streamGenerateContent(
      { apiKey: 'key', model: 'gemini-3.8-flash' },
      'Say hello',
      (_accum, chunk) => chunksReceived.push(chunk)
    );

    expect(fullText).toBe('Hello from Gemini streaming!');
    expect(chunksReceived).toEqual(['Hello ', 'from Gemini ', 'streaming!']);
  });

  it('throws friendly error on missing API key or 401 Unauthorized', async () => {
    await expect(generateContent({ apiKey: '', model: 'gemini-3.8-flash' }, 'hello')).rejects.toThrow(
      'Gemini API key is missing. Please set your API key in the add-in settings.'
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'API key not valid'
    });

    await expect(
      generateContent({ apiKey: 'invalid-key', model: 'gemini-3.8-flash' }, 'hello')
    ).rejects.toThrow('Invalid API key (401 Unauthorized)');
  });
});
