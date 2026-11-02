import {
  streamGenerateContent,
  getStoredConfig,
  saveConfig,
  DEFAULT_MODEL,
  SUPPORTED_MODELS,
  ChatMessage
} from '../services/geminiService';
import {
  getSelectedText,
  replaceSelectedMarkdown,
  insertMarkdownAtCursor,
  isOfficeInitialized
} from '../services/wordService';
import {
  analyzeReadability,
  WRITING_MODES,
  ReadabilityMetrics
} from '../services/antiSlopService';
import {
  computeWordDiff,
  renderDiffToHtml,
  DiffPart
} from '../services/diffService';

export interface ActionResult {
  success: boolean;
  text?: string;
  message?: string;
  diffParts?: DiffPart[];
  metrics?: ReadabilityMetrics;
}

let lastOriginalText = '';
let lastGeneratedText = '';
let lastDiffParts: DiffPart[] = [];
let lastMetrics: ReadabilityMetrics | null = null;
let currentViewMode: 'clean' | 'diff' = 'clean';
let chatHistory: ChatMessage[] = [];

export function clearChatHistory(): void {
  chatHistory = [];
  lastOriginalText = '';
  lastGeneratedText = '';
  lastDiffParts = [];
  lastMetrics = null;
}

export function getChatHistory(): ChatMessage[] {
  return chatHistory;
}

export function getLastOriginalText(): string {
  return lastOriginalText;
}

export function getLastGeneratedText(): string {
  return lastGeneratedText;
}

export function getLastDiffParts(): DiffPart[] {
  return lastDiffParts;
}

export function getLastMetrics(): ReadabilityMetrics | null {
  return lastMetrics;
}

/**
 * Executes an anti-slop or quick action rewrite on selected document text with streaming.
 * CRITICAL RULE: The selected text is sent verbatim to preserve user voice.
 */
export async function handleQuickAction(
  actionType: string,
  onChunk?: (accumulatedText: string) => void
): Promise<ActionResult> {
  const selectedText = await getSelectedText();
  if (!selectedText || selectedText.trim() === '') {
    return {
      success: false,
      message: 'Please select text in your document first to use this quick action.'
    };
  }

  // Map action to writing modes or legacy actions
  let systemInstruction = '';
  let prompt = '';

  if (actionType === 'plain_english' || actionType === 'tone_plain') {
    systemInstruction = WRITING_MODES.plain_english.systemInstruction;
    prompt = `Rewrite the following text into clear Plain English:\n\n${selectedText}`;
  } else if (actionType === 'academic_zero_slop' || actionType === 'tone_professional') {
    systemInstruction = WRITING_MODES.academic_zero_slop.systemInstruction;
    prompt = `Rewrite the following text with strict academic rigor and zero AI slop:\n\n${selectedText}`;
  } else if (actionType === 'executive_concise' || actionType === 'tone_concise') {
    systemInstruction = WRITING_MODES.executive_concise.systemInstruction;
    prompt = `Rewrite to be executive and concise (cut 50% words):\n\n${selectedText}`;
  } else if (actionType === 'polish' || actionType === 'fluency') {
    systemInstruction = WRITING_MODES.fluency.systemInstruction;
    prompt = `Polish and improve the sentence flow of the following text:\n\n${selectedText}`;
  } else if (actionType === 'expand') {
    systemInstruction = WRITING_MODES.expand.systemInstruction;
    prompt = `Substantively expand upon this text with concrete technical detail:\n\n${selectedText}`;
  } else if (actionType === 'summarize') {
    systemInstruction =
      "You are an executive assistant. Summarize the user's text clearly and concisely using clean headings and bullet points. Never use fluff or AI clichés.";
    prompt = `Summarize the following text:\n\n${selectedText}`;
  } else {
    systemInstruction = WRITING_MODES.plain_english.systemInstruction;
    prompt = selectedText;
  }

  const config = getStoredConfig();
  try {
    const response = await streamGenerateContent(
      config,
      prompt,
      (accum) => {
        if (onChunk) onChunk(accum);
      },
      systemInstruction
    );

    lastOriginalText = selectedText;
    lastGeneratedText = response;
    lastDiffParts = computeWordDiff(selectedText, response);
    lastMetrics = analyzeReadability(response);

    return {
      success: true,
      text: response,
      diffParts: lastDiffParts,
      metrics: lastMetrics
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Handles a custom freeform prompt typed by the user with multi-turn memory & streaming.
 * CRITICAL RULE: Transmits the user's prompt verbatim without alterations.
 */
export async function handleCustomPrompt(
  userPrompt: string,
  onChunk?: (accumulatedText: string) => void
): Promise<ActionResult> {
  if (!userPrompt || userPrompt.trim() === '') {
    return {
      success: false,
      message: 'Please enter a prompt or instruction.'
    };
  }

  // Append user message to history verbatim
  chatHistory.push({
    role: 'user',
    parts: [{ text: userPrompt }]
  });

  const config = getStoredConfig();
  try {
    const response = await streamGenerateContent(
      config,
      chatHistory,
      (accum) => {
        if (onChunk) onChunk(accum);
      },
      'You are Gemini, a direct and helpful AI writing partner in Microsoft Word. Output clean markdown where appropriate.'
    );

    // Append model reply to history
    chatHistory.push({
      role: 'model',
      parts: [{ text: response }]
    });

    lastOriginalText = userPrompt;
    lastGeneratedText = response;
    lastDiffParts = computeWordDiff(userPrompt, response);
    lastMetrics = analyzeReadability(response);

    return {
      success: true,
      text: response,
      diffParts: lastDiffParts,
      metrics: lastMetrics
    };
  } catch (err: any) {
    // Pop failed user turn
    chatHistory.pop();
    return { success: false, message: err.message };
  }
}

export function initializeTaskpaneUI(container: HTMLElement): void {
  const currentConfig = getStoredConfig();

  container.innerHTML = `
    <div class="taskpane-container">
      <!-- Header -->
      <div class="taskpane-header">
        <div class="header-title">
          <span>Gemini Assistant</span>
          <span class="gemini-badge">3.8 Flash</span>
        </div>
        <div class="header-controls">
          <button id="btn-clear-chat" class="settings-btn" title="Clear Chat & Reset Memory" aria-label="Clear Chat History">
            🗑️
          </button>
          <button id="btn-open-settings" class="settings-btn" title="Configure API & Slop Guard" aria-label="Settings">
            ⚙️
          </button>
        </div>
      </div>

      <div id="status-banner" class="status-banner"></div>

      <!-- QuillBot-Style Anti-Slop Modes -->
      <div class="section-title">Writing Modes (On Selection)</div>
      <div class="quick-actions-grid">
        <button class="action-pill active-mode" data-action="plain_english" title="Flesch Grade 6-8, active voice, citation protection">
          ✨ Plain English
        </button>
        <button class="action-pill" data-action="academic_zero_slop" title="Rigorous academic defense, zero hollow cliches">
          🛡️ Academic Zero-Slop
        </button>
        <button class="action-pill" data-action="executive_concise" title="50% word reduction, front-loads verbs">
          ✂️ Make Concise
        </button>
        <button class="action-pill" data-action="summarize" title="Clean bullets & executive overview">
          📝 Summarize
        </button>
        <button class="action-pill" data-action="polish" title="Fixes mechanics while preserving author voice">
          ✨ Polish Flow
        </button>
        <button class="action-pill" data-action="expand" title="Substantive depth without buzzwords">
          🔍 Expand Idea
        </button>
      </div>

      <!-- Custom Prompt Box -->
      <div class="section-title">Custom Instruction / Chat (Multi-turn)</div>
      <div class="prompt-box">
        <textarea id="custom-prompt-input" placeholder="Ask Gemini or type instructions for selected text..."></textarea>
        <button id="btn-send-prompt" class="send-btn" title="Send verbatim instruction">
          <span>Send</span> ➔
        </button>
      </div>

      <!-- Output Preview Section -->
      <div class="output-section">
        <div class="output-header-bar">
          <div class="section-title" style="margin-bottom:0;">Response Preview</div>
          <div class="view-toggle-group">
            <button id="btn-view-clean" class="view-toggle-btn active" title="Show clean rewritten text">Clean</button>
            <button id="btn-view-diff" class="view-toggle-btn" title="Show word additions and deletions">Changes (Diff)</button>
          </div>
        </div>

        <!-- Output Card Container -->
        <div id="output-preview" class="output-card">Ready. Select text in Word or ask Gemini a question.</div>

        <!-- Readability & Slop Meter Bar -->
        <div id="readability-meter" class="readability-meter-bar" style="display: none;">
          <div class="meter-chip" id="meter-ease" title="Flesch Reading Ease score">
            <span class="chip-label">Ease</span>
            <span class="chip-value" id="val-ease">--</span>
          </div>
          <div class="meter-chip" id="meter-grade" title="Flesch-Kincaid Grade Level">
            <span class="chip-label">Grade</span>
            <span class="chip-value" id="val-grade">--</span>
          </div>
          <div class="meter-chip" id="meter-cadence" title="Sentence length standard deviation (target >= 5.0)">
            <span class="chip-label">Cadence</span>
            <span class="chip-value" id="val-cadence">--</span>
          </div>
          <div class="meter-chip" id="meter-slop" title="AI Slop Words Detector">
            <span class="chip-value" id="val-slop">🛡️ Clean</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="output-actions">
          <button id="btn-insert-cursor" class="btn-primary-action" title="Insert formatted content at cursor">
            Insert at Cursor
          </button>
          <button id="btn-replace-selection" class="btn-secondary" title="Replace highlighted Word selection">
            Replace Selection
          </button>
          <button id="btn-insert-diff" class="btn-secondary" title="Insert with green/red tracked change highlights into Word">
            Insert with Changes
          </button>
          <button id="btn-copy-output" class="btn-secondary" title="Copy to clipboard">
            📋 Copy
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Modal Drawer -->
    <div id="settings-modal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-title">Gemini & Writing Flow Settings</div>
        
        <div class="form-group">
          <label for="input-api-key">Gemini API Key</label>
          <input type="password" id="input-api-key" placeholder="AIzaSy..." />
        </div>

        <div class="form-group">
          <label for="select-model">Model Selection</label>
          <select id="select-model">
            ${SUPPORTED_MODELS.map(
              m => `<option value="${m.id}" ${m.id === currentConfig.model ? 'selected' : ''}>${m.label}</option>`
            ).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="select-slop-guard">Anti-AI-Slop Guard</label>
          <select id="select-slop-guard">
            <option value="strict" ${(currentConfig.antiSlopGuard ?? 'strict') === 'strict' ? 'selected' : ''}>Strict (Bans delve, tapestry, beacon, testament, etc.)</option>
            <option value="moderate" ${currentConfig.antiSlopGuard === 'moderate' ? 'selected' : ''}>Moderate (Discourages common clichés)</option>
            <option value="off" ${currentConfig.antiSlopGuard === 'off' ? 'selected' : ''}>Off (Standard Gemini behavior)</option>
          </select>
        </div>

        <div class="form-group-checkbox">
          <label class="checkbox-label">
            <input type="checkbox" id="check-preserve-citations" ${currentConfig.preserveCitations !== false ? 'checked' : ''} />
            <span>Preserve Academic Citations & Domain Nouns ((Smith, 2021), [1], etc.)</span>
          </label>
        </div>

        <div class="form-group">
          <label for="input-custom-system">Custom Project Instructions (Appended)</label>
          <textarea id="input-custom-system" placeholder="e.g. Always write in British English, format numbers with commas...">${currentConfig.customSystemInstruction || ''}</textarea>
        </div>

        <div class="modal-footer">
          <button id="btn-close-settings" class="btn-secondary">Cancel</button>
          <button id="btn-save-settings" class="btn-primary-action">Save Settings</button>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners & state controllers
  const statusBanner = container.querySelector('#status-banner') as HTMLElement;
  const outputPreview = container.querySelector('#output-preview') as HTMLElement;
  const promptInput = container.querySelector('#custom-prompt-input') as HTMLTextAreaElement;
  const sendBtn = container.querySelector('#btn-send-prompt') as HTMLButtonElement;
  const clearChatBtn = container.querySelector('#btn-clear-chat') as HTMLButtonElement;
  const settingsModal = container.querySelector('#settings-modal') as HTMLElement;
  const openSettingsBtn = container.querySelector('#btn-open-settings') as HTMLButtonElement;
  const closeSettingsBtn = container.querySelector('#btn-close-settings') as HTMLButtonElement;
  const saveSettingsBtn = container.querySelector('#btn-save-settings') as HTMLButtonElement;
  const apiKeyInput = container.querySelector('#input-api-key') as HTMLInputElement;
  const modelSelect = container.querySelector('#select-model') as HTMLSelectElement;
  const slopGuardSelect = container.querySelector('#select-slop-guard') as HTMLSelectElement;
  const preserveCitationsCheck = container.querySelector('#check-preserve-citations') as HTMLInputElement;
  const customSystemInput = container.querySelector('#input-custom-system') as HTMLTextAreaElement;

  const btnViewClean = container.querySelector('#btn-view-clean') as HTMLButtonElement;
  const btnViewDiff = container.querySelector('#btn-view-diff') as HTMLButtonElement;
  const readabilityMeter = container.querySelector('#readability-meter') as HTMLElement;
  const valEase = container.querySelector('#val-ease') as HTMLElement;
  const valGrade = container.querySelector('#val-grade') as HTMLElement;
  const valCadence = container.querySelector('#val-cadence') as HTMLElement;
  const valSlop = container.querySelector('#val-slop') as HTMLElement;

  if (apiKeyInput) {
    apiKeyInput.value = currentConfig.apiKey || '';
  }

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

  function updateOutputDisplay() {
    if (!lastGeneratedText) return;

    if (currentViewMode === 'clean') {
      outputPreview.textContent = lastGeneratedText;
    } else {
      if (lastDiffParts.length > 0) {
        outputPreview.innerHTML = renderDiffToHtml(lastDiffParts);
      } else {
        outputPreview.textContent = lastGeneratedText;
      }
    }

    // Update readability meter
    if (lastMetrics && readabilityMeter) {
      readabilityMeter.style.display = 'flex';
      if (valEase) valEase.textContent = `${lastMetrics.fleschReadingEase}`;
      if (valGrade) valGrade.textContent = `Gr ${lastMetrics.fkGradeLevel}`;
      if (valCadence) valCadence.textContent = `Cadence ${lastMetrics.burstiness}`;

      if (valSlop) {
        if (lastMetrics.slopWords.length === 0) {
          valSlop.textContent = '🛡️ Zero Slop';
          valSlop.className = 'chip-value slop-clean';
        } else {
          valSlop.textContent = `⚠️ Flag: ${lastMetrics.slopWords.join(', ')}`;
          valSlop.className = 'chip-value slop-flagged';
        }
      }
    }
  }

  // Check API key on initial load
  if (!currentConfig.apiKey) {
    showStatus('Please configure your Gemini API Key in Settings ⚙️ to begin.', 'info');
  }

  // Clear chat
  clearChatBtn?.addEventListener('click', () => {
    clearChatHistory();
    outputPreview.textContent = 'Chat history cleared. Ready for new prompt.';
    if (readabilityMeter) readabilityMeter.style.display = 'none';
    showStatus('Chat memory & cache reset.', 'info');
  });

  // View toggle (Clean vs Diff)
  btnViewClean?.addEventListener('click', () => {
    currentViewMode = 'clean';
    btnViewClean.classList.add('active');
    btnViewDiff.classList.remove('active');
    updateOutputDisplay();
  });

  btnViewDiff?.addEventListener('click', () => {
    currentViewMode = 'diff';
    btnViewDiff.classList.add('active');
    btnViewClean.classList.remove('active');
    updateOutputDisplay();
  });

  // Quick action buttons with streaming
  const pills = container.querySelectorAll('.action-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', async () => {
      hideStatus();
      pills.forEach(p => p.classList.remove('active-mode'));
      pill.classList.add('active-mode');

      const action = (pill as HTMLElement).dataset.action || '';
      outputPreview.textContent = 'Streaming with Gemini 3.8 Flash...';
      const result = await handleQuickAction(action, (accum) => {
        if (currentViewMode === 'clean') {
          outputPreview.textContent = accum;
        }
      });

      if (result.success && result.text) {
        updateOutputDisplay();
      } else {
        outputPreview.textContent = 'Action failed.';
        showStatus(result.message || 'Error occurred.', 'error');
      }
    });
  });

  // Custom prompt send with streaming
  sendBtn?.addEventListener('click', async () => {
    hideStatus();
    const prompt = promptInput?.value || '';
    if (!prompt.trim()) {
      showStatus('Please enter a prompt.', 'error');
      return;
    }
    outputPreview.textContent = 'Thinking with Gemini 3.8 Flash...';
    sendBtn.disabled = true;
    promptInput.value = '';
    const result = await handleCustomPrompt(prompt, (accum) => {
      if (currentViewMode === 'clean') {
        outputPreview.textContent = accum;
      }
    });
    sendBtn.disabled = false;
    if (result.success && result.text) {
      updateOutputDisplay();
    } else {
      outputPreview.textContent = 'Generation failed.';
      showStatus(result.message || 'Error occurred.', 'error');
    }
  });

  // Insert actions using native Word HTML markdown parsing
  container.querySelector('#btn-insert-cursor')?.addEventListener('click', async () => {
    if (!lastGeneratedText) {
      showStatus('No generated text to insert.', 'info');
      return;
    }
    try {
      await insertMarkdownAtCursor(lastGeneratedText);
      showStatus('Inserted formatted content at cursor.', 'success');
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
      await replaceSelectedMarkdown(lastGeneratedText);
      showStatus('Replaced selection with formatted content.', 'success');
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  });

  // Insert with tracked diff highlights
  container.querySelector('#btn-insert-diff')?.addEventListener('click', async () => {
    if (lastDiffParts.length === 0) {
      showStatus('No diff available to insert.', 'info');
      return;
    }
    try {
      const diffHtml = renderDiffToHtml(lastDiffParts);
      await insertMarkdownAtCursor(diffHtml);
      showStatus('Inserted diff with changes at cursor.', 'success');
    } catch (err: any) {
      showStatus(err.message, 'error');
    }
  });

  // Copy to clipboard
  container.querySelector('#btn-copy-output')?.addEventListener('click', () => {
    if (!lastGeneratedText) {
      showStatus('No text to copy.', 'info');
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(lastGeneratedText)
        .then(() => showStatus('Copied to clipboard!', 'success'))
        .catch(err => showStatus(`Failed to copy: ${err.message}`, 'error'));
    } else {
      showStatus('Clipboard API not supported in this environment.', 'error');
    }
  });

  // Settings modal controls
  openSettingsBtn?.addEventListener('click', () => {
    settingsModal.style.display = 'block';
  });
  closeSettingsBtn?.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
  saveSettingsBtn?.addEventListener('click', () => {
    saveConfig({
      apiKey: apiKeyInput?.value || '',
      model: modelSelect?.value || DEFAULT_MODEL,
      antiSlopGuard: (slopGuardSelect?.value as any) || 'strict',
      preserveCitations: preserveCitationsCheck ? preserveCitationsCheck.checked : true,
      customSystemInstruction: customSystemInput?.value || ''
    });
    settingsModal.style.display = 'none';
    showStatus('Settings & Anti-Slop preferences saved.', 'success');
  });
}

export { isOfficeInitialized };

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
