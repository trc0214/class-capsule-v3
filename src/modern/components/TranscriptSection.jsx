const languageOptions = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
];

export function TranscriptSection() {
  return (
    <section id="transcriptSection" className="flex min-h-[50vh] flex-col rounded-3xl border border-zinc-300/80 bg-white/90 shadow-panel backdrop-blur flex-1">
      <header className="flex flex-col gap-4 border-b border-zinc-200 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-steel">Live Transcript</p>
          <h2 id="lectureTitleDisplay" className="mt-2 text-2xl font-semibold text-ink">Untitled lecture</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-steel">
            <span id="lectureMetaDate">No session loaded</span>
            <span className="text-zinc-300">•</span>
            <span id="lectureMetaDuration">00:00:00</span>
            <span className="text-zinc-300">•</span>
            <span id="speechStatus">Idle</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button id="startButton" className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-400">
            Start Recording
          </button>
          <button id="stopButton" className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-800 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40" disabled>
            Stop Recording
          </button>
          <button id="generateNotesButton" className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-800 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40">
            Generate Notes
          </button>
          <button id="settingsButton" className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-800 hover:text-zinc-900">
            Settings
          </button>
        </div>
      </header>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Lecture Title</label>
            <input id="lectureTitleInput" type="text" placeholder="Distributed Systems - Week 5" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Course Name</span>
              <input id="courseNameInput" type="text" placeholder="CS 540" className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
            </label>
            <label className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Lecture Topic</span>
              <input id="lectureTopicInput" type="text" placeholder="Consensus and Paxos" className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
            </label>
            <label className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Interface Language</span>
              <select id="interfaceLanguageSelect" className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500">
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Additional Context</span>
            <textarea id="additionalContextInput" rows="4" placeholder="Instructor focus, assignment context, exam hints, or anything Gemini should know." className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500"></textarea>
          </label>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p id="mediaUploadTitle" className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Uploaded Media</p>
                <p id="mediaUploadHelp" className="mt-2 text-sm leading-6 text-zinc-600">Upload an audio or video file to transcribe without using the microphone.</p>
              </div>
              <label id="mediaUploadLabel" className="cursor-pointer rounded-full border border-zinc-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-zinc-800">
                <span id="mediaUploadButtonText">Upload</span>
                <input id="mediaInput" type="file" accept="audio/*,video/*" className="hidden" />
              </label>
            </div>
            <p id="mediaUploadStatus" className="mt-4 text-sm leading-6 text-zinc-600">No media file selected.</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Reference Documents</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Upload .txt, .md, or .pdf lecture materials before generating notes.</p>
              </div>
              <label id="documentUploadLabel" className="cursor-pointer rounded-full border border-zinc-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-zinc-800">
                <span id="documentUploadButtonText">Upload</span>
                <input id="documentInput" type="file" accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf" className="hidden" multiple />
              </label>
            </div>
            <div id="documentList" className="mt-4 space-y-2"></div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Detected Technical Terms</p>
            <div id="termList" className="mt-3 flex flex-wrap gap-2"></div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Partial Recognition</p>
            <p id="partialTranscript" className="mt-3 min-h-20 text-sm leading-6 text-zinc-600">Waiting for speech input.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 p-5 pt-4">
        <div id="transcriptContainer" className="custom-scrollbar h-[42vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-800 lg:h-[52vh]"></div>
      </div>
    </section>
  );
}
