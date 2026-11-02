# Design: Gemini AI Integration for Microsoft Word (Office Web Add-in)

## 1. Intent and Why
Provide an interactive, seamless AI writing assistant inside Microsoft Word that can read document selections, generate or refine text using Google Gemini, and insert or replace content directly into the document without context switching.

## 2. Core Rules & Constraints
* **Up-to-Date API & Model:** Default to **`gemini-3.8-flash`** using the modern `@google/genai` SDK / current REST endpoints. Never default to legacy or access-restricted models (such as Gemini 2.5 or 1.5).
* **Exact User Prompt Fidelity:** Never edit, rephrase, or summarize user prompts, instructions, or voice. Transmit user input directly to the model exactly as provided.
* **Persistent Knowledge Logging:** Maintain `CONVERSATION_LEARNINGS.md` and keep `antigravity-memory` updated with all facts, constraints, and conventions.

## 3. Goals, Non-Goals, Anti-Goals
* **Goals:**
  * Embedded taskpane (sidebar) in Microsoft Word.
  * Selection quick actions:
    * Summarize selection
    * Proofread / Fix grammar & style
    * Tone adjustment (Professional, Concise, Casual)
    * Expand / Continue writing
  * Freeform chat / prompt box to ask Gemini questions or request custom text generation.
  * Preview generated outputs in the sidebar with single-click options: "Insert at Cursor", "Replace Selection", or "Copy to Clipboard".
  * Store the user's Gemini API Key securely in local storage so no external cloud server is required.
  * Provide a valid Office Add-in manifest (`manifest.xml`) and clear sideloading instructions for Word Desktop and Word for the Web.
* **Non-Goals:**
  * Complex multi-tenant cloud backend or billing systems.
  * VBA macro automation (deprecated in favor of the web add-in).
* **Anti-Goals:**
  * Silently overwriting document content without user confirmation or preview.
  * Altering or flattening the user's voice or words.
  * Hardcoding API keys into source code or distribution files.

## 4. Benchmark Reference Implementations
* **[Kuingsmile/word-GPT-Plus](https://github.com/Kuingsmile/word-GPT-Plus):** Production-tested Word taskpane add-in with multi-provider LLM support (including Google Gemini), dual chat/agent modes, and one-click Word insertion/replacement.
* **[OfficeDev/Office-Addin-TaskPane-React](https://github.com/OfficeDev/Office-Addin-TaskPane-React):** Microsoft's official Word React + TypeScript taskpane architecture with `Office.onReady` and `Word.run`.

## 5. Architecture & Technical Specification
* **Frontend Runtime:** Vite + React / TypeScript with Fluent UI or modern clean CSS styling.
* **Office Integration:** `@microsoft/office-js` (`Office.onReady`, `Word.run`).
  * Selection read: `context.document.getSelection().text`.
  * Text insert/replace: `selection.insertText(text, Word.InsertLocation.replace)` or `context.document.body.insertText(text, Word.InsertLocation.end)`.
* **Gemini API Integration:**
  * Current endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={API_KEY}`.
  * Model selector: Defaults to `gemini-3.8-flash` with support for `gemini-3.6-flash` and `gemini-3.5-flash-lite`.
  * Settings view in taskpane to input/save/change API key.
  * Key stored securely in browser `localStorage`.
* **Manifest:**
  * `manifest.xml` configured for Word (`TaskpaneApp`, `Document` host, ribbon button).
