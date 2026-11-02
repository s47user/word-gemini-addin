# Conversation Learnings & Knowledge Sync Log

## Date: 2026-11-02
**Project:** Gemini Microsoft Word Integration (Office Web Add-in)  
**Location:** `C:\Users\LENOVO\.gemini\antigravity\scratch\word-gemini-addin`

---

### 1. Key Directives & Rules Established
* **Prompt Fidelity:** When the user provides words, prompts, or instructions, do not edit, paraphrase, or summarize them. Transmit their exact words and voice directly.
* **Proactivity:** Skills and standards must be applied proactively without requiring the user to invoke or ask for them.
* **Up-to-Date Baseline (2026):**
  * Modern Gemini Model: Default to `gemini-3.8-flash` (or `gemini-3.6-flash`, `gemini-3.5-flash-lite`).
  * Legacy models like Gemini 2.5 series have restricted access and must not be used as defaults.
  * Modern SDK: `@google/genai` (not legacy `@google/generative-ai`).
* **Persistent Documentation:** Maintain this conversation and architectural learnings log continuously so that `antigravity-memory` stays fully updated.

---

### 2. Architectural Decisions
* **Selected Approach:** Modern Office Web Add-in (Taskpane & Ribbon Button) using TypeScript, React/Fluent UI or Vite, and Office.js (`WordApi 1.3+`).
* **Document Interaction Pattern:**
  * Reads current selection via `context.document.getSelection().text`.
  * Safe preview in the taskpane before modifying document.
  * Direct insert/replace via `selection.insertText(text, Word.InsertLocation.replace)` or cursor insertion.
* **API Integration:**
  * Client-side call with user's personal API key stored in browser `localStorage`.
  * Configurable model selector defaulting to `gemini-3.8-flash`.

---

### 3. Vetted Reference Repositories
* **[Kuingsmile/word-GPT-Plus](https://github.com/Kuingsmile/word-GPT-Plus):**
  * Top reference for Word taskpane AI add-ins. Supports Gemini, OpenAI, and Azure.
  * Features a Copilot-style taskpane, dual chat/agent modes, and one-click text replacement/insertion.
* **[OfficeDev/Office-Addin-TaskPane-React](https://github.com/OfficeDev/Office-Addin-TaskPane-React):**
  * Microsoft's official template repository for Word React TypeScript taskpane add-ins.
* **[OfficeDev/Office-Add-in-samples](https://github.com/OfficeDev/Office-Add-in-samples):**
  * Official recipes for `Word.run`, batch document operations, and Ribbon command bindings.

---

### 4. Memory Sync Status
* `antigravity-memory` registered:
  * Constraint: `user_prompt_fidelity` (Scope: GLOBAL)
  * Constraint: `strict_up_to_date_information` (Scope: GLOBAL)
  * Constraint: `conversation_learning_persistence` (Scope: GLOBAL)
  * Fact: `gemini_current_model_2026` (Scope: GLOBAL)
  * Convention: `user_instruction_fidelity` (Layer: all)

### 5. Implementation Plan Created
* Created [`docs/superpowers/plans/2026-11-02-gemini-word-addin.md`](file:///C:/Users/LENOVO/.gemini/antigravity/scratch/word-gemini-addin/docs/superpowers/plans/2026-11-02-gemini-word-addin.md).
* Divided into 5 bite-sized, test-driven tasks:
  1. Project Scaffolding & Manifest Configuration (Vite + TypeScript + Office.js + dev-certs HTTPS).
  2. Gemini API Client Service (`gemini-3.8-flash` modern endpoint, localStorage key management, verbatim prompt fidelity).
  3. Office.js Word Document Interop Service (selection read, cursor insert, replace selection).
  4. Taskpane UI Components & Quick Actions (modern sidebar layout, action pills, response preview, settings drawer).
  5. End-to-End Verification, Sideloading Scripts & Documentation.
* Updated `antigravity-memory` pipeline stage.

### 6. Senior Code Review & Final Hardening Completed
* **Security & Header Isolation:** Migrated Gemini API authentication from URL query parameter to the standard `x-goog-api-key` header to prevent leaking keys in logs or Referer headers.
* **XSS / Markup Injection Prevention:** Switched API key population in the settings modal from template string interpolation to direct DOM property assignment (`apiKeyInput.value`).
* **Static Assets:** Created required Office Add-in icon assets (`icon-16.png`, `icon-32.png`, `icon-64.png`, `icon-80.png`) and `help.html` in `public/assets/` to satisfy Office manifest validators.
* **Resilience:** Wrapped `localStorage` access in `try...catch` blocks for sandboxed iframe contexts and added defensive fallback for `Word.InsertLocation` enums.
* **Verification:** Full test suite (17/17 tests passing) and production bundle build verified clean.

### 7. Local Microsoft Word Desktop Sideload Activated
* **Installed Application Detection:** Verified Microsoft Word Desktop installed at `C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE`.
* **Developer Registry Registration:** Automated direct registration of `manifest.xml` into `HKCU:\Software\Microsoft\Office\16.0\WEF\Developer\d24f7e1b-9e4a-4a25-8664-9b8849cfa320`.
* **Server Activation:** Active background HTTPS dev server listening on `https://localhost:3000/`.
* **Application Boot:** Launched local Microsoft Word Desktop instance with Developer Add-in loaded.

### 8. All 5 Real-World Friction Points Resolved
1. **SSL Certificate Trust for Edge WebView2:**
   - Configured `vite.config.ts` to consume official Office dev certs (`localhost.crt`, `localhost.key`) from `~/.office-addin-dev-certs`.
   - Created `scripts/trust-dev-cert.ps1` to trust the Root CA in Windows CurrentUser Certificate Store.
2. **Markdown to Native Word Formatting:**
   - Integrated `marked` parser into `wordService.ts`.
   - Replaced plain text insertion with `replaceSelectedMarkdown` and `insertMarkdownAtCursor` using WordApi `insertHtml` so bold headings, bulleted lists, and tables render with native Word typography instead of raw asterisks.
3. **Streaming Typewriter Effect:**
   - Implemented `streamGenerateContent` utilizing Server-Sent Events (`alt=sse`) from Gemini REST endpoint.
   - Text streams live into the taskpane preview card as tokens arrive.
4. **Multi-turn Conversational Chat Context:**
   - Added rolling `chatHistory: ChatMessage[]` so follow-up prompts ("make that shorter", "add bullet points") retain full conversational memory.
   - Added `🗑️ Clear Chat` button to easily reset conversational history.
5. **Server Persistence & 1-Click Desktop Launcher:**
   - Created `Start-Gemini-Word.bat` on the user's Desktop (`C:\Users\LENOVO\Desktop\Start-Gemini-Word.bat`) and project root.
   - 1-click startup automatically validates the Windows Office Developer registry, launches the background server, and opens Microsoft Word Desktop.
* **Testing:** 21/21 tests passing across 5 test suites.

### 9. Forensic Analysis of QuillBot vs Local Developer Add-in
* **Why QuillBot Needs No BAT File:** Inspected user's local WEF cache (`C:\Users\LENOVO\AppData\Local\Microsoft\Office\16.0\Wef\AppCommands\18.0\...\wa20000036818.0Worden-US`). QuillBot is an Office Store Web Add-in pulling directly from `https://word.quillbot.com/index.html`. Because its web files live 24/7 in the cloud with a public DigiCert SSL certificate, Word loads it automatically on startup without any local server running.
* **Why the Local Gemini Add-in Needed a BAT File:** Our setup was running in local developer mode (`https://localhost:3000`). If no local web server is running on port 3000, Word cannot load the iframe.
* **Solution to Make Gemini Exact Match to QuillBot:** Deploy the compiled `dist/` bundle to a free cloud host (GitHub Pages via `s47user.github.io/word-gemini-addin` or Vercel). Once the manifest points to that cloud URL, Word will load the Gemini tab automatically without ever running a `.bat` file or local server.

### 10. Deployed to GitHub Pages Cloud (QuillBot Parity Achieved)
* **Cloud Endpoint:** Deployed compiled bundle to GitHub Pages: `https://s47user.github.io/word-gemini-addin/index.html`.
* **Repository:** `https://github.com/s47user/word-gemini-addin` (published and public).
* **Live Health Check:** Verified via `curl` returning HTTP 200 with trusted public DigiCert SSL.
* **Manifest Alignment:** Updated `manifest.xml` to point to `https://s47user.github.io/word-gemini-addin/` for all assets, taskpane URLs, and icons.
* **Zero BAT Files / Zero Local Servers:** Deleted local launcher batch files. The add-in is now 100% cloud-hosted and fetched directly by Word over HTTPS, exactly like QuillBot.
* **Registry Alignment:** Configured both `HKCU:\Software\Microsoft\Office\16.0\WEF\Developer` and `HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs` pointing to the cloud manifest.

---

### 11. Deep Research: Anti-AI-Slop Writing Forensics & Readability Integration
* **Anti-Slop Linguistic Reality:** LLM text inherently suffers from low sentence length variance (burstiness stddev < 2.5) and excessive Latinate nominalizations (-tion, -ment), resulting in dense Flesch Reading Ease scores (< 30) that trigger AI detection heuristics.
* **Empirical Validation:**
  - Tested `verify_readability_metrics.js`: verified client-side Flesch-Kincaid Grade Level, Flesch Reading Ease, burstiness calculation, and slop word detection ("delve", "tapestry", "beacon", "testament", "pivotal", "holistic", "game-changer", "streamline", "seamless", "not merely").
  - Tested `verify_diff.js`: verified client-side word-level LCS diff algorithm producing clean `<ins>` and `<del>` markup for QuillBot-style changes preview without external dependencies.
* **Skill Integration:**
  - `plain-english-simplifier`: Flesch Grade 6–8, active voice, de-nominalization, citation protection (`(Smith et al., 2021)`, `[1]`).
  - `momo-shield-academic-guardian`: Zero-slop policy, banned word list, IEEE citation preservation.
  - `ux-microcopy-craft`: Action-first verbs, 50% rule, blameless errors.
  - `modern-human-ui`: Clean Word-native typography (Aptos / Segoe UI), 1px hairline borders, spring feedback.
* **Prompt Fidelity Invariant:** Anti-slop constraints and tone guidelines are supplied exclusively via Gemini's top-level `systemInstruction` REST parameter, keeping the user's prompt text 100% unaltered.
