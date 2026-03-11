import DOMPurify from "dompurify";
import { marked } from "marked";

const defaultNotes = `# Lecture Title\n\nDate\n\n## Lecture Summary\n\nGenerated notes will appear here.`;
const defaultNotesMarkup = DOMPurify.sanitize(marked.parse(defaultNotes, {
  breaks: true,
  gfm: true,
}), {
  USE_PROFILES: { html: true },
});

export function NotesSection() {
  return (
    <section id="notesSection" className="flex min-h-[50vh] flex-col rounded-3xl border border-zinc-300/80 bg-white/90 shadow-panel backdrop-blur flex-1">
      <header className="border-b border-zinc-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-steel">AI Notes</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">Markdown lecture notes</h2>
        <p id="notesStatus" className="mt-3 text-sm text-steel">Ready.</p>
      </header>
      <div className="grid gap-4 p-5">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="interventionPanelLabel" className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Live Intervention Assistant</p>
              <p id="interventionStatus" className="mt-2 text-sm leading-6 text-zinc-600">Monitoring is idle.</p>
            </div>
            <span id="interventionScenarioBadge" className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700">Classroom</span>
          </div>
          <form id="manualQuestionForm" className="mt-4 space-y-3">
            <label className="block">
              <span id="manualQuestionLabel" className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Manual Question</span>
              <textarea id="manualQuestionInput" rows="3" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-zinc-500" placeholder="Ask the assistant to explain, clarify, or suggest a follow-up."></textarea>
            </label>
            <div className="flex items-center justify-between gap-3">
              <p id="manualQuestionHint" className="text-xs leading-5 text-zinc-500">This sends an immediate request using the current scenario and transcript context.</p>
              <button id="manualQuestionButton" type="submit" className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-800 transition hover:border-zinc-800 hover:text-zinc-900">Ask Now</button>
            </div>
          </form>
          <div id="interventionList" className="mt-4 space-y-3"></div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Preview</p>
          <div id="notesContainer" className="prose-markdown custom-scrollbar mt-4 h-[68vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-800" dangerouslySetInnerHTML={{ __html: defaultNotesMarkup }}></div>
        </div>
      </div>
    </section>
  );
}
