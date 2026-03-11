export function Sidebar() {
  return (
    <aside id="sidebar" className="flex w-full max-w-sm flex-col rounded-3xl border border-zinc-300/80 bg-white/85 p-4 shadow-panel backdrop-blur lg:w-80 transition-all duration-300">
      <div className="sidebar-shell flex h-full min-h-0 flex-col">
        <div className="sidebar-top mb-4 border-b border-zinc-200 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div id="sidebarHeader" className="min-w-0 sidebar-full-block">
              <p className="sidebar-title text-xs font-semibold uppercase tracking-[0.3em] text-steel">Lecture Assistant</p>
              <h1 className="sidebar-title mt-2 text-2xl font-semibold text-ink">Sessions</h1>
            </div>
            <button id="expandSidebarButton" className="sidebar-icon-btn sidebar-toggle-btn" title="Expand/collapse menu" aria-label="Collapse sidebar" aria-pressed="false">
              <span id="expandIcon">⮜</span>
            </button>
          </div>
          <div className="sidebar-full-block mt-4 flex gap-2">
            <button id="newLectureButton" className="flex-1 rounded-full border border-zinc-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-900">
              New
            </button>
          </div>
        </div>

        <div id="sidebarRecovery" className="sidebar-full-block mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-steel">
          <p className="font-semibold uppercase tracking-[0.18em] text-zinc-700">Recovery</p>
          <p id="recoveryMessage" className="mt-2 leading-5">No pending draft.</p>
          <p id="backupHelp" className="mt-3 leading-5 text-zinc-500">Export a backup before changing localhost or browser storage.</p>
          <div className="mt-3 flex gap-2">
            <button id="exportDataButton" className="flex-1 rounded-full border border-zinc-300 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-900">
              Export Data
            </button>
            <button id="importDataButton" className="flex-1 rounded-full border border-zinc-300 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-900">
              Import Data
            </button>
            <input id="importDataInput" type="file" accept="application/json,.json" className="hidden" />
          </div>
        </div>

        <div className="sidebar-full-block mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Recent Sessions</p>
          <button id="sidebarSettingsButton" className="rounded-full border border-zinc-300 px-2.5 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-900" title="Settings" aria-label="Open settings">
            ⚙
          </button>
        </div>

        <div id="historyList" className="sidebar-full-block custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1"></div>

        <div id="sidebarCompactPanel" className="sidebar-compact-panel" aria-hidden="true">
          <div className="sidebar-compact-actions">
            <button id="collapsedExpand" className="sidebar-icon-btn sidebar-toggle-btn" title="Expand sidebar" aria-label="Expand sidebar" aria-pressed="true">
              <span aria-hidden="true">⮞</span>
            </button>
            <button id="collapsedNewLecture" className="sidebar-icon-btn" title="New Lecture" aria-label="New lecture">
              <span aria-hidden="true">＋</span>
            </button>
            <button id="collapsedSettings" className="sidebar-icon-btn" title="Settings" aria-label="Open settings">
              <span aria-hidden="true">⚙</span>
            </button>
          </div>
          <div id="compactHistoryList" className="custom-scrollbar sidebar-compact-history"></div>
        </div>
      </div>
    </aside>
  );
}
