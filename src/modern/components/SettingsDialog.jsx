const languageOptions = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
];

export function SettingsDialog() {
  return (
    <dialog id="settingsDialog" className="w-[min(92vw,720px)] rounded-3xl border border-zinc-300 bg-white p-0 shadow-2xl backdrop:bg-black/40">
      <form id="settingsForm" method="dialog" className="rounded-3xl">
        <div className="border-b border-zinc-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-steel">Settings</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">API configuration</h2>
            </div>
            <button id="closeSettingsButton" value="cancel" className="rounded-full border border-zinc-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-900">Close</button>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Azure Speech API Key</span>
            <input id="azureKeyInput" type="password" autoComplete="off" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" placeholder="Paste Azure Speech key" />
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Azure Region</span>
            <input id="azureRegionInput" type="text" autoComplete="off" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" placeholder="eastus" />
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Gemini API Key</span>
            <input id="geminiKeyInput" type="password" autoComplete="off" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" placeholder="Paste Gemini key" />
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Primary Lecture Language</span>
            <input id="preferredProcessingLanguageInput" type="text" autoComplete="off" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" placeholder="Leave blank to auto detect, e.g. en-US or zh-TW" />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
            <div>
              <span id="interventionEnabledLabel" className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Live Intervention Assistant</span>
              <span id="interventionEnabledHelp" className="mt-2 block text-sm leading-6 text-zinc-600">Use VAD, audio quality, and scenario rules to decide whether AI should interject during recording.</span>
            </div>
            <input id="interventionEnabledInput" type="checkbox" className="h-5 w-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500" />
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <span id="assistantScenarioLabel" className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Intervention Scenario</span>
            <select id="assistantScenarioInput" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500">
              <option value="classroom">Classroom</option>
              <option value="interview">Interview</option>
            </select>
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <span id="interventionPauseLabel" className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Intervention Pause Threshold (ms)</span>
            <input id="interventionPauseInput" type="number" min="1000" max="5000" step="100" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" />
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <span id="interventionSensitivityLabel" className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Local Tone Trigger Sensitivity</span>
            <input id="interventionSensitivityInput" type="number" min="1" max="10" step="1" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" />
            <span id="interventionSensitivityHelp" className="mt-2 block text-sm leading-6 text-zinc-600">Higher values make the local tone model trigger more aggressively.</span>
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Recognition Languages (Auto Detect)</span>
            <input id="recognitionLanguagesInput" type="text" autoComplete="off" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" placeholder="en-US, zh-TW" />
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Segment Interval Fallback (minutes)</span>
            <input id="segmentIntervalInput" type="number" min="1" max="15" step="1" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500" />
          </label>

          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-steel">Interface Language</span>
            <select id="settingsLanguageInput" className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500">
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 p-6">
          <p className="text-sm text-steel">Keys can come from browser storage or config/local-config.js.</p>
          <div className="flex gap-2">
            <button type="button" id="resetSettingsButton" className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-900">Reset</button>
            <button type="submit" id="saveSettingsButton" value="default" className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black">Save Settings</button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
