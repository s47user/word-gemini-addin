import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import * as geminiService from '../../src/services/geminiService';
import * as wordService from '../../src/services/wordService';
import {
  initializeTaskpaneUI,
  handleQuickAction,
  handleCustomPrompt,
  clearChatHistory,
  getChatHistory
} from '../../src/ui/taskpane';

describe('Taskpane UI and Controller', () => {
  let dom: JSDOM;

  beforeEach(() => {
    vi.clearAllMocks();
    clearChatHistory();

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

  it('renders UI header, quick actions, prompt textarea, output container, and clear chat button', () => {
    const container = document.getElementById('app')!;
    initializeTaskpaneUI(container);

    expect(container.querySelector('.taskpane-header')).not.toBeNull();
    expect(container.querySelector('.settings-btn')).not.toBeNull();
    expect(container.querySelectorAll('.action-pill').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector('#custom-prompt-input')).not.toBeNull();
    expect(container.querySelector('#output-preview')).not.toBeNull();
    expect(container.querySelector('#btn-clear-chat')).not.toBeNull();
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
    vi.spyOn(geminiService, 'streamGenerateContent').mockImplementation(async (_cfg, prompt, onChunk) => {
      sentPrompt = typeof prompt === 'string' ? prompt : prompt[0].parts[0].text;
      onChunk('This is the summary of the section.', 'This is the summary of the section.');
      return 'This is the summary of the section.';
    });

    const result = await handleQuickAction('summarize');
    expect(result.success).toBe(true);
    expect(result.text).toBe('This is the summary of the section.');
    // Verbatim text preservation
    expect(sentPrompt).toContain(rawSelectedText);
  });

  it('handleCustomPrompt retains multi-turn chat history without alterations', async () => {
    const turn1 = 'First question from user.';
    const turn2 = 'Follow up request.';

    vi.spyOn(geminiService, 'streamGenerateContent').mockImplementation(async (_cfg, contents, onChunk) => {
      if (Array.isArray(contents)) {
        const lastMsg = contents[contents.length - 1].parts[0].text;
        const reply = `Answer to: ${lastMsg}`;
        onChunk(reply, reply);
        return reply;
      }
      return 'Simple reply';
    });

    const res1 = await handleCustomPrompt(turn1);
    expect(res1.success).toBe(true);
    expect(getChatHistory().length).toBe(2); // user turn 1 + model reply 1

    const res2 = await handleCustomPrompt(turn2);
    expect(res2.success).toBe(true);
    expect(getChatHistory().length).toBe(4); // user 1, model 1, user 2, model 2
    expect(getChatHistory()[0].parts[0].text).toBe(turn1);
    expect(getChatHistory()[2].parts[0].text).toBe(turn2);
  });
});
