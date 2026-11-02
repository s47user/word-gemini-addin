# Project Rules & Operating Standards

## 1. Up-to-Date APIs, Models & Information
* **Up-to-Date Exclusively:** Always use current and supported APIs, libraries, and model endpoints. Deprecated or legacy versions must not be used.
* **Current Gemini Generation Model:** Use `gemini-3.8-flash` (or `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3-flash-preview`). Do not default to legacy or restricted models (e.g. Gemini 2.5 series or 1.5).
* **Modern SDK:** Use the current `@google/genai` SDK and official current REST schemas.
* **Proactive Execution:** Proactively execute necessary skills, validations, and research without requiring the user to invoke or prompt for them.

## 2. Absolute Fidelity to User Words and Voice
* **No Word Editing or Unsolicited Rephrasing:** Never edit, summarize, or alter the user's words, prompts, instructions, or tone when sending to the model or processing requests.
* **Direct Transmission:** Pass the user's exact instructions and authentic voice directly.

## 3. Persistent Conversation Learnings & Knowledge Sync
* **Continuous Knowledge Logging:** In every project session, maintain and update a dedicated learnings document (`CONVERSATION_LEARNINGS.md`) capturing all architectural decisions, user directions, API conventions, and lessons learned.
* **Antigravity Memory Synchronization:** Ensure all findings, facts, constraints, and decisions are registered in the `antigravity-memory` MCP tool to keep the agent's knowledge database abreast with the latest state.

## 4. Benchmark & Learn from Proven Reference Implementations
* Review and borrow proven design patterns from vetted open-source implementations (e.g., [Kuingsmile/word-GPT-Plus](https://github.com/Kuingsmile/word-GPT-Plus), [OfficeDev/Office-Addin-TaskPane-React](https://github.com/OfficeDev/Office-Addin-TaskPane-React)).
