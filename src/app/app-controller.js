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
      audioQualityIssue: null,
      latestAudioQualityPayload: null,
      interventionTimerId: null,
      interventionInFlight: false,
      lastRecognizedPayload: null,
      lastRecognitionUpdate: null,
      lastInterventionSignature: "",
      lastInterventionAt: 0,
      lastQualityAlertIssue: null,
      manualQuestionInFlight: false,

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
            this.cancelPendingIntervention();
            if (this.isRecording && this.activeCaptureMode === "microphone") {
              this.renderInterventionPanel(window.UI.t("interventionMonitoring"));
            }
          },
          onRecognized: (payload) => {
            const update = this.transcriptProcessor.consumeFinalResult(payload);
            if (!update) {
              return;
            }

            this.ensureCurrentLecture();
            window.LectureManager.syncTranscriptState(this.currentLecture, this.transcriptProcessor, this.currentDocuments);
            this.currentLecture.technicalTerms = update.technicalTerms;
            this.currentLecture.assistantScenario = window.SettingsManager.get().assistantScenario;
            this.renderCurrentLecture();
            this.scheduleInterventionEvaluation(payload, update);
          },
          onStatus: (message) => {
            if ((message === "Listening" || message === "Reconnected") && this.audioQualityIssue && this.activeCaptureMode === "microphone") {
              window.UI.setSpeechStatus(this.getAudioQualityStatus(this.audioQualityIssue));
              return;
            }

            window.UI.setSpeechStatus(message);
          },
          onAudioQuality: (payload) => {
            if (this.activeCaptureMode !== "microphone") {
              return;
            }

            const nextIssue = payload && payload.issue ? payload.issue : null;
            if (nextIssue !== this.audioQualityIssue && nextIssue) {
              window.UI.showToast(this.getAudioQualityToast(nextIssue));
            }

            this.audioQualityIssue = nextIssue;
            this.latestAudioQualityPayload = payload || null;

            if (payload && payload.isSpeechDetected) {
              this.cancelPendingIntervention();
            }

            if (this.isRecording) {
              window.UI.setSpeechStatus(this.getAudioQualityStatus(nextIssue));
            }

            if (!nextIssue) {
              this.lastQualityAlertIssue = null;
            }

            if (nextIssue) {
              this.addQualityAlertIntervention(nextIssue).catch((error) => console.error("Quality alert intervention failed", error));
            } else if (this.isRecording) {
              this.renderInterventionPanel(window.UI.t("interventionMonitoring"));
            }
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
          onExportData: () => this.handleExportData(),
          onImportData: (event) => this.handleImportData(event),
          onMediaUpload: (event) => this.handleMediaUpload(event),
          onDocumentUpload: (event) => this.handleDocumentUpload(event),
          onManualQuestion: (event) => this.handleManualQuestion(event),
          onSaveSettings: (event) => this.handleSaveSettings(event),
          onResetSettings: () => this.handleResetSettings(),
          onLectureMetadataChange: () => this.handleLectureMetadataChange(),
        };
      },

      createLectureTemplate() {
        const settings = window.SettingsManager.get();
        return window.LectureManager.createTemplate(settings.interfaceLanguage, settings.assistantScenario);
      },

      createTranscriptProcessor(lecture) {
        return window.LectureManager.createTranscriptProcessor(lecture, window.SettingsManager.get().segmentIntervalMinutes);
      },

      ensureCurrentLecture() {
        if (!this.currentLecture) {
          this.currentLecture = this.createLectureTemplate();
        }

        this.currentLecture.aiInterventions = Array.isArray(this.currentLecture.aiInterventions) ? this.currentLecture.aiInterventions : [];
        this.currentLecture.assistantScenario = this.currentLecture.assistantScenario === "interview"
          ? "interview"
          : (window.SettingsManager.get().assistantScenario || "classroom");
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
        this.audioQualityIssue = null;
        this.latestAudioQualityPayload = null;
        this.transcriptProcessor = this.createTranscriptProcessor(null);
        this.resetInterventionRuntimeState();
      },

      resetInterventionRuntimeState() {
        this.cancelPendingIntervention();
        this.interventionInFlight = false;
        this.lastRecognizedPayload = null;
        this.lastRecognitionUpdate = null;
        this.lastInterventionSignature = "";
        this.lastInterventionAt = 0;
        this.lastQualityAlertIssue = null;
        this.manualQuestionInFlight = false;
      },

      cancelPendingIntervention() {
        if (this.interventionTimerId) {
          window.clearTimeout(this.interventionTimerId);
          this.interventionTimerId = null;
        }
      },

      getInterventionStatusMessage(statusOverride) {
        if (statusOverride) {
          return statusOverride;
        }

        const settings = window.SettingsManager.get();
        if (!settings.interventionEnabled) {
          return window.UI.t("interventionDisabled");
        }

        if (this.isRecording && this.activeCaptureMode === "microphone") {
          return settings.geminiKey
            ? window.UI.t("interventionMonitoring")
            : window.UI.t("interventionMonitoringLocal");
        }

        return window.UI.t("interventionIdle");
      },

      renderInterventionPanel(statusOverride) {
        this.ensureCurrentLecture();
        window.UI.setInterventionScenario(this.currentLecture.assistantScenario || window.SettingsManager.get().assistantScenario || "classroom");
        window.UI.setInterventionStatus(this.getInterventionStatusMessage(statusOverride));
        window.UI.renderInterventions(this.currentLecture.aiInterventions || []);
      },

      scheduleInterventionEvaluation(payload, update) {
        const settings = window.SettingsManager.get();
        if (!settings.interventionEnabled || this.activeCaptureMode !== "microphone") {
          this.renderInterventionPanel();
          return;
        }

        this.lastRecognizedPayload = payload;
        this.lastRecognitionUpdate = update;
        this.cancelPendingIntervention();
        this.renderInterventionPanel(window.UI.t("interventionWaitingForPause"));

        this.interventionTimerId = window.setTimeout(() => {
          this.maybeEvaluateIntervention().catch((error) => {
            console.error("Intervention evaluation failed", error);
            this.renderInterventionPanel();
          });
        }, Math.max(1000, settings.interventionPauseMs));
      },

      buildInterventionSignature(intervention) {
        return [
          intervention.action,
          intervention.triggerReason,
          intervention.message,
          this.lastRecognizedPayload && this.lastRecognizedPayload.text,
        ].join("|").toLowerCase();
      },

      shouldSkipIntervention(intervention) {
        const signature = this.buildInterventionSignature(intervention);
        if (signature === this.lastInterventionSignature) {
          return true;
        }

        if (!intervention.bypassCooldown && Date.now() - this.lastInterventionAt < 8000) {
          return true;
        }

        this.lastInterventionSignature = signature;
        this.lastInterventionAt = Date.now();
        return false;
      },

      appendIntervention(intervention) {
        this.ensureCurrentLecture();
        const nextEntry = {
          action: intervention.action || "INTERVENE",
          message: intervention.message || "",
          createdAt: Date.now(),
          triggerReason: intervention.triggerReason || "unknown",
          scenario: intervention.scenario || this.currentLecture.assistantScenario,
          source: intervention.source || "gemini",
          userQuestion: intervention.userQuestion || "",
        };

        this.currentLecture.aiInterventions = [nextEntry].concat(this.currentLecture.aiInterventions || []).slice(0, window.InterventionService.MAX_HISTORY_ITEMS || 12);
        this.currentLecture.updatedAt = Date.now();
        this.renderInterventionPanel();
      },

      async handleManualQuestion(event) {
        event.preventDefault();

        const settings = window.SettingsManager.get();
        if (!settings.geminiKey) {
          window.UI.showToast(window.UI.t("manualQuestionUnavailable"), "error");
          window.UI.openSettings();
          return;
        }

        const question = window.UI.getManualQuestion();
        if (!question) {
          window.UI.showToast(window.UI.t("manualQuestionEmpty"), "error");
          return;
        }

        if (this.manualQuestionInFlight) {
          return;
        }

        this.ensureCurrentLecture();
        this.syncLectureFromForm();
        this.manualQuestionInFlight = true;
        window.UI.setManualQuestionBusy(true);
        this.renderInterventionPanel(window.UI.t("manualQuestionSending"));

        try {
          const intervention = await window.InterventionService.manualAsk({
            geminiKey: settings.geminiKey,
            preferredProcessingLanguage: settings.preferredProcessingLanguage,
            interfaceLanguage: this.currentLecture && this.currentLecture.interfaceLanguage ? this.currentLecture.interfaceLanguage : settings.interfaceLanguage,
            scenario: this.currentLecture && this.currentLecture.assistantScenario ? this.currentLecture.assistantScenario : settings.assistantScenario,
            question,
            transcript: this.transcriptProcessor.getTranscriptText(),
            lectureTitle: this.currentLecture && this.currentLecture.title,
            courseName: this.currentLecture && this.currentLecture.courseName,
            topic: this.currentLecture && this.currentLecture.topic,
            additionalContext: this.currentLecture && this.currentLecture.additionalContext,
            detectedTerms: this.transcriptProcessor.getTechnicalTerms(),
            detectedLanguage: this.lastRecognizedPayload && this.lastRecognizedPayload.language,
          });

          if (intervention) {
            this.appendIntervention(intervention);
            await this.persistDraft(false);
          } else {
            this.renderInterventionPanel();
          }

          window.UI.clearManualQuestion();
        } catch (error) {
          console.error(error);
          window.UI.showToast(error.message, "error");
          this.renderInterventionPanel();
        } finally {
          this.manualQuestionInFlight = false;
          window.UI.setManualQuestionBusy(false);
        }
      },

      async addQualityAlertIntervention(issue) {
        const settings = window.SettingsManager.get();
        if (!settings.interventionEnabled || this.lastQualityAlertIssue === issue) {
          return;
        }

        const intervention = await window.InterventionService.evaluate({
          scenario: this.currentLecture && this.currentLecture.assistantScenario,
          qualityIssue: issue,
          interfaceLanguage: this.currentLecture && this.currentLecture.interfaceLanguage ? this.currentLecture.interfaceLanguage : settings.interfaceLanguage,
        });

        if (intervention) {
          intervention.bypassCooldown = true;
        }

        if (!intervention || this.shouldSkipIntervention(intervention)) {
          return;
        }

        this.lastQualityAlertIssue = issue;
        this.appendIntervention(intervention);
      },

      async maybeEvaluateIntervention() {
        const settings = window.SettingsManager.get();
        if (!this.isRecording || this.activeCaptureMode !== "microphone" || this.interventionInFlight || !this.lastRecognizedPayload) {
          this.renderInterventionPanel();
          return;
        }

        if (!settings.interventionEnabled) {
          this.renderInterventionPanel();
          return;
        }

        if (this.audioQualityIssue) {
          await this.addQualityAlertIntervention(this.audioQualityIssue);
          this.renderInterventionPanel();
          return;
        }

        const vadState = this.latestAudioQualityPayload;
        if (vadState && vadState.isSpeechDetected) {
          this.renderInterventionPanel(window.UI.t("interventionWaitingForPause"));
          return;
        }

        const silenceMs = vadState && typeof vadState.silenceMs === "number" ? vadState.silenceMs : settings.interventionPauseMs;
        if (silenceMs < settings.interventionPauseMs) {
          this.renderInterventionPanel(window.UI.t("interventionWaitingForPause"));
          this.cancelPendingIntervention();
          this.interventionTimerId = window.setTimeout(() => {
            this.maybeEvaluateIntervention().catch((error) => {
              console.error("Intervention reevaluation failed", error);
              this.renderInterventionPanel();
            });
          }, 400);
          return;
        }

        this.interventionInFlight = true;
        this.renderInterventionPanel(window.UI.t(settings.geminiKey ? "interventionEvaluating" : "interventionEvaluatingLocal"));

        try {
          const intervention = await window.InterventionService.evaluate({
            geminiKey: settings.geminiKey,
            preferredProcessingLanguage: settings.preferredProcessingLanguage,
            interfaceLanguage: this.currentLecture && this.currentLecture.interfaceLanguage ? this.currentLecture.interfaceLanguage : settings.interfaceLanguage,
            scenario: this.currentLecture && this.currentLecture.assistantScenario ? this.currentLecture.assistantScenario : settings.assistantScenario,
            latestUtterance: this.lastRecognizedPayload.text,
            detectedLanguage: this.lastRecognizedPayload.language,
            detectedTerms: this.lastRecognitionUpdate && this.lastRecognitionUpdate.technicalTerms
              ? this.lastRecognitionUpdate.technicalTerms
              : window.TranscriptProcessor.detectTechnicalTerms(this.lastRecognizedPayload.text),
            transcript: this.transcriptProcessor.getTranscriptText(),
            lectureTitle: this.currentLecture && this.currentLecture.title,
            courseName: this.currentLecture && this.currentLecture.courseName,
            topic: this.currentLecture && this.currentLecture.topic,
            additionalContext: this.currentLecture && this.currentLecture.additionalContext,
            pauseMs: settings.interventionPauseMs,
            silenceMs,
            prosody: this.lastRecognizedPayload.prosody,
            utteranceDurationMs: this.lastRecognizedPayload.durationMs,
            interventionSensitivity: settings.interventionSensitivity,
          });

          if (intervention && !this.shouldSkipIntervention(intervention)) {
            this.appendIntervention(intervention);
          } else {
            this.renderInterventionPanel();
          }
        } finally {
          this.interventionInFlight = false;
        }
      },

      getAudioQualityStatus(issue) {
        if (!issue) {
          return window.UI.t("listening");
        }

        if (issue === "low-volume") {
          return window.UI.t("listeningLowVolume");
        }

        if (issue === "high-noise") {
          return window.UI.t("listeningHighNoise");
        }

        if (issue === "clipping") {
          return window.UI.t("listeningClipping");
        }

        return window.UI.t("listening");
      },

      getAudioQualityToast(issue) {
        if (issue === "low-volume") {
          return window.UI.t("lowInputVolumeWarning");
        }

        if (issue === "high-noise") {
          return window.UI.t("highBackgroundNoiseWarning");
        }

        if (issue === "clipping") {
          return window.UI.t("inputClippingWarning");
        }

        return window.UI.t("listening");
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
        window.UI.clearManualQuestion();
        window.UI.setManualQuestionBusy(false);
        this.renderInterventionPanel();
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
        this.renderInterventionPanel();
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
        this.resetInterventionRuntimeState();
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
        this.resetInterventionRuntimeState();
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
          this.audioQualityIssue = null;
          this.latestAudioQualityPayload = null;
          this.resetInterventionRuntimeState();
          this.currentLecture.assistantScenario = settings.assistantScenario;
          await this.speechService.start({
            azureKey: settings.azureKey,
            azureRegion: settings.azureRegion,
            preferredProcessingLanguage: settings.preferredProcessingLanguage,
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
          this.renderInterventionPanel();
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
        this.audioQualityIssue = null;
        this.latestAudioQualityPayload = null;
        this.transcriptProcessor.flushAll();
        this.stopAutosave();
        this.stopDurationTicker();
        this.cancelPendingIntervention();

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
              preferredProcessingLanguage: settings.preferredProcessingLanguage,
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
            preferredProcessingLanguage: settings.preferredProcessingLanguage,
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
          this.currentLecture.assistantScenario = settings.assistantScenario;
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
        if (this.currentLecture) {
          this.currentLecture.assistantScenario = settings.assistantScenario;
        }
        this.renderCurrentLecture();
        window.UI.showToast(window.UI.t("settingsReset"));
      },

      async handleExportData() {
        if (this.currentLecture) {
          await this.persistDraft(true);
        }

        const payload = await window.AppStorage.exportAll();
        const stamp = new Date(payload.exportedAt).toISOString().replace(/[:.]/g, "-");
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `lecture-assistant-backup-${stamp}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);

        window.UI.showToast(window.UI.t("exportDataSuccess"));
      },

      async handleImportData(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = "";

        if (!file) {
          return;
        }

        if (this.isRecording) {
          window.UI.showToast(window.UI.t("importDataRecordingBlocked"), "error");
          return;
        }

        try {
          const text = await file.text();
          const payload = JSON.parse(text);
          const result = await window.AppStorage.importAll(payload);
          const settings = await window.SettingsManager.load();

          this.currentLecture = null;
          this.currentDocuments = [];
          this.activeMediaInfo = null;
          this.transcriptProcessor = this.createTranscriptProcessor(null);
          this.resetInterventionRuntimeState();

          window.UI.setSettingsForm(settings);
          window.UI.setLanguage(settings.interfaceLanguage);
          await this.refreshLectures();
          await this.restoreDraftIfAvailable();

          if (!this.currentLecture && this.lectures.length) {
            await this.loadLecture(this.lectures[0].id);
          }

          if (!this.currentLecture) {
            this.prepareNewLecture();
          }

          this.renderCurrentLecture();
          window.UI.showToast(window.UI.t("importDataSuccess", { count: result.lectureCount }));
        } catch (error) {
          console.error(error);
          window.UI.showToast(window.UI.t("importDataInvalid"), "error");
        }
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