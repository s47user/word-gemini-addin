/**
 * Word Document Interop Service using Office.js (WordApi 1.3+)
 */

export function isOfficeInitialized(): boolean {
  return typeof (globalThis as any).Office !== 'undefined' && !!(globalThis as any).Office?.context;
}

/**
 * Returns the currently selected text in the active Word document.
 * If nothing is selected, returns an empty string.
 */
export async function getSelectedText(): Promise<string> {
  if (typeof (globalThis as any).Word === 'undefined') {
    throw new Error('Microsoft Word environment not detected. Please run this inside Word.');
  }

  try {
    return await (globalThis as any).Word.run(async (context: any) => {
      const selection = context.document.getSelection();
      selection.load('text');
      await context.sync();
      return selection.text || '';
    });
  } catch (err: any) {
    throw new Error(`Failed to read selection: ${err.message || 'Unknown Word error'}`);
  }
}

/**
 * Returns the full body text of the active Word document.
 */
export async function getDocumentBodyText(): Promise<string> {
  if (typeof (globalThis as any).Word === 'undefined') {
    throw new Error('Microsoft Word environment not detected. Please run this inside Word.');
  }

  try {
    return await (globalThis as any).Word.run(async (context: any) => {
      const body = context.document.body;
      body.load('text');
      await context.sync();
      return body.text || '';
    });
  } catch (err: any) {
    throw new Error(`Failed to read document body: ${err.message || 'Unknown Word error'}`);
  }
}

/**
 * Replaces the currently highlighted selection in Word with new text.
 */
export async function replaceSelectedText(newText: string): Promise<void> {
  if (typeof (globalThis as any).Word === 'undefined') {
    throw new Error('Microsoft Word environment not detected. Please run this inside Word.');
  }

  try {
    await (globalThis as any).Word.run(async (context: any) => {
      const selection = context.document.getSelection();
      const insertLocation = (globalThis as any).Word.InsertLocation.replace;
      selection.insertText(newText, insertLocation);
      await context.sync();
    });
  } catch (err: any) {
    throw new Error(`Failed to replace selected text: ${err.message || 'Unknown Word error'}`);
  }
}

/**
 * Inserts new text at the current cursor position (immediately after the selection).
 */
export async function insertTextAtCursor(newText: string): Promise<void> {
  if (typeof (globalThis as any).Word === 'undefined') {
    throw new Error('Microsoft Word environment not detected. Please run this inside Word.');
  }

  try {
    await (globalThis as any).Word.run(async (context: any) => {
      const selection = context.document.getSelection();
      const insertLocation = (globalThis as any).Word.InsertLocation.after;
      selection.insertText(newText, insertLocation);
      await context.sync();
    });
  } catch (err: any) {
    throw new Error(`Failed to insert text at cursor: ${err.message || 'Unknown Word error'}`);
  }
}
