(function () {
  const DEFAULT_SETTINGS = {
    azureKey: "",
    azureRegion: "",
    geminiKey: "",
    interfaceLanguage: "en",
    preferredProcessingLanguage: "",
    recognitionLanguages: ["en-US", "zh-TW"],
    segmentIntervalMinutes: 3,
    interventionEnabled: true,
    assistantScenario: "classroom",
    interventionPauseMs: 1500,
  };

  const LOCAL_OVERRIDE_FIELDS = [
    "azureKey",
    "azureRegion",
    "geminiKey",
    "interfaceLanguage",
    "preferredProcessingLanguage",
    "recognitionLanguages",
    "segmentIntervalMinutes",
    "interventionEnabled",
    "assistantScenario",
    "interventionPauseMs",
  ];

  function getLocalConfig() {
    return window.LECTURE_ASSISTANT_LOCAL_CONFIG || {};
  }

  function hasMeaningfulValue(value) {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return value !== undefined && value !== null;
  }

  function applyLocalOverrides(settings) {
    const merged = { ...(settings || {}) };
    const localConfig = getLocalConfig();

    LOCAL_OVERRIDE_FIELDS.forEach((field) => {
      if (hasMeaningfulValue(localConfig[field])) {
        merged[field] = Array.isArray(localConfig[field]) ? [...localConfig[field]] : localConfig[field];
      }
    });

    return merged;
  }

  function stripLocalOverridesForStorage(settings) {
    const localConfig = getLocalConfig();
    const sanitized = { ...(settings || {}) };

    LOCAL_OVERRIDE_FIELDS.forEach((field) => {
      if (hasMeaningfulValue(localConfig[field])) {
        delete sanitized[field];
      }
    });

    return sanitized;
  }

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

      normalized.preferredProcessingLanguage = typeof normalized.preferredProcessingLanguage === "string"
        ? normalized.preferredProcessingLanguage.trim()
        : "";

      normalized.interventionEnabled = normalized.interventionEnabled !== false;
      normalized.assistantScenario = normalized.assistantScenario === "interview" ? "interview" : "classroom";
      normalized.interventionPauseMs = Math.min(5000, Math.max(1000, Number(normalized.interventionPauseMs) || DEFAULT_SETTINGS.interventionPauseMs));

      normalized.segmentIntervalMinutes = Math.min(15, Math.max(1, Number(normalized.segmentIntervalMinutes) || DEFAULT_SETTINGS.segmentIntervalMinutes));
      return normalized;
    },

    async load() {
      const stored = await window.AppStorage.getSettings();
      this.current = this.normalize(applyLocalOverrides(stored));
      return this.current;
    },

    async save(partialSettings) {
      this.current = this.normalize(applyLocalOverrides({ ...this.current, ...partialSettings }));
      await window.AppStorage.saveSettings(stripLocalOverridesForStorage(this.current));
      return this.current;
    },

    async reset() {
      this.current = this.normalize(applyLocalOverrides(DEFAULT_SETTINGS));
      await window.AppStorage.saveSettings(stripLocalOverridesForStorage(DEFAULT_SETTINGS));
      return this.current;
    },

    get() {
      return { ...this.current, recognitionLanguages: [...this.current.recognitionLanguages] };
    },
  };

  window.SettingsManager = SettingsManager;
})();