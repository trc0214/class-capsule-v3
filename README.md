# Lecture Assistant

Lecture Assistant is a browser-only lecture transcription and note generation tool for university students. It uses Azure Speech Service for continuous live transcription, Gemini for structured Markdown notes, IndexedDB for local-first persistence, and optional uploaded course materials to improve summaries.

## Project Tree

```text
lecture-assistant/
├── .env.example
├── .gitignore
├── index.html
├── assets/
│   └── styles/
│       └── style.css
├── config/
│   └── local-config.example.js
├── scripts/
│   └── generate-local-config.ps1
├── src/
│   ├── app.js
│   ├── core/
│   │   ├── settings.js
│   │   ├── storage.js
│   │   └── transcript.js
│   ├── services/
│   │   ├── gemini.js
│   │   ├── rag.js
│   │   └── speech.js
│   └── ui/
│       └── ui.js
└── README.md
```

## Architecture

### Runtime flow

Microphone input
-> Azure Speech continuous recognition
-> partial transcript display
-> finalized transcript events
-> transcript paragraph and segment buffer
-> IndexedDB draft autosave
-> lecture history database
-> Gemini hierarchical summarization
-> Markdown notes panel

### Modules

- `index.html`: static app shell, CDN dependencies, and layout.
- `assets/styles/style.css`: lightweight visual styling beyond Tailwind utilities.
- `src/core/storage.js`: IndexedDB wrapper for lectures, settings, and refresh recovery drafts.
- `src/core/settings.js`: local settings defaults, normalization, and persistence.
- `src/core/transcript.js`: paragraph segmentation, transcript buffering, topic-shift heuristics, technical term detection, and transcript highlighting.
- `src/services/speech.js`: Azure Speech continuous recognition client with reconnect logic and microphone permission handling.
- `src/services/rag.js`: reference document parsing for `.txt`, `.md`, and `.pdf` plus lightweight chunk ranking.
- `src/services/gemini.js`: Gemini API client and hierarchical note generation for long transcripts.
- `src/ui/ui.js`: DOM rendering and user interaction helpers.
- `src/app.js`: top-level orchestration, autosave, wake lock handling, lecture lifecycle, and module wiring.
- `config/local-config.example.js`: tracked template for local browser config values.
- `scripts/generate-local-config.ps1`: converts a local `.env` file into `config/local-config.js` for browser use.

## Features

- Real-time continuous lecture transcription in the browser
- Mixed-language speech recognition configuration for English and Traditional Chinese
- Partial and final transcript display
- Technical term detection and transcript highlighting
- Automatic transcript paragraphing on pauses, length limits, and topic-shift cues
- Immediate segment storage whenever a paragraph is finalized, with a fallback interval for unusually long uninterrupted speech
- Autosave every 10 seconds
- Refresh recovery for in-progress drafts
- Local lecture history stored in IndexedDB
- Upload lecture materials in `.txt`, `.md`, or `.pdf`
- Gemini-powered structured Markdown notes with hierarchical summarization for long transcripts
- Wake Lock support to reduce sleep interruptions during long lectures

## Setup

### 1. Azure Speech Service

Create an Azure Speech resource and collect:

- Speech API key
- Speech region

The browser app uses the Azure Speech browser SDK from:

`https://aka.ms/csspeech/jsbrowserpackageraw`

### 2. Gemini API

Create a Gemini API key with access to `gemini-1.5-pro`.

### 3. Open the app

Open `index.html` directly in a Chromium-based browser.

Recommended browsers:

- Microsoft Edge
- Google Chrome

These provide the most reliable support for:

- microphone permission prompts
- Wake Lock API
- IndexedDB
- Speech SDK compatibility

## How To Run Locally

No build step is required.

### Optional: keep keys in local files instead of retyping them

Because this app runs entirely in the browser, a true server-side `.env` secret model is not possible. The browser must still receive the keys in order to call Azure Speech and Gemini directly.

The supported local workflow is:

- Copy `.env.example` to `.env` and fill in your keys.
- Run `pwsh -ExecutionPolicy Bypass -File .\scripts\generate-local-config.ps1`.
- This creates `config/local-config.js`, which is ignored by git.
- Open `index.html` and the settings form will be prefilled from that local file.

1. Open `index.html` in the browser.
2. Open `Settings`.
3. Enter:
   - Azure Speech API key
   - Azure Speech region
   - Gemini API key
   - recognition languages such as `en-US, zh-TW`
4. Save settings.
5. Click `Start Recording`.
6. Click `Stop Recording` when the lecture ends.
7. Click `Generate Notes` to create Markdown lecture notes.

## How To Configure API Keys

Keys can be supplied in either of two ways:

1. Through the in-app `Settings` dialog, which saves them in the current browser.
2. Through a local `.env` file converted into `config/local-config.js`, which keeps them out of the committed source tree.

If `config/local-config.js` provides a field, it overrides the browser-stored value for that field.

Fields:

- `Azure Speech API Key`
- `Azure Region`
- `Gemini API Key`
- `Recognition Languages`
- `Segment Interval Fallback`
- `Interface Language`

## Transcript Reliability Design

- Continuous recognition with automatic reconnect attempts after Azure disconnects or session stops
- Autosave draft every 10 seconds into IndexedDB and `localStorage`
- Refresh recovery for the active lecture draft
- Wake Lock request during active recording when supported by the browser
- Transcript paragraph buffering with immediate segment flushes on natural speech breaks
- Time-based fallback segment flushing to cap buffer growth during long uninterrupted speech

## Note Generation Strategy

If the transcript is short enough, the app sends the transcript directly to Gemini.

If the transcript is long, the app uses hierarchical summarization:

1. Split the transcript into large chunks.
2. Summarize each chunk independently.
3. Combine the chunk summaries.
4. Generate a final Markdown note document.

Reference documents are chunked and ranked against lecture metadata and transcript content, then the highest-scoring excerpts are appended to the Gemini prompt.

## Storage Model

IndexedDB stores:

- app settings
- lecture metadata
- transcripts
- technical terms
- generated notes
- uploaded reference document text
- active recovery draft

Each lecture record contains:

- `title`
- `date`
- `durationMs`
- `transcriptText`
- `notes`
- `technicalTerms`
- `courseName`
- `topic`
- `additionalContext`
- `paragraphs`
- `segments`
- `documents`

## Troubleshooting

### Microphone permission denied

- Ensure the browser has permission to use the microphone.
- Retry after closing other apps that might exclusively lock the microphone.
- Use Chrome or Edge for best compatibility.

### Azure Speech does not start

- Verify the Azure key and region are correct.
- Confirm the Speech resource is enabled for browser use.
- Check the browser console for SDK or network errors.

### Transcript stops during a long lecture

- The app automatically attempts to reconnect.
- Keep the tab active when possible.
- Ensure the device remains online.
- If Wake Lock is unsupported, prevent the laptop from sleeping manually.

### PDF upload fails

- Ensure the PDF contains selectable text.
- Scanned PDFs without OCR may not produce usable extracted text.
- Reload the page if the PDF.js CDN fails to load.

### Gemini note generation fails

- Verify the Gemini API key is valid.
- Confirm the model `gemini-1.5-pro` is available for the key.
- Very large transcripts may take longer because the app performs multi-step summarization.

### Draft was recovered after refresh

- This is expected behavior.
- Recording does not resume automatically after refresh; start recording again manually.

## Notes

- Opening `index.html` directly is supported because the app uses classic script tags rather than ES module imports.
- `dotenv` itself cannot securely protect secrets inside a pure static browser app because the client must still receive those values. The local `.env` to `config/local-config.js` flow is for convenience and keeping secrets out of git, not for server-grade secret isolation.
- Browser file-origin restrictions vary. If your browser blocks microphone or external requests from `file://`, use a simple static file server as a fallback.

