# Gemini AI Microsoft Word Assistant (Office Web Add-in)

An interactive, production-ready Microsoft Word sidebar add-in that integrates Google Gemini directly into Word.

---

## 🌟 Key Features

* **Up-to-Date Intelligence:** Powered by **`gemini-3.8-flash`** (with support for `gemini-3.6-flash` and `gemini-3.5-flash-lite`).
* **Exact User Voice & Prompt Fidelity:** Sends your selected text and custom instructions directly and verbatim to Gemini without unauthorized paraphrasing or tone modification.
* **Selection Quick Actions:**
  * 📝 **Summarize:** Extracts key points from the selected text.
  * ✨ **Polish Flow:** Corrects grammar, flow, and conciseness while preserving author meaning.
  * 👔 **Professional Tone:** Transforms drafts into clear executive language.
  * ✂️ **Make Concise:** Cuts filler without losing critical information.
  * 🔍 **Expand Idea:** Deepens sections with structured elaboration.
* **Custom Chat & Prompting:** Ask Gemini anything or instruct it to draft entire sections from scratch.
* **Safe Output Preview:** See Gemini's response inside the sidebar first. Insert into document with one click:
  * **Insert at Cursor:** Places content directly where your cursor is resting.
  * **Replace Selection:** Swaps out the highlighted text.
  * **Copy:** Copies cleanly to clipboard.
* **Zero Backend Required:** Your API key is stored safely in your browser's local storage—no external databases, third-party middleware, or recurring hosting costs.

---

## 🚀 Quick Start (Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suite
```bash
npm test
```

### 3. Start Local Development Server
```bash
npm run dev
```
This runs Vite with a local HTTPS certificate at `https://localhost:3000`.

---

## 💻 How to Sideload in Microsoft Word

### Option A: Word for the Web (Fastest, zero Windows configuration)
1. Open any document in **Word for the Web** ([office.com](https://www.office.com)).
2. In the top ribbon, click **Insert** > **Add-ins** (or click the three dots `...` > **Add-ins**).
3. Click **Manage My Add-ins** > **Upload My Add-in**.
4. Browse and select `manifest.xml` located in this project directory.
5. The **Gemini Assistant** button will appear in your ribbon!

### Option B: Word Desktop (Windows)
1. Run the included sideload helper script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\sideload.ps1
   ```
2. Follow the prompt to share the `OfficeAddins` folder as a trusted network catalog:
   * Go to **File** > **Options** > **Trust Center** > **Trust Center Settings...**
   * Select **Trusted Add-in Catalogs**.
   * Enter your network share path (e.g., `\\YOUR-PC\OfficeAddins`), click **Add catalog**, check **Show in Menu**, and click **OK**.
   * Restart Microsoft Word.
3. Open Word > **Insert** tab > **Add-ins** > **Shared Folder** > click **Gemini AI Word Assistant**.

---

## ⚙️ Configuration
1. Click the **⚙️ Settings** icon in the top right of the Gemini sidebar inside Word.
2. Enter your Google Gemini API Key (obtained from [Google AI Studio](https://aistudio.google.com/)).
3. Select your preferred model (default: **Gemini 3.8 Flash**).
4. Click **Save Settings**.

---

## 📚 References & Inspiration
* [Kuingsmile/word-GPT-Plus](https://github.com/Kuingsmile/word-GPT-Plus)
* [OfficeDev/Office-Addin-TaskPane-React](https://github.com/OfficeDev/Office-Addin-TaskPane-React)
* [OfficeDev/Office-Add-in-samples](https://github.com/OfficeDev/Office-Add-in-samples)
