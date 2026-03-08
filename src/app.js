(function () {
  const App = {
    speechService: null,
    transcriptProcessor: null,
    lectures: [],
    currentLecture: null,
    currentDocuments: [],
    autosaveIntervalId: null,
    durationIntervalId: null,
    wakeLock: null,
    isRecording: false,

    async init() {
      await window.AppStorage.init();
      const settings = await window.SettingsManager.load();
      window.UI.init();
      window.UI.setSettingsForm(settings);
      window.UI.setLanguage(settings.interfaceLanguage);
      this.speechService = new window.AzureSpeechService();
      this.transcriptProcessor = window.TranscriptProcessor.create({ segmentIntervalMinutes: settings.segmentIntervalMinutes });

      this.speechService.on({
        onRecognizing: (payload) => {
          window.UI.renderPartial(payload.text);
        },
        onRecognized: (payload) => {
          const update = this.transcriptProcessor.consumeFinalResult(payload);
          if (!update) {
            return;
          }
          this.ensureCurrentLecture();
          this.currentLecture.transcriptText = update.transcriptText;
          this.currentLecture.paragraphs = this.transcriptProcessor.getState().paragraphs;
          this.currentLecture.segments = this.transcriptProcessor.getState().segments;
          this.currentLecture.transcriptState = this.transcriptProcessor.getState();
          this.currentLecture.technicalTerms = update.technicalTerms;
          this.currentLecture.updatedAt = Date.now();
          this.renderCurrentLecture();
        },
        onStatus: (message) => {
          window.UI.setSpeechStatus(message);
        },
        onError: (error) => {
          console.error(error);
          window.UI.showToast(error.message, "error");
        },
      });

      window.UI.bindHandlers({
        onStart: () => this.handleStartRecording(),
        onStop: () => this.handleStopRecording(),
        onGenerateNotes: () => this.handleGenerateNotes(),
        onNewLecture: () => this.prepareNewLecture(),
        onDocumentUpload: (event) => this.handleDocumentUpload(event),
        onSaveSettings: (event) => this.handleSaveSettings(event),
        onResetSettings: () => this.handleResetSettings(),
        onLectureMetadataChange: () => this.handleLectureMetadataChange(),
      });

      await this.refreshLectures();
      await this.restoreDraftIfAvailable();

      if (!this.currentLecture) {
        this.prepareNewLecture();
      }

      window.addEventListener("beforeunload", () => {
        this.persistDraft(true).catch((error) => console.error("Draft save failed", error));
      });
    },

    createLectureTemplate() {
      const now = Date.now();
      return {
        id: `lecture-${now}`,
        title: "",
        date: null,
        updatedAt: now,
        durationMs: 0,
        transcriptText: "",
        notes: "",
        technicalTerms: [],
        courseName: "",
        topic: "",
        additionalContext: "",
        interfaceLanguage: window.SettingsManager.get().interfaceLanguage,
        paragraphs: [],
        segments: [],
        transcriptState: null,
        documents: [],
      };
    },

    prepareNewLecture() {
      if (this.isRecording) {
        window.UI.showToast(window.UI.t("stopCurrentRecordingFirst"), "error");
        return;
      }

      this.currentLecture = this.createLectureTemplate();
      this.currentDocuments = [];
      this.transcriptProcessor = window.TranscriptProcessor.create({ segmentIntervalMinutes: window.SettingsManager.get().segmentIntervalMinutes });
      window.UI.setLectureFormData(this.currentLecture);
      window.UI.setLanguage(this.currentLecture.interfaceLanguage || window.SettingsManager.get().interfaceLanguage);
      window.UI.renderDocuments([]);
      window.UI.renderTranscript(this.transcriptProcessor.getHighlightedTranscriptHtml());
      window.UI.renderTerms([]);
      window.UI.renderPartial("");
      window.UI.renderNotes("");
      window.UI.setSpeechStatus(window.UI.t("idle"));
      window.UI.setNotesStatus(window.UI.t("ready"));
      this.renderCurrentLecture();
    },

    ensureCurrentLecture() {
      if (!this.currentLecture) {
        this.currentLecture = this.createLectureTemplate();
      }
    },

    applyFormDataToLecture() {
      this.ensureCurrentLecture();
      const formData = window.UI.getLectureFormData();
      this.currentLecture.title = formData.title;
      this.currentLecture.courseName = formData.courseName;
      this.currentLecture.topic = formData.topic;
      this.currentLecture.additionalContext = formData.additionalContext;
      this.currentLecture.interfaceLanguage = formData.interfaceLanguage;
      this.currentLecture.documents = this.currentDocuments;
      this.currentLecture.updatedAt = Date.now();
    },

    renderCurrentLecture() {
      this.applyFormDataToLecture();
      window.UI.renderLectureSummary(this.currentLecture, this.isRecording);
      window.UI.renderTranscript(this.transcriptProcessor.getHighlightedTranscriptHtml());
      window.UI.renderTerms(this.currentLecture.technicalTerms || []);
      window.UI.renderDocuments(this.currentDocuments);
      window.UI.renderNotes(this.currentLecture.notes || "");
    },

    async refreshLectures(activeId) {
      this.lectures = await window.AppStorage.getLectures();
      window.UI.renderHistory(this.lectures, activeId || (this.currentLecture && this.currentLecture.id), async (lectureId) => {
        await this.loadLecture(lectureId);
      });
    },

    async loadLecture(lectureId) {
      if (this.isRecording) {
        window.UI.showToast(window.UI.t("stopRecordingBeforeSwitching"), "error");
        return;
      }

      const lecture = await window.AppStorage.getLecture(lectureId);
      if (!lecture) {
        return;
      }

      this.currentLecture = lecture;
      this.currentDocuments = Array.isArray(lecture.documents) ? lecture.documents : [];
      this.transcriptProcessor = window.TranscriptProcessor.create({ segmentIntervalMinutes: window.SettingsManager.get().segmentIntervalMinutes });
      this.transcriptProcessor.restore(
        lecture.transcriptState || {
          paragraphs: lecture.paragraphs || [],
          segments: lecture.segments || [],
          technicalTerms: lecture.technicalTerms || [],
        }
      );
      window.UI.setLectureFormData(lecture);
      window.UI.setLanguage(lecture.interfaceLanguage || window.SettingsManager.get().interfaceLanguage);
      window.UI.renderPartial("");
      this.renderCurrentLecture();
      await this.refreshLectures(lecture.id);
    },

    async restoreDraftIfAvailable() {
      const draft = await window.AppStorage.getDraft();
      if (!draft || !draft.lecture) {
        window.UI.setRecoveryMessage(window.UI.t("noPendingDraft"));
        return;
      }

      this.currentLecture = draft.lecture;
      this.currentDocuments = Array.isArray(draft.lecture.documents) ? draft.lecture.documents : [];
      this.transcriptProcessor = window.TranscriptProcessor.create({ segmentIntervalMinutes: window.SettingsManager.get().segmentIntervalMinutes });
      this.transcriptProcessor.restore(draft.transcriptState || {});
      window.UI.setLectureFormData(this.currentLecture);
      window.UI.setLanguage(this.currentLecture.interfaceLanguage || window.SettingsManager.get().interfaceLanguage);
      this.renderCurrentLecture();
      window.UI.setRecoveryMessage(window.UI.t("recoveredDraft", { time: new Date(draft.updatedAt || Date.now()).toLocaleString(window.UI.currentLanguage === "zh-TW" ? "zh-TW" : "en-US") }));
      await this.refreshLectures(this.currentLecture.id);
    },

    startAutosave() {
      this.stopAutosave();
      this.autosaveIntervalId = window.setInterval(() => {
        this.persistDraft(false).catch((error) => {
          console.error(error);
          window.UI.showToast("Autosave failed.", "error");
        });
      }, 10000);
    },

    stopAutosave() {
      if (this.autosaveIntervalId) {
        window.clearInterval(this.autosaveIntervalId);
        this.autosaveIntervalId = null;
      }
    },

    startDurationTicker() {
      this.stopDurationTicker();
      this.durationIntervalId = window.setInterval(() => {
        if (!this.isRecording || !this.currentLecture) {
          return;
        }
        this.currentLecture.durationMs = Date.now() - this.currentLecture.date;
        window.UI.renderLectureSummary(this.currentLecture, this.isRecording);
      }, 1000);
    },

    stopDurationTicker() {
      if (this.durationIntervalId) {
        window.clearInterval(this.durationIntervalId);
        this.durationIntervalId = null;
      }
    },

    async persistDraft(isSyncLike) {
      this.ensureCurrentLecture();
      this.applyFormDataToLecture();
      this.currentLecture.transcriptText = this.transcriptProcessor.getTranscriptText();
      this.currentLecture.paragraphs = this.transcriptProcessor.getState().paragraphs;
      this.currentLecture.segments = this.transcriptProcessor.getState().segments;
      this.currentLecture.transcriptState = this.transcriptProcessor.getState();
      this.currentLecture.documents = this.currentDocuments;
      this.currentLecture.technicalTerms = this.transcriptProcessor.getTechnicalTerms();
      this.currentLecture.updatedAt = Date.now();

      await window.AppStorage.saveDraft({
        lecture: this.currentLecture,
        transcriptState: this.transcriptProcessor.getState(),
        isRecording: this.isRecording,
        persistedAt: Date.now(),
      });

      if (!isSyncLike) {
        window.UI.setRecoveryMessage(window.UI.t("draftAutosavedAt", { time: new Date().toLocaleTimeString(window.UI.currentLanguage === "zh-TW" ? "zh-TW" : "en-US") }));
      }
    },

    async saveCurrentLecture(clearDraft) {
      this.ensureCurrentLecture();
      this.applyFormDataToLecture();
      this.currentLecture.transcriptText = this.transcriptProcessor.getTranscriptText();
      this.currentLecture.paragraphs = this.transcriptProcessor.getState().paragraphs;
      this.currentLecture.segments = this.transcriptProcessor.getState().segments;
      this.currentLecture.transcriptState = this.transcriptProcessor.getState();
      this.currentLecture.documents = this.currentDocuments;
      this.currentLecture.technicalTerms = this.transcriptProcessor.getTechnicalTerms();
      this.currentLecture.updatedAt = Date.now();

      await window.AppStorage.saveLecture(this.currentLecture);
      if (clearDraft) {
        await window.AppStorage.clearDraft();
        window.UI.setRecoveryMessage(window.UI.t("noPendingDraft"));
      }
      await this.refreshLectures(this.currentLecture.id);
    },

    async requestWakeLock() {
      if (!("wakeLock" in navigator) || this.wakeLock) {
        return;
      }

      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
      } catch (error) {
        console.warn("Wake lock unavailable", error);
      }
    },

    async releaseWakeLock() {
      if (!this.wakeLock) {
        return;
      }

      try {
        await this.wakeLock.release();
      } catch (error) {
        console.warn("Wake lock release failed", error);
      }
      this.wakeLock = null;
    },

    async handleStartRecording() {
      const settings = window.SettingsManager.get();
      if (!settings.azureKey || !settings.azureRegion) {
        window.UI.showToast(window.UI.t("configureAzureFirst"), "error");
        window.UI.openSettings();
        return;
      }

      this.ensureCurrentLecture();
      this.applyFormDataToLecture();
      if (!this.currentLecture.date) {
        this.currentLecture.date = Date.now();
      }
      if (!this.currentLecture.title) {
        this.currentLecture.title = `Lecture ${new Date(this.currentLecture.date).toLocaleString()}`;
      }

      try {
        await this.requestWakeLock();
        await this.speechService.start({
          azureKey: settings.azureKey,
          azureRegion: settings.azureRegion,
          recognitionLanguages: settings.recognitionLanguages,
        });

        this.isRecording = true;
        this.currentLecture.date = this.currentLecture.date || Date.now();
        this.startAutosave();
        this.startDurationTicker();
        window.UI.setSpeechStatus(window.UI.t("listening"));
        this.renderCurrentLecture();
        await this.persistDraft(false);
      } catch (error) {
        console.error(error);
        await this.releaseWakeLock();
        window.UI.showToast(error.message, "error");
        window.UI.setSpeechStatus(window.UI.t("error"));
      }
    },

    async handleStopRecording() {
      if (!this.isRecording) {
        return;
      }

      await this.speechService.stop();
      this.isRecording = false;
      this.transcriptProcessor.flushAll();
      this.currentLecture.durationMs = Date.now() - this.currentLecture.date;
      this.stopAutosave();
      this.stopDurationTicker();
      await this.releaseWakeLock();
      window.UI.setSpeechStatus(window.UI.t("stopped"));
      window.UI.renderPartial("");
      this.currentLecture.transcriptText = this.transcriptProcessor.getTranscriptText();
      this.currentLecture.technicalTerms = this.transcriptProcessor.getTechnicalTerms();
      this.currentLecture.transcriptState = this.transcriptProcessor.getState();
      this.renderCurrentLecture();
      await this.saveCurrentLecture(true);
      window.UI.showToast(window.UI.t("lectureSavedLocally"));
    },

    async handleGenerateNotes() {
      this.ensureCurrentLecture();
      this.applyFormDataToLecture();
      const settings = window.SettingsManager.get();

      if (!settings.geminiKey) {
        window.UI.showToast(window.UI.t("configureGeminiFirst"), "error");
        window.UI.openSettings();
        return;
      }

      if (!this.transcriptProcessor.getTranscriptText().trim()) {
        window.UI.showToast(window.UI.t("transcriptEmpty"), "error");
        return;
      }

      try {
        window.UI.setNotesStatus(window.UI.t("preparingReferenceContext"));
        const referenceContext = window.RagProcessor.buildContext({
          documents: this.currentDocuments,
          lectureTitle: this.currentLecture.title,
          courseName: this.currentLecture.courseName,
          topic: this.currentLecture.topic,
          additionalContext: this.currentLecture.additionalContext,
          transcript: this.transcriptProcessor.getTranscriptText(),
        });

        const notes = await window.GeminiService.generateNotes({
          geminiKey: settings.geminiKey,
          transcript: this.transcriptProcessor.getTranscriptText(),
          lectureTitle: this.currentLecture.title,
          courseName: this.currentLecture.courseName,
          topic: this.currentLecture.topic,
          additionalContext: this.currentLecture.additionalContext,
          technicalTerms: this.transcriptProcessor.getTechnicalTerms(),
          referenceContext,
          date: this.currentLecture.date,
          onProgress: (message) => window.UI.setNotesStatus(message),
        });

        this.currentLecture.notes = notes;
        this.currentLecture.updatedAt = Date.now();
        window.UI.renderNotes(notes);
        window.UI.setNotesStatus(window.UI.t("notesReady"));
        await this.saveCurrentLecture(false);
      } catch (error) {
        console.error(error);
        window.UI.setNotesStatus(window.UI.t("generationFailed"));
        window.UI.showToast(error.message, "error");
      }
    },

    async handleDocumentUpload(event) {
      const files = event.target.files;
      if (!files || !files.length) {
        return;
      }

      try {
        const parsed = await window.RagProcessor.parseFiles(files);
        this.currentDocuments = this.currentDocuments.concat(parsed);
        this.ensureCurrentLecture();
        this.currentLecture.documents = this.currentDocuments;
        window.UI.renderDocuments(this.currentDocuments);
        await this.persistDraft(false);
        window.UI.showToast(window.UI.t("addedReferenceDocuments", { count: parsed.length, suffix: parsed.length > 1 ? "s" : "" }));
      } catch (error) {
        console.error(error);
        window.UI.showToast(error.message, "error");
      } finally {
        event.target.value = "";
      }
    },

    async handleSaveSettings(event) {
      event.preventDefault();
      const settings = await window.SettingsManager.save(window.UI.getSettingsFormData());
      window.UI.setSettingsForm(settings);
      window.UI.setLanguage(settings.interfaceLanguage);
      if (this.currentLecture) {
        this.currentLecture.interfaceLanguage = settings.interfaceLanguage;
      }
      const transcriptState = this.transcriptProcessor.getState();
      this.transcriptProcessor = window.TranscriptProcessor.create({ segmentIntervalMinutes: settings.segmentIntervalMinutes });
      if (this.currentLecture) {
        this.transcriptProcessor.restore(transcriptState);
      }
      window.UI.closeSettings();
      this.renderCurrentLecture();
      window.UI.showToast(window.UI.t("settingsSavedLocally"));
    },

    async handleResetSettings() {
      const settings = await window.SettingsManager.reset();
      window.UI.setSettingsForm(settings);
      window.UI.setLanguage(settings.interfaceLanguage);
      this.renderCurrentLecture();
      window.UI.showToast(window.UI.t("settingsReset"));
    },

    async handleLectureMetadataChange() {
      this.applyFormDataToLecture();
      window.UI.setLanguage(this.currentLecture.interfaceLanguage || window.SettingsManager.get().interfaceLanguage);
      this.renderCurrentLecture();
      await this.persistDraft(false);
    },
  };

  window.addEventListener("DOMContentLoaded", () => {
    App.init().catch((error) => {
      console.error(error);
      alert(error.message);
    });
  });
})();