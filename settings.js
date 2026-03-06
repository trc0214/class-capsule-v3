(function () {
  const DEFAULT_SETTINGS = {
    azureKey: "",
    azureRegion: "",
    geminiKey: "",
    interfaceLanguage: "en",
    recognitionLanguages: ["en-US", "zh-TW"],
    segmentIntervalMinutes: 3,
  };

  const SettingsManager = {
    current: { ...DEFAULT_SETTINGS },

    normalize(rawSettings) {
      const normalized = { ...DEFAULT_SETTINGS, ...(rawSettings || {}) };

      if (typeof normalized.recognitionLanguages === "string") {
        normalized.recognitionLanguages = normalized.recognitionLanguages
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      }

      if (!Array.isArray(normalized.recognitionLanguages) || !normalized.recognitionLanguages.length) {
        normalized.recognitionLanguages = [...DEFAULT_SETTINGS.recognitionLanguages];
      }

      normalized.segmentIntervalMinutes = Math.min(15, Math.max(1, Number(normalized.segmentIntervalMinutes) || DEFAULT_SETTINGS.segmentIntervalMinutes));
      return normalized;
    },

    async load() {
      const stored = await window.AppStorage.getSettings();
      this.current = this.normalize(stored);
      return this.current;
    },

    async save(partialSettings) {
      this.current = this.normalize({ ...this.current, ...partialSettings });
      await window.AppStorage.saveSettings(this.current);
      return this.current;
    },

    async reset() {
      this.current = { ...DEFAULT_SETTINGS };
      await window.AppStorage.saveSettings(this.current);
      return this.current;
    },

    get() {
      return { ...this.current, recognitionLanguages: [...this.current.recognitionLanguages] };
    },
  };

  window.SettingsManager = SettingsManager;
})();