import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as geminiService from '../../src/services/geminiService';
import * as wordService from '../../src/services/wordService';
import { initializeTaskpaneUI, handleQuickAction, handleCustomPrompt } from '../../src/ui/taskpane';

describe('Taskpane UI and Controller', () => {
  let dom: JSDOM;

  beforeEach(() => {
    vi.clearAllMocks();

    dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app"></div></body></html>`, {
      url: 'https://localhost:3000'
    });

    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).localStorage = {
      getItem: vi.fn(() => 'mock-api-key'),
      setItem: vi.fn()
    };
  });

  it('renders UI header, quick actions, prompt textarea, and output container', () => {
    const container = document.getElementById('app')!;
    initializeTaskpaneUI(container);

    expect(container.querySelector('.taskpane-header')).not.toBeNull();
    expect(container.querySelector('.settings-btn')).not.toBeNull();
    expect(container.querySelectorAll('.action-pill').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector('#custom-prompt-input')).not.toBeNull();
    expect(container.querySelector('#output-preview')).not.toBeNull();
  });

  it('handleQuickAction warns user if no text is selected', async () => {
    vi.spyOn(wordService, 'getSelectedText').mockResolvedValue('');
    const statusMsg = await handleQuickAction('summarize');
    expect(statusMsg.success).toBe(false);
    expect(statusMsg.message).toContain('Please select text in your document first');
  });

  it('handleQuickAction preserves exact selected text and sends to Gemini', async () => {
    const rawSelectedText = '  Section 1: The proposal aims to deliver results.  ';
    vi.spyOn(wordService, 'getSelectedText').mockResolvedValue(rawSelectedText);

    let sentPrompt = '';
    vi.spyOn(geminiService, 'generateContent').mockImplementation(async (_cfg, prompt) => {
      sentPrompt = prompt;
      return 'This is the summary of the section.';
    });

    const result = await handleQuickAction('summarize');
    expect(result.success).toBe(true);
    expect(result.text).toBe('This is the summary of the section.');
    // Verbatim text preservation
    expect(sentPrompt).toContain(rawSelectedText);
  });

  it('handleCustomPrompt sends exact user prompt without alterations', async () => {
    const userPrompt = 'Please draft a memo regarding our 2026 Q4 results.';
    let sentPrompt = '';

    vi.spyOn(geminiService, 'generateContent').mockImplementation(async (_cfg, prompt) => {
      sentPrompt = prompt;
      return 'Memo drafted.';
    });

    const result = await handleCustomPrompt(userPrompt);
    expect(result.success).toBe(true);
    expect(result.text).toBe('Memo drafted.');
    expect(sentPrompt).toBe(userPrompt);
  });
});
