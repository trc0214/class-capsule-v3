# Lecture Assistant

Lecture Assistant is a Vite-powered React application that currently hosts the existing lecture transcription and note generation experience inside a legacy shell. It uses Azure Speech Service for continuous live transcription, Gemini for structured Markdown notes, IndexedDB for local-first persistence, and optional uploaded course materials to improve summaries.

The workspace now pins Live Server to a stable origin at `http://127.0.0.1:5500` through `.vscode/settings.json` so browser storage does not appear to reset just because the dev server picked a different port.

The live intervention flow now uses a browser-local prosody model for triggering. It listens to tone, energy, pitch variation, and pause behavior instead of keyword rules, and can optionally use Gemini only to phrase a richer intervention message.

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
│   │   ├── prosody.js
│   │   ├── gemini.js
│   │   ├── rag.js
│   │   └── speech.js
│   ├── app/
│   │   ├── app-controller.js
│   │   └── lecture-manager.js
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
-> optional uploaded audio or video transcription stream
-> IndexedDB draft autosave
-> lecture history database
-> Gemini hierarchical summarization
-> Markdown notes panel

### Modules

- `index.html`: static app shell, CDN dependencies, and layout.
- `assets/styles/style.css`: lightweight visual styling beyond Tailwind utilities.
- `src/core/storage.js`: pluggable persistence facade with a default browser IndexedDB provider and a future-ready remote API provider.
- `src/core/settings.js`: local settings defaults, normalization, and persistence.
- `src/core/transcript.js`: paragraph segmentation, transcript buffering, topic-shift heuristics, technical term detection, and transcript highlighting.
- `src/services/speech.js`: Azure Speech continuous recognition client with reconnect logic, microphone permission handling, and local prosody feature capture.
- `src/services/prosody.js`: browser-local tone/prosody scoring used to trigger live interventions without keyword matching.
- `src/services/rag.js`: reference document parsing for `.txt`, `.md`, and `.pdf` plus lightweight chunk ranking.
- `src/services/gemini.js`: Gemini API client and hierarchical note generation for long transcripts.
- `src/services/intervention.js`: intervention orchestration that combines local tone triggers with Gemini phrasing fallback.
- `src/app/app-controller.js`: application orchestration and live intervention scheduling.
- `src/app/lecture-manager.js`: lecture state creation and transcript restoration helpers.
- `src/ui/ui.js`: DOM rendering and user interaction helpers.
- `src/app.js`: bootstrap entry point.
- `config/local-config.example.js`: tracked template for local browser config values.
- `scripts/generate-local-config.ps1`: converts a local `.env` file into `config/local-config.js` for browser use.

## Features

- Real-time continuous lecture transcription in the browser
- Upload audio or video files and transcribe them in-browser without using the microphone
- Optional primary lecture language setting that forces speech and note generation to use one language, with auto-detect as the fallback
- Mixed-language speech recognition configuration for English and Traditional Chinese
- Microphone preprocessing with browser echo cancellation, noise suppression, auto gain control, frequency filtering, compression, and silence gating before Azure Speech recognition
- Browser-local tone triggering for live intervention using prosody features instead of keyword rules
- Adjustable local tone-trigger sensitivity, with local fallback intervention messages when Gemini is unavailable
- Partial and final transcript display
- Technical term detection and transcript highlighting
- Automatic transcript paragraphing on pauses, length limits, and topic-shift cues
- Immediate segment storage whenever a paragraph is finalized, with a fallback interval for unusually long uninterrupted speech
- Autosave every 10 seconds
- Refresh recovery for in-progress drafts
- Local lecture history stored in IndexedDB
- Stable Live Server origin to preserve browser storage across restarts
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

Run the app with `npm run dev` and open the Vite dev server in a Chromium-based browser.

Recommended browsers:

- Microsoft Edge
- Google Chrome

These provide the most reliable support for:

- microphone permission prompts
- Wake Lock API
- IndexedDB
- Speech SDK compatibility

## How To Run Locally

Install dependencies first:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

If you use Live Server in VS Code, this workspace is configured to use `127.0.0.1:5500` so the browser keeps the same storage origin between runs.

### Optional: keep keys in local files instead of retyping them

Because this app runs entirely in the browser, a true server-side `.env` secret model is not possible. The browser must still receive the keys in order to call Azure Speech and Gemini directly.

The supported local workflow is:

- Copy `.env.example` to `.env` and fill in your keys.
- Run `pwsh -ExecutionPolicy Bypass -File .\scripts\generate-local-config.ps1`.
- This creates `config/local-config.js`, which is ignored by git.
- Start the app and the settings form will be prefilled from that local file.

1. Run `npm run dev`.
2. Open `Settings`.
3. Enter:
   - Azure Speech API key
   - Azure Speech region
   - Gemini API key (optional for richer intervention wording; local tone triggering still works without it)
   - optional primary lecture language such as `en-US` or `zh-TW` (leave blank for auto-detect)
   - recognition languages such as `en-US, zh-TW`
   - local tone trigger sensitivity from `1` to `10`
4. Save settings.
5. Click `Start Recording`.
6. Click `Stop Recording` when the lecture ends.
7. Click `Generate Notes` to create Markdown lecture notes.

### Optional: transcribe a recorded lecture later

If your laptop battery dies during class, you can still recover by uploading a saved recording afterward.

1. Run `npm run dev` in Chrome or Edge.
2. Enter Azure Speech settings.
3. Use the `Uploaded Media` card to choose an audio or video file.
4. Wait for browser-side playback transcription to finish.
5. Review the generated transcript and then click `Generate Notes`.

## How To Configure API Keys

Keys can be supplied in either of two ways:

1. Through the in-app `Settings` dialog, which saves them in the current browser.
2. Through a local `.env` file converted into `config/local-config.js`, which keeps them out of the committed source tree.

If `config/local-config.js` provides a field, it overrides the browser-stored value for that field.

For staged GitHub pushes during the migration, see `docs/github-sync-plan.md`.

Fields:

- `Storage Mode` (`browser` or `remote`)
- `Storage API Base URL` (used only when `storageMode` is `remote`)
- `Azure Speech API Key`
- `Azure Region`
- `Gemini API Key`
- `Primary Lecture Language`
- `Local Tone Trigger Sensitivity`
- `Recognition Languages`
- `Segment Interval Fallback`
- `Interface Language`

## Live Intervention Triggering

The app no longer relies on keyword matching to decide when live intervention should fire.

Instead, microphone audio is analyzed in the browser to extract a small prosody summary for each utterance, including:

- pitch mean and pitch variation
- energy mean and energy variation
- voiced-frame ratio
- zero-crossing rate
- utterance duration and speech rate

These signals are scored by `src/services/prosody.js` to estimate whether the latest utterance sounds uncertain, urgent, or strained. If the score crosses the configured sensitivity threshold, the intervention pipeline triggers after a VAD-confirmed pause.

If a Gemini API key is present, Gemini receives the local trigger decision plus the prosody summary and returns a concise intervention. If Gemini is unavailable, the app still emits a local fallback intervention message.

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

### Uploaded media transcription does not start

- Use Chrome or Edge so the browser can decode and stream the file reliably.
- Prefer common formats such as `.mp3`, `.wav`, `.m4a`, `.mp4`, or `.webm`.
- Some video containers may load but expose no readable audio track to the browser.
- Keep the tab open until the uploaded file finishes transcribing.

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

