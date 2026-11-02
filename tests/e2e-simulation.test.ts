import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as geminiService from '../src/services/geminiService';
import * as wordService from '../src/services/wordService';
import { handleQuickAction, handleCustomPrompt } from '../src/ui/taskpane';

describe('End-to-End Simulation: Full Word Add-in Flow', () => {
  let docSelectionText = '';
  let docInsertedText = '';
  let lastReplacedText = '';
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    docSelectionText = 'The quarterly revenue exceeded our targets by 15%.';
    docInsertedText = '';
    lastReplacedText = '';

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
    vi.spyOn(wordService, 'replaceSelectedText').mockImplementation(async (text) => {
      lastReplacedText = text;
      docSelectionText = text;
    });
    vi.spyOn(wordService, 'insertTextAtCursor').mockImplementation(async (text) => {
      docInsertedText = text;
    });
  });

  it('runs complete Quick Action cycle: Select -> Summarize with 3.8 Flash -> Replace', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Executive Summary: Q4 revenue +15% over target.' }]
              }
            }
          ]
        })
      };
    });

    // Step A: Trigger summarize quick action
    const actionResult = await handleQuickAction('summarize');
    expect(actionResult.success).toBe(true);
    expect(actionResult.text).toBe('Executive Summary: Q4 revenue +15% over target.');

    // Verify correct up-to-date Gemini model and exact prompt fidelity
    expect(capturedUrl).toContain('models/gemini-3.8-flash:generateContent');
    expect(capturedBody.contents[0].parts[0].text).toContain(docSelectionText);

    // Step B: Replace selection in document
    await wordService.replaceSelectedText(actionResult.text!);
    expect(lastReplacedText).toBe('Executive Summary: Q4 revenue +15% over target.');
    expect(docSelectionText).toBe('Executive Summary: Q4 revenue +15% over target.');
  });

  it('runs complete Custom Prompt cycle: Verbatim Prompt -> Generate -> Insert at cursor', async () => {
    const verbatimUserPrompt = 'Draft a concluding paragraph thanking the engineering team for their commitment.';
    let capturedPrompt = '';

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      capturedPrompt = body.contents[0].parts[0].text;
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'We extend our sincere gratitude to the engineering team...' }]
              }
            }
          ]
        })
      };
    });

    // Step A: Custom prompt
    const result = await handleCustomPrompt(verbatimUserPrompt);
    expect(result.success).toBe(true);
    expect(capturedPrompt).toBe(verbatimUserPrompt); // Zero alteration of user prompt

    // Step B: Insert at cursor
    await wordService.insertTextAtCursor(result.text!);
    expect(docInsertedText).toBe('We extend our sincere gratitude to the engineering team...');
  });
});
