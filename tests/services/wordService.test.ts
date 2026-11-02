import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSelectedText,
  getDocumentBodyText,
  replaceSelectedText,
  insertTextAtCursor,
  replaceSelectedMarkdown,
  insertMarkdownAtCursor,
  isOfficeInitialized
} from '../../src/services/wordService';

describe('Word Document Interop Service', () => {
  let mockSelection: any;
  let mockBody: any;
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSelection = {
      text: 'Selected text from Word',
      load: vi.fn(),
      insertText: vi.fn(),
      insertHtml: vi.fn()
    };

    mockBody = {
      text: 'Full document body text',
      load: vi.fn(),
      insertText: vi.fn(),
      insertHtml: vi.fn()
    };

    mockContext = {
      document: {
        getSelection: vi.fn(() => mockSelection),
        body: mockBody
      },
      sync: vi.fn(async () => {})
    };

    (globalThis as any).Word = {
      run: vi.fn(async (callback: (ctx: any) => Promise<any>) => {
        return await callback(mockContext);
      }),
      InsertLocation: {
        replace: 'Replace',
        after: 'After',
        end: 'End'
      }
    };

    (globalThis as any).Office = {
      context: {
        requirements: {
          isSetSupported: vi.fn(() => true)
        }
      }
    };
  });

  it('detects if Office is initialized', () => {
    expect(isOfficeInitialized()).toBe(true);

    delete (globalThis as any).Office;
    expect(isOfficeInitialized()).toBe(false);
  });

  it('reads selected text from Word document', async () => {
    const text = await getSelectedText();
    expect(mockContext.document.getSelection).toHaveBeenCalled();
    expect(mockSelection.load).toHaveBeenCalledWith('text');
    expect(mockContext.sync).toHaveBeenCalled();
    expect(text).toBe('Selected text from Word');
  });

  it('reads full document body text', async () => {
    const text = await getDocumentBodyText();
    expect(mockBody.load).toHaveBeenCalledWith('text');
    expect(mockContext.sync).toHaveBeenCalled();
    expect(text).toBe('Full document body text');
  });

  it('replaces selected text in Word document', async () => {
    await replaceSelectedText('New refined content');
    expect(mockSelection.insertText).toHaveBeenCalledWith('New refined content', 'Replace');
    expect(mockContext.sync).toHaveBeenCalled();
  });

  it('inserts text at cursor position (after current selection)', async () => {
    await insertTextAtCursor('Appended content');
    expect(mockSelection.insertText).toHaveBeenCalledWith('Appended content', 'After');
    expect(mockContext.sync).toHaveBeenCalled();
  });

  it('converts markdown to native Word HTML on replaceSelectedMarkdown', async () => {
    await replaceSelectedMarkdown('**Bold Heading**\n- Item 1');
    expect(mockSelection.insertHtml).toHaveBeenCalled();
    const htmlArg = mockSelection.insertHtml.mock.calls[0][0];
    expect(htmlArg).toContain('<strong>Bold Heading</strong>');
    expect(htmlArg).toContain('<li>Item 1</li>');
    expect(mockContext.sync).toHaveBeenCalled();
  });

  it('converts markdown to native Word HTML on insertMarkdownAtCursor', async () => {
    await insertMarkdownAtCursor('*Italic note*');
    expect(mockSelection.insertHtml).toHaveBeenCalled();
    const htmlArg = mockSelection.insertHtml.mock.calls[0][0];
    expect(htmlArg).toContain('<em>Italic note</em>');
    expect(mockContext.sync).toHaveBeenCalled();
  });

  it('throws descriptive error if Word.run fails', async () => {
    (globalThis as any).Word.run = vi.fn().mockRejectedValue(new Error('Office context not synced'));
    await expect(getSelectedText()).rejects.toThrow('Failed to read selection: Office context not synced');
  });
});
