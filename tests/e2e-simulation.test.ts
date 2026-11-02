import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as geminiService from '../src/services/geminiService';
import * as wordService from '../src/services/wordService';
import { handleQuickAction, handleCustomPrompt, clearChatHistory } from '../src/ui/taskpane';

describe('End-to-End Simulation: Full Word Add-in Flow', () => {
  let docSelectionText = '';
  let docInsertedHtml = '';
  let lastReplacedHtml = '';
  const mockStorage: Record<string, string> = {};

  function createStreamResponse(textChunks: string[]) {
    let index = 0;
    const reader = {
      read: vi.fn(async () => {
        if (index < textChunks.length) {
          const sseLine = `data: {"candidates":[{"content":{"parts":[{"text":${JSON.stringify(textChunks[index++])}}]}}]}\n\n`;
          return { done: false, value: new TextEncoder().encode(sseLine) };
        }
        return { done: true, value: undefined };
      })
    };
    return {
      ok: true,
      body: { getReader: () => reader }
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    clearChatHistory();
    docSelectionText = 'The quarterly revenue exceeded our targets by 15%.';
    docInsertedHtml = '';
    lastReplacedHtml = '';

    for (const k in mockStorage) delete mockStorage[k];

    // Mock storage
    globalThis.localStorage = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        mockStorage[key] = val;
      }),
      removeItem: vi.fn((key: string) => delete mockStorage[key]),
      clear: vi.fn(() => {
        for (const k in mockStorage) delete mockStorage[k];
      }),
      length: 0,
      key: vi.fn(() => null)
    };

    // Save test API key
    geminiService.saveConfig({
      apiKey: 'AIzaSyTestKeyVerified',
      model: 'gemini-3.8-flash'
    });

    // Mock Word operations
    vi.spyOn(wordService, 'getSelectedText').mockImplementation(async () => docSelectionText);
    vi.spyOn(wordService, 'replaceSelectedMarkdown').mockImplementation(async (text) => {
      lastReplacedHtml = text;
      docSelectionText = text;
    });
    vi.spyOn(wordService, 'insertMarkdownAtCursor').mockImplementation(async (text) => {
      docInsertedHtml = text;
    });
  });

  it('runs complete Quick Action cycle: Select -> Stream Summarize with 3.8 Flash -> Replace as Markdown', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;
    let capturedHeaders: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      capturedHeaders = init.headers;
      return createStreamResponse(['Executive Summary: ', '**+15% revenue gain**']);
    });

    // Step A: Trigger summarize quick action
    const actionResult = await handleQuickAction('summarize');
    expect(actionResult.success).toBe(true);
    expect(actionResult.text).toBe('Executive Summary: **+15% revenue gain**');

    // Verify correct up-to-date Gemini model and streaming endpoint
    expect(capturedUrl).toContain('models/gemini-3.8-flash:streamGenerateContent?alt=sse');
    expect(capturedHeaders['x-goog-api-key']).toBe('AIzaSyTestKeyVerified');
    expect(capturedBody.contents[0].parts[0].text).toContain(docSelectionText);

    // Step B: Replace selection in document with markdown
    await wordService.replaceSelectedMarkdown(actionResult.text!);
    expect(lastReplacedHtml).toBe('Executive Summary: **+15% revenue gain**');
  });

  it('runs complete Custom Prompt cycle: Multi-turn Chat -> Stream -> Insert Markdown at cursor', async () => {
    const userPrompt = 'Draft a conclusion thanking the engineering team for their commitment.';
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return createStreamResponse(['We sincerely thank the **engineering team** for their dedication.']);
    });

    // Step A: Custom prompt
    const result = await handleCustomPrompt(userPrompt);
    expect(result.success).toBe(true);
    expect(capturedBody.contents[0].parts[0].text).toBe(userPrompt); // Zero alteration

    // Step B: Insert markdown at cursor
    await wordService.insertMarkdownAtCursor(result.text!);
    expect(docInsertedHtml).toBe('We sincerely thank the **engineering team** for their dedication.');
  });
});
