(function () {
  function createController() {
    return {
      speechService: null,
      transcriptProcessor: null,
      lectures: [],
      currentLecture: null,
      currentDocuments: [],
      autosaveIntervalId: null,
      durationIntervalId: null,
      wakeLock: null,
      isRecording: false,
      activeCaptureMode: null,
      activeMediaInfo: null,

      async init() {
        await window.AppStorage.init();

        const settings = await window.SettingsManager.load();
        window.UI.init();
        window.UI.setSettingsForm(settings);
        window.UI.setLanguage(settings.interfaceLanguage);

        this.speechService = new window.AzureSpeechService();
        this.transcriptProcessor = window.LectureManager.createTranscriptProcessor(null, settings.segmentIntervalMinutes);

        this.speechService.on(this.buildSpeechCallbacks());
        window.UI.bindHandlers(this.buildUiHandlers());

        await this.refreshLectures();
        await this.restoreDraftIfAvailable();

        if (!this.currentLecture) {
          this.prepareNewLecture();
        }

        window.addEventListener("beforeunload", () => {
          this.persistDraft(true).catch((error) => console.error("Draft save failed", error));
        });
      },

      buildSpeechCallbacks() {
        return {
          onRecognizing: (payload) => {
            window.UI.renderPartial(payload.text);
          },
          onRecognized: (payload) => {
            const update = this.transcriptProcessor.consumeFinalResult(payload);
            if (!update) {
              return;
            }

            this.ensureCurrentLecture();
            window.LectureManager.syncTranscriptState(this.currentLecture, this.transcriptProcessor, this.currentDocuments);
            this.currentLecture.technicalTerms = update.technicalTerms;
            this.renderCurrentLecture();
          },
          onStatus: (message) => {
            window.UI.setSpeechStatus(message);
          },
          onError: (error) => {
            console.error(error);
            window.UI.showToast(error.message, "error");
          },
          onMediaCompleted: (payload) => {
            this.handleMediaTranscriptionCompleted(payload).catch((error) => {
              console.error(error);
              window.UI.showToast(error.message, "error");
            });
          },
        };
      },

      buildUiHandlers() {
        return {
          onStart: () => this.handleStartRecording(),
          onStop: () => this.handleStopRecording(),
          onGenerateNotes: () => this.handleGenerateNotes(),
          onNewLecture: () => this.prepareNewLecture(),
          onMediaUpload: (event) => this.handleMediaUpload(event),
          onDocumentUpload: (event) => this.handleDocumentUpload(event),
          onSaveSettings: (event) => this.handleSaveSettings(event),
          onResetSettings: () => this.handleResetSettings(),
          onLectureMetadataChange: () => this.handleLectureMetadataChange(),
        };
      },

      createLectureTemplate() {
        return window.LectureManager.createTemplate(window.SettingsManager.get().interfaceLanguage);
      },

      createTranscriptProcessor(lecture) {
        return window.LectureManager.createTranscriptProcessor(lecture, window.SettingsManager.get().segmentIntervalMinutes);
      },

      ensureCurrentLecture() {
        if (!this.currentLecture) {
          this.currentLecture = this.createLectureTemplate();
        }
      },

      syncLectureFromForm() {
        this.ensureCurrentLecture();
        window.LectureManager.syncFormFields(this.currentLecture, window.UI.getLectureFormData(), this.currentDocuments);
      },

      syncLectureTranscriptState() {
        this.ensureCurrentLecture();
        window.LectureManager.syncTranscriptState(this.currentLecture, this.transcriptProcessor, this.currentDocuments);
      },

      resetLectureRuntimeState() {
        this.currentDocuments = [];
        this.activeCaptureMode = null;
        this.activeMediaInfo = null;
        this.transcriptProcessor = this.createTranscriptProcessor(null);
      },

      prepareNewLecture() {
        if (this.isRecording) {
          window.UI.showToast(window.UI.t("stopCurrentRecordingFirst"), "error");
          return;
        }

        this.currentLecture = this.createLectureTemplate();
        this.resetLectureRuntimeState();
        window.UI.setLectureFormData(this.currentLecture);
        window.UI.setLanguage(this.currentLecture.interfaceLanguage || window.SettingsManager.get().interfaceLanguage);
        window.UI.setMediaUploadBusy(false);
        window.UI.renderDocuments([]);
        window.UI.renderTranscript(this.transcriptProcessor.getHighlightedTranscriptHtml());
        window.UI.renderTerms([]);
        window.UI.renderUploadedMedia(null);
        window.UI.renderPartial("");
        window.UI.renderNotes("");
        window.UI.setSpeechStatus(window.UI.t("idle"));
        window.UI.setNotesStatus(window.UI.t("ready"));
        this.renderCurrentLecture();
      },

      renderCurrentLecture() {
        this.syncLectureFromForm();
        window.UI.renderLectureSummary(this.currentLecture, this.isRecording);
        window.UI.renderTranscript(this.transcriptProcessor.getHighlightedTranscriptHtml());
        window.UI.renderTerms(this.currentLecture.technicalTerms || []);
        window.UI.renderDocuments(this.currentDocuments);
        window.UI.renderUploadedMedia(window.LectureManager.getUploadedMedia(this.currentLecture), this.getUploadedMediaStatusMessage());
        window.UI.renderNotes(this.currentLecture.notes || "");
      },

      getUploadedMediaStatusMessage() {
        if (this.isRecording && this.activeCaptureMode === "media") {
          const fileName = this.currentLecture && this.currentLecture.uploadedMedia ? this.currentLecture.uploadedMedia.name : "";
          return fileName ? window.UI.t("transcribingMediaFile", { name: fileName }) : window.UI.t("transcribingMedia");
        }

        return null;
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
        this.currentDocuments = window.LectureManager.getDocuments(lecture);
        this.activeMediaInfo = window.LectureManager.getUploadedMedia(lecture);
        this.transcriptProcessor = this.createTranscriptProcessor(lecture);
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
        this.currentDocuments = window.LectureManager.getDocuments(draft.lecture);
        this.activeMediaInfo = window.LectureManager.getUploadedMedia(draft.lecture);
        this.transcriptProcessor = this.createTranscriptProcessor(draft.lecture);
        window.UI.setLectureFormData(this.currentLecture);
        window.UI.setLanguage(this.currentLecture.interfaceLanguage || window.SettingsManager.get().interfaceLanguage);
        this.renderCurrentLecture();
        window.UI.setRecoveryMessage(
          window.UI.t("recoveredDraft", {
            time: new Date(draft.updatedAt || Date.now()).toLocaleString(window.UI.currentLanguage === "zh-TW" ? "zh-TW" : "en-US"),
          })
        );
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
        this.syncLectureFromForm();
        this.syncLectureTranscriptState();

        await window.AppStorage.saveDraft({
          lecture: this.currentLecture,
          transcriptState: this.transcriptProcessor.getState(),
          isRecording: this.isRecording,
          persistedAt: Date.now(),
        });

        if (!isSyncLike) {
          window.UI.setRecoveryMessage(
            window.UI.t("draftAutosavedAt", {
              time: new Date().toLocaleTimeString(window.UI.currentLanguage === "zh-TW" ? "zh-TW" : "en-US"),
            })
          );
        }
      },

      async saveCurrentLecture(clearDraft) {
        this.syncLectureFromForm();
        this.syncLectureTranscriptState();

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

        this.syncLectureFromForm();
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
          this.activeCaptureMode = "microphone";
          this.activeMediaInfo = window.LectureManager.getUploadedMedia(this.currentLecture);
          window.UI.setMediaUploadBusy(true);
          this.currentLecture.date = this.currentLecture.date || Date.now();
          this.startAutosave();
          this.startDurationTicker();
          window.UI.setSpeechStatus(window.UI.t("listening"));
          this.renderCurrentLecture();
          await this.persistDraft(false);
        } catch (error) {
          console.error(error);
          await this.releaseWakeLock();
          this.activeCaptureMode = null;
          window.UI.setMediaUploadBusy(false);
          window.UI.showToast(error.message, "error");
          window.UI.setSpeechStatus(window.UI.t("error"));
        }
      },

      async completeActiveSession(options) {
        const settings = options || {};
        const finishedMode = this.activeCaptureMode;

        this.isRecording = false;
        this.activeCaptureMode = null;
        this.transcriptProcessor.flushAll();
        this.stopAutosave();
        this.stopDurationTicker();

        if (finishedMode === "microphone") {
          await this.releaseWakeLock();
        }

        this.ensureCurrentLecture();
        if (typeof settings.durationMs === "number" && settings.durationMs > 0) {
          this.currentLecture.durationMs = settings.durationMs;
        } else if (finishedMode === "microphone" && this.currentLecture.date) {
          this.currentLecture.durationMs = Date.now() - this.currentLecture.date;
        }

        this.syncLectureTranscriptState();

        window.UI.setMediaUploadBusy(false);
        window.UI.setSpeechStatus(settings.statusMessage || window.UI.t("stopped"));
        window.UI.renderPartial("");
        this.renderCurrentLecture();
        await this.saveCurrentLecture(settings.clearDraft !== false);

        if (settings.toastMessage) {
          window.UI.showToast(settings.toastMessage);
        }
      },

      async handleStopRecording() {
        if (!this.isRecording) {
          return;
        }

        const activeMode = this.activeCaptureMode;
        const mediaDuration = activeMode === "media" && this.currentLecture && this.currentLecture.uploadedMedia ? this.currentLecture.uploadedMedia.durationMs : null;
        await this.speechService.stop();
        await this.completeActiveSession({
          durationMs: activeMode === "media" ? mediaDuration : undefined,
          statusMessage: window.UI.t("stopped"),
          toastMessage: window.UI.t(activeMode === "media" ? "mediaLectureSavedLocally" : "lectureSavedLocally"),
        });
      },

      async handleMediaUpload(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) {
          return;
        }

        if (this.isRecording) {
          window.UI.showToast(window.UI.t("stopCurrentRecordingFirst"), "error");
          event.target.value = "";
          return;
        }

        const settings = window.SettingsManager.get();
        if (!settings.azureKey || !settings.azureRegion) {
          window.UI.showToast(window.UI.t("configureAzureFirst"), "error");
          window.UI.openSettings();
          event.target.value = "";
          return;
        }

        if (!this.speechService.isSupportedMediaFile(file)) {
          window.UI.showToast(window.UI.t("unsupportedMediaFile"), "error");
          event.target.value = "";
          return;
        }

        this.syncLectureFromForm();

        if (!this.currentLecture.date) {
          this.currentLecture.date = Date.now();
        }

        if (!this.currentLecture.title) {
          this.currentLecture.title = file.name.replace(/\.[^.]+$/, "") || `Lecture ${new Date(this.currentLecture.date).toLocaleString()}`;
        }

        this.currentLecture.uploadedMedia = {
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size || 0,
          durationMs: 0,
          uploadedAt: Date.now(),
        };

        try {
          window.UI.setMediaUploadBusy(true);
          window.UI.renderUploadedMedia(this.currentLecture.uploadedMedia, window.UI.t("preparingMedia"));

          const mediaInfo = await this.speechService.startMediaTranscription(
            {
              azureKey: settings.azureKey,
              azureRegion: settings.azureRegion,
              recognitionLanguages: settings.recognitionLanguages,
            },
            file
          );

          this.currentLecture.uploadedMedia.durationMs = mediaInfo.durationMs || 0;
          this.currentLecture.durationMs = mediaInfo.durationMs || this.currentLecture.durationMs;
          this.activeMediaInfo = { ...this.currentLecture.uploadedMedia };
          this.isRecording = true;
          this.activeCaptureMode = "media";
          this.startAutosave();
          window.UI.setSpeechStatus(window.UI.t("transcribingMedia"));
          this.renderCurrentLecture();
          await this.persistDraft(false);
        } catch (error) {
          console.error(error);
          this.activeCaptureMode = null;
          this.activeMediaInfo = window.LectureManager.getUploadedMedia(this.currentLecture);
          window.UI.setMediaUploadBusy(false);
          window.UI.renderUploadedMedia(window.LectureManager.getUploadedMedia(this.currentLecture));
          window.UI.setSpeechStatus(window.UI.t("error"));
          window.UI.showToast(error.message, "error");
        } finally {
          event.target.value = "";
        }
      },

      async handleMediaTranscriptionCompleted(payload) {
        if (!this.isRecording || this.activeCaptureMode !== "media") {
          return;
        }

        if (payload && this.currentLecture && this.currentLecture.uploadedMedia) {
          this.currentLecture.uploadedMedia.durationMs = payload.durationMs || this.currentLecture.uploadedMedia.durationMs || 0;
        }

        if (payload && payload.reason === "stopped") {
          return;
        }

        await this.completeActiveSession({
          durationMs: payload && payload.durationMs ? payload.durationMs : undefined,
          statusMessage: payload && payload.reason === "error" ? window.UI.t("error") : window.UI.t("stopped"),
          toastMessage: payload && payload.reason === "completed" ? window.UI.t("mediaLectureSavedLocally") : null,
        });
      },

      async handleGenerateNotes() {
        this.syncLectureFromForm();
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
        this.transcriptProcessor = this.createTranscriptProcessor(null);
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
        this.syncLectureFromForm();
        window.UI.setLanguage(this.currentLecture.interfaceLanguage || window.SettingsManager.get().interfaceLanguage);
        this.renderCurrentLecture();
        await this.persistDraft(false);
      },
    };
  }

  window.AppController = { createController };
})();