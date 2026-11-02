import {
  generateContent,
  getStoredConfig,
  saveConfig,
  DEFAULT_MODEL,
  SUPPORTED_MODELS
} from '../services/geminiService';
import {
  getSelectedText,
  replaceSelectedText,
  insertTextAtCursor,
  isOfficeInitialized
} from '../services/wordService';

export { isOfficeInitialized };

export interface ActionResult {
  success: boolean;
  text?: string;
  message?: string;
}

let lastGeneratedText = '';

/**
 * Executes a pre-configured quick action on selected document text.
 * CRITICAL RULE: The selected text is sent verbatim to preserve user voice.
 */
export async function handleQuickAction(actionType: string): Promise<ActionResult> {
  const selectedText = await getSelectedText();
  if (!selectedText || selectedText.trim() === '') {
    return {
      success: false,
      message: 'Please select text in your document first to use this quick action.'
    };
  }

  const systemInstructions: Record<string, string> = {
    summarize: 'You are an executive assistant. Summarize the user\'s text clearly and concisely.',
    polish: 'You are a professional editor. Polish and proofread the text for clarity, grammar, and flow while strictly preserving the author\'s original meaning.',
    tone_professional: 'Rewrite the text in a polished, executive, professional tone.',
    tone_concise: 'Make the text as concise as possible, eliminating filler while retaining all key substance.',
    expand: 'Expand on the key ideas presented in the text, providing constructive detail and structured elaboration.'
  };

  const prompts: Record<string, string> = {
    summarize: `Summarize the following text:\n\n${selectedText}`,
    polish: `Polish and improve the following text:\n\n${selectedText}`,
    tone_professional: `Rewrite in a professional tone:\n\n${selectedText}`,
    tone_concise: `Make concise:\n\n${selectedText}`,
    expand: `Expand on this text:\n\n${selectedText}`
  };

  const systemInstruction = systemInstructions[actionType] || 'You are an expert writing assistant.';
  const prompt = prompts[actionType] || selectedText;

  const config = getStoredConfig();
  try {
    const response = await generateContent(config, prompt, systemInstruction);
    lastGeneratedText = response;
    return { success: true, text: response };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Handles a custom freeform prompt typed by the user.
 * CRITICAL RULE: Transmits the user's prompt verbatim without alterations.
 */
export async function handleCustomPrompt(userPrompt: string): Promise<ActionResult> {
  if (!userPrompt || userPrompt.trim() === '') {
    return {
      success: false,
      message: 'Please enter a prompt or instruction.'
    };
  }

  const config = getStoredConfig();
  try {
    const response = await generateContent(
      config,
      userPrompt, // Exact user prompt sent directly
      'You are Gemini, a direct and helpful AI writing partner in Microsoft Word.'
    );
    lastGeneratedText = response;
    return { success: true, text: response };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export function initializeTaskpaneUI(container: HTMLElement): void {
  const currentConfig = getStoredConfig();

  container.innerHTML = `
    <div class="taskpane-container">
      <div class="taskpane-header">
        <div class="header-title">
          <span>Gemini Assistant</span>
          <span class="gemini-badge">3.8 Flash</span>
        </div>
        <button id="btn-open-settings" class="settings-btn" title="Settings" aria-label="Settings">
          ⚙️
        </button>
      </div>

      <div id="status-banner" class="status-banner"></div>

      <!-- Quick Actions -->
      <div class="section-title">Quick Actions (on selection)</div>
      <div class="quick-actions-grid">
        <button class="action-pill" data-action="summarize">📝 Summarize</button>
        <button class="action-pill" data-action="polish">✨ Polish Flow</button>
        <button class="action-pill" data-action="tone_professional">👔 Professional</button>
        <button class="action-pill" data-action="tone_concise">✂️ Make Concise</button>
        <button class="action-pill" data-action="expand">🔍 Expand Idea</button>
      </div>

      <!-- Custom Prompt Box -->
      <div class="section-title">Custom Instruction / Chat</div>
      <div class="prompt-box">
        <textarea id="custom-prompt-input" placeholder="Type instructions or questions for Gemini..."></textarea>
        <button id="btn-send-prompt" class="send-btn">
          <span>Send</span> ➔
        </button>
      </div>

      <!-- Output Preview -->
      <div class="output-section">
        <div class="section-title">Response Preview</div>
        <div id="output-preview" class="output-card">Ready. Select text or ask Gemini a question.</div>
        <div class="output-actions">
          <button id="btn-insert-cursor" class="btn-primary-action">Insert at Cursor</button>
          <button id="btn-replace-selection" class="btn-secondary">Replace Selection</button>
          <button id="btn-copy-output" class="btn-secondary">📋 Copy</button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-title">Gemini API Settings</div>
        <div class="form-group">
          <label for="input-api-key">Gemini API Key</label>
          <input type="password" id="input-api-key" placeholder="AIzaSy..." value="${currentConfig.apiKey || ''}" />
        </div>
        <div class="form-group">
          <label for="select-model">Model Selection</label>
          <select id="select-model">
            ${SUPPORTED_MODELS.map(
              m => `<option value="${m.id}" ${m.id === currentConfig.model ? 'selected' : ''}>${m.label}</option>`
            ).join('')}
          </select>
        </div>
        <div style="display:flex; justify-content: flex-end; gap:8px; margin-top:8px;">
          <button id="btn-close-settings" class="btn-secondary">Cancel</button>
          <button id="btn-save-settings" class="btn-primary-action">Save Settings</button>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const statusBanner = container.querySelector('#status-banner') as HTMLElement;
  const outputPreview = container.querySelector('#output-preview') as HTMLElement;
  const promptInput = container.querySelector('#custom-prompt-input') as HTMLTextAreaElement;
  const sendBtn = container.querySelector('#btn-send-prompt') as HTMLButtonElement;
  const settingsModal = container.querySelector('#settings-modal') as HTMLElement;
  const openSettingsBtn = container.querySelector('#btn-open-settings') as HTMLButtonElement;
  const closeSettingsBtn = container.querySelector('#btn-close-settings') as HTMLButtonElement;
  const saveSettingsBtn = container.querySelector('#btn-save-settings') as HTMLButtonElement;
  const apiKeyInput = container.querySelector('#input-api-key') as HTMLInputElement;
  const modelSelect = container.querySelector('#select-model') as HTMLSelectElement;

  function showStatus(msg: string, type: 'error' | 'success' | 'info') {
    if (!statusBanner) return;
    statusBanner.className = `status-banner ${type}`;
    statusBanner.textContent = msg;
    statusBanner.style.display = 'block';
  }

  function hideStatus() {
    if (!statusBanner) return;
    statusBanner.style.display = 'none';
  }

  // Check API key on start
  if (!currentConfig.apiKey) {
    showStatus('Please configure your Gemini API Key in Settings ⚙️ to begin.', 'info');
  }

  // Quick action buttons
  const pills = container.querySelectorAll('.action-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', async () => {
      hideStatus();
      const action = (pill as HTMLElement).dataset.action || '';
      outputPreview.textContent = 'Generating with Gemini 3.8 Flash...';
      const result = await handleQuickAction(action);
      if (result.success && result.text) {
        outputPreview.textContent = result.text;
      } else {
        outputPreview.textContent = 'Action failed.';
        showStatus(result.message || 'Error occurred.', 'error');
      }
    });
  });

  // Custom prompt send
  sendBtn?.addEventListener('click', async () => {
    hideStatus();
    const prompt = promptInput?.value || '';
    if (!prompt.trim()) {
      showStatus('Please enter a prompt.', 'error');
      return;
    }
    outputPreview.textContent = 'Thinking...';
    sendBtn.disabled = true;
    const result = await handleCustomPrompt(prompt);
    sendBtn.disabled = false;
    if (result.success && result.text) {
      outputPreview.textContent = result.text;
    } else {
      outputPreview.textContent = 'Generation failed.';
      showStatus(result.message || 'Error occurred.', 'error');
    }
  });

  // Insert actions
  container.querySelector('#btn-insert-cursor')?.addEventListener('click', async () => {
    if (!lastGeneratedText) {
      showStatus('No generated text to insert.', 'info');
      return;
    }
    try {
      await insertTextAtCursor(lastGeneratedText);
      showStatus('Inserted at cursor position.', 'success');
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  });

  container.querySelector('#btn-replace-selection')?.addEventListener('click', async () => {
    if (!lastGeneratedText) {
      showStatus('No generated text to replace with.', 'info');
      return;
    }
    try {
      await replaceSelectedText(lastGeneratedText);
      showStatus('Replaced selection.', 'success');
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  });

  container.querySelector('#btn-copy-output')?.addEventListener('click', () => {
    if (!lastGeneratedText) {
      showStatus('No text to copy.', 'info');
      return;
    }
    navigator.clipboard?.writeText(lastGeneratedText);
    showStatus('Copied to clipboard!', 'success');
  });

  // Settings modal
  openSettingsBtn?.addEventListener('click', () => {
    settingsModal.style.display = 'block';
  });
  closeSettingsBtn?.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
  saveSettingsBtn?.addEventListener('click', () => {
    saveConfig({
      apiKey: apiKeyInput?.value || '',
      model: modelSelect?.value || DEFAULT_MODEL
    });
    settingsModal.style.display = 'none';
    showStatus('Settings saved successfully.', 'success');
  });
}

// Office initialization bootstrap
if (typeof (globalThis as any).Office !== 'undefined') {
  (globalThis as any).Office.onReady(() => {
    const appEl = document.getElementById('app');
    if (appEl) {
      initializeTaskpaneUI(appEl);
    }
  });
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const appEl = document.getElementById('app');
    if (appEl) {
      initializeTaskpaneUI(appEl);
    }
  });
}
