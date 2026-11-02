# Gemini Microsoft Word Add-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Microsoft Word Taskpane Add-in that enables users to query Google Gemini (defaulting to `gemini-3.8-flash`), run quick text transformations (summarize, polish, adjust tone, expand), preview responses, and insert/replace text in Word with zero document overwrite risks.

**Architecture:** A client-side Office Web Add-in powered by Vite, TypeScript, and Office.js (`WordApi 1.3+`). Interacts directly with Google Gemini REST API / `@google/genai` using an API key stored securely in browser `localStorage`, rendered inside Word via `manifest.xml`.

**Tech Stack:** TypeScript, Vite, `@microsoft/office-js`, `@types/office-js`, Vitest for unit testing, Vite HTTPS plugin (`vite-plugin-mkcert` or self-signed dev certs).

**Spec:** [`C:\Users\LENOVO\.gemini\antigravity\scratch\word-gemini-addin\docs\superpowers\specs\2026-11-02-gemini-word-addin-design.md`](file:///C:/Users/LENOVO/.gemini/antigravity/scratch/word-gemini-addin/docs/superpowers/specs/2026-11-02-gemini-word-addin-design.md)

## Global Constraints
- Current Gemini model floor: `gemini-3.8-flash` (with support for `gemini-3.6-flash` and `gemini-3.5-flash-lite`). Legacy/restricted models (Gemini 2.5/1.5) must not be default.
- Exact user prompt fidelity: User prompts and instructions must be passed verbatim without summarization, rephrasing, or voice altering.
- Office.js requirement: Target `WordApi 1.3+` compatibility across Word Desktop (Windows/Mac) and Word Online.
- API Key Security: Key stored in `localStorage` client-side only; never committed, logged, or hardcoded.
- HTTPS required: Local development server must serve over HTTPS for Word to load the taskpane iframe.

## Review Focus
1. **Empty Selection Handling:** User clicks a quick action (e.g. "Summarize") without selecting any text in Word. Expected behavior: graceful UI warning asking the user to highlight text or offer to process the entire document body.
2. **Missing or Invalid API Key:** User triggers an action before saving an API key or provides an invalid key. Expected behavior: clear error banner and immediate prompt to open the Settings drawer to set their key.
3. **Large Document / Token Limit Exceeded:** Selected text exceeds Gemini context or payload quota. Expected behavior: display user-friendly error toast with token limit guidance instead of silent failure.
4. **Network Timeout / API Rate Limit:** 429 or 503 response from Gemini API. Expected behavior: retry guidance with non-blocking error display and preservation of user prompt in the input box.
5. **No Accidental Overwrite:** Insertion actions ("Insert at Cursor", "Replace Selection") must only touch the specified target range and never wipe out unselected document content.

---

### Task 1: Project Scaffolding & Office Add-in Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.xml`
- Create: `index.html`
- Create: `tests/setup.ts`

**Interfaces:**
- Produces: Working Vite development setup with HTTPS, Office.js typings, and a valid `manifest.xml` pointing to `https://localhost:3000/index.html`.

- [ ] **Step 1: Write test for manifest validity and basic project configuration**
  Create `tests/manifest.test.ts` to verify `manifest.xml` contains valid GUID, Word Host (`Document`), and taskpane URLs.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/manifest.test.ts` -> Expected: FAIL (missing files)
- [ ] **Step 3: Implement `package.json`, `tsconfig.json`, `vite.config.ts`, `manifest.xml`, and `index.html`**
  Configure Vite to serve HTTPS on port 3000, add `@microsoft/office-js` script tags in `index.html`, and set up Vitest.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/manifest.test.ts` -> Expected: PASS
- [ ] **Step 5: Commit**
  `git add . && git commit -m "chore: scaffold Office taskpane add-in with Vite and manifest"`

---

### Task 2: Gemini API Client Service

**Files:**
- Create: `src/services/geminiService.ts`
- Test: `tests/services/geminiService.test.ts`

**Interfaces:**
- Consumes: User API key, model selection (`gemini-3.8-flash`), exact prompt string.
- Produces:
  ```typescript
  export interface GeminiConfig {
    apiKey: string;
    model: string; // defaults to 'gemini-3.8-flash'
  }
  export async function generateContent(config: GeminiConfig, prompt: string, systemInstruction?: string): Promise<string>;
  export function getStoredConfig(): GeminiConfig;
  export function saveConfig(config: GeminiConfig): void;
  ```

- [ ] **Step 1: Write failing unit tests for `geminiService`**
  Test API key persistence in `localStorage`, request payload structure matching `gemini-3.8-flash` REST endpoint, and exact prompt transmission (zero alteration).
- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/services/geminiService.test.ts` -> Expected: FAIL
- [ ] **Step 3: Implement `geminiService.ts`**
  Implement `generateContent`, `getStoredConfig`, and `saveConfig` with `gemini-3.8-flash` default, error response normalization (401, 429, 500), and exact prompt preservation.
- [ ] **Step 4: Run tests to verify pass**
  Run: `npx vitest run tests/services/geminiService.test.ts` -> Expected: PASS
- [ ] **Step 5: Commit**
  `git add src/services/geminiService.ts tests/services/geminiService.test.ts && git commit -m "feat: add Gemini API client service with gemini-3.8-flash"`

---

### Task 3: Office.js Word Document Interop Service

**Files:**
- Create: `src/services/wordService.ts`
- Test: `tests/services/wordService.test.ts`

**Interfaces:**
- Consumes: Office.js runtime `Word.run`.
- Produces:
  ```typescript
  export async function getSelectedText(): Promise<string>;
  export async function getDocumentBodyText(): Promise<string>;
  export async function replaceSelectedText(newText: string): Promise<void>;
  export async function insertTextAtCursor(newText: string): Promise<void>;
  ```

- [ ] **Step 1: Write unit tests mocking `Word.run` and Office.js context**
  Verify selection text extraction, empty selection fallback, `Word.InsertLocation.replace`, and `Word.InsertLocation.after`.
- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/services/wordService.test.ts` -> Expected: FAIL
- [ ] **Step 3: Implement `wordService.ts`**
  Wrap `Word.run` operations safely, handling cases where Word is running vs mock browser environment.
- [ ] **Step 4: Run tests to verify pass**
  Run: `npx vitest run tests/services/wordService.test.ts` -> Expected: PASS
- [ ] **Step 5: Commit**
  `git add src/services/wordService.ts tests/services/wordService.test.ts && git commit -m "feat: add Word Office.js interop service"`

---

### Task 4: Taskpane UI Components & Quick Actions

**Files:**
- Create: `src/ui/taskpane.ts`
- Create: `src/ui/styles.css`
- Modify: `index.html`
- Test: `tests/ui/taskpane.test.ts`

**Interfaces:**
- Consumes: `geminiService.ts`, `wordService.ts`.
- Produces: Interactive sidebar with:
  - Header with Settings toggle button
  - Quick Action pills: *Summarize*, *Proofread / Polish*, *Tone: Professional*, *Tone: Concise*, *Expand Selection*
  - Freeform Prompt Box with "Send to Gemini"
  - Output Preview Card with status spinner, error banners, and action buttons: "Insert at Cursor", "Replace Selection", "Copy"
  - Settings Modal/Drawer to set/update API key and model choice (`gemini-3.8-flash`)

- [ ] **Step 1: Write UI component tests in `tests/ui/taskpane.test.ts`**
  Verify quick actions dispatch the correct system instruction alongside verbatim selected text, and preview buttons call `wordService`.
- [ ] **Step 2: Run tests to verify failure**
  Run: `npx vitest run tests/ui/taskpane.test.ts` -> Expected: FAIL
- [ ] **Step 3: Implement `src/ui/taskpane.ts` and modern CSS styling in `src/ui/styles.css`**
  Render clean, responsive sidebar layout following Microsoft Fluent / modern card design. Connect event listeners to `geminiService` and `wordService`.
- [ ] **Step 4: Run tests to verify pass**
  Run: `npx vitest run tests/ui/taskpane.test.ts` -> Expected: PASS
- [ ] **Step 5: Commit**
  `git add src/ui/ index.html tests/ui/ && git commit -m "feat: implement taskpane UI, quick actions, and settings drawer"`

---

### Task 5: Verification, Local Sideloading Scripts & Documentation

**Files:**
- Create: `README.md`
- Create: `scripts/sideload.ps1`
- Test: `tests/e2e-simulation.test.ts`

**Interfaces:**
- Produces: Complete end-to-end simulated test suite, one-click Windows sideloading helper, and step-by-step instructions for running in Word Desktop and Word Online.

- [ ] **Step 1: Write integration simulation test `tests/e2e-simulation.test.ts`**
  Verify entire flow: Set API key -> Select text in document -> Click "Summarize" -> Verify Gemini request payload has exact selection -> Verify response renders -> Click "Replace Selection" -> Verify Word document selection updated.
- [ ] **Step 2: Run tests to verify pass**
  Run: `npx vitest run tests/e2e-simulation.test.ts` -> Expected: PASS
- [ ] **Step 3: Create `scripts/sideload.ps1` and comprehensive `README.md`**
  Include Windows Network Share sideloading steps and Word for the Web "Upload My Add-in" instructions.
- [ ] **Step 4: Run full test suite**
  Run: `npm test` -> Expected: All test suites PASS
- [ ] **Step 5: Final commit**
  `git add . && git commit -m "docs: add README, sideload scripts, and verify full integration"`
