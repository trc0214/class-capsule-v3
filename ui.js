(function () {
  function formatDate(value) {
    if (!value) {
      return "No session loaded";
    }
    return new Date(value).toLocaleString();
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  function formatBytes(bytes) {
    if (!bytes) {
      return "0 KB";
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 102.4) / 10} KB`;
    }
    return `${Math.round(bytes / 104857.6) / 10} MB`;
  }

  const UI = {
    refs: {},

    init() {
      this.refs = {
        historyList: document.getElementById("historyList"),
        recoveryMessage: document.getElementById("recoveryMessage"),
        transcriptContainer: document.getElementById("transcriptContainer"),
        notesContainer: document.getElementById("notesContainer"),
        termList: document.getElementById("termList"),
        partialTranscript: document.getElementById("partialTranscript"),
        speechStatus: document.getElementById("speechStatus"),
        notesStatus: document.getElementById("notesStatus"),
        lectureTitleDisplay: document.getElementById("lectureTitleDisplay"),
        lectureMetaDate: document.getElementById("lectureMetaDate"),
        lectureMetaDuration: document.getElementById("lectureMetaDuration"),
        lectureTitleInput: document.getElementById("lectureTitleInput"),
        courseNameInput: document.getElementById("courseNameInput"),
        lectureTopicInput: document.getElementById("lectureTopicInput"),
        additionalContextInput: document.getElementById("additionalContextInput"),
        interfaceLanguageSelect: document.getElementById("interfaceLanguageSelect"),
        documentInput: document.getElementById("documentInput"),
        documentList: document.getElementById("documentList"),
        startButton: document.getElementById("startButton"),
        stopButton: document.getElementById("stopButton"),
        generateNotesButton: document.getElementById("generateNotesButton"),
        settingsButton: document.getElementById("settingsButton"),
        newLectureButton: document.getElementById("newLectureButton"),
        settingsDialog: document.getElementById("settingsDialog"),
        settingsForm: document.getElementById("settingsForm"),
        closeSettingsButton: document.getElementById("closeSettingsButton"),
        resetSettingsButton: document.getElementById("resetSettingsButton"),
        saveSettingsButton: document.getElementById("saveSettingsButton"),
        azureKeyInput: document.getElementById("azureKeyInput"),
        azureRegionInput: document.getElementById("azureRegionInput"),
        geminiKeyInput: document.getElementById("geminiKeyInput"),
        recognitionLanguagesInput: document.getElementById("recognitionLanguagesInput"),
        segmentIntervalInput: document.getElementById("segmentIntervalInput"),
        settingsLanguageInput: document.getElementById("settingsLanguageInput"),
        toastContainer: document.getElementById("toastContainer"),
      };

      return this.refs;
    },

    bindHandlers(handlers) {
      this.refs.startButton.addEventListener("click", handlers.onStart);
      this.refs.stopButton.addEventListener("click", handlers.onStop);
      this.refs.generateNotesButton.addEventListener("click", handlers.onGenerateNotes);
      this.refs.settingsButton.addEventListener("click", () => this.openSettings());
      this.refs.closeSettingsButton.addEventListener("click", () => this.closeSettings());
      this.refs.newLectureButton.addEventListener("click", handlers.onNewLecture);
      this.refs.documentInput.addEventListener("change", handlers.onDocumentUpload);
      this.refs.settingsForm.addEventListener("submit", handlers.onSaveSettings);
      this.refs.resetSettingsButton.addEventListener("click", handlers.onResetSettings);

      [
        this.refs.lectureTitleInput,
        this.refs.courseNameInput,
        this.refs.lectureTopicInput,
        this.refs.additionalContextInput,
        this.refs.interfaceLanguageSelect,
      ].forEach((element) => {
        element.addEventListener("input", handlers.onLectureMetadataChange);
      });
    },

    openSettings() {
      this.refs.settingsDialog.showModal();
    },

    closeSettings() {
      this.refs.settingsDialog.close();
    },

    getLectureFormData() {
      return {
        title: this.refs.lectureTitleInput.value.trim(),
        courseName: this.refs.courseNameInput.value.trim(),
        topic: this.refs.lectureTopicInput.value.trim(),
        additionalContext: this.refs.additionalContextInput.value.trim(),
        interfaceLanguage: this.refs.interfaceLanguageSelect.value,
      };
    },

    setLectureFormData(lecture) {
      const safeLecture = lecture || {};
      this.refs.lectureTitleInput.value = safeLecture.title || "";
      this.refs.courseNameInput.value = safeLecture.courseName || "";
      this.refs.lectureTopicInput.value = safeLecture.topic || "";
      this.refs.additionalContextInput.value = safeLecture.additionalContext || "";
      this.refs.interfaceLanguageSelect.value = safeLecture.interfaceLanguage || "en";
    },

    setSettingsForm(settings) {
      this.refs.azureKeyInput.value = settings.azureKey || "";
      this.refs.azureRegionInput.value = settings.azureRegion || "";
      this.refs.geminiKeyInput.value = settings.geminiKey || "";
      this.refs.recognitionLanguagesInput.value = (settings.recognitionLanguages || []).join(", ");
      this.refs.segmentIntervalInput.value = settings.segmentIntervalMinutes || 3;
      this.refs.settingsLanguageInput.value = settings.interfaceLanguage || "en";
      this.refs.interfaceLanguageSelect.value = settings.interfaceLanguage || "en";
    },

    getSettingsFormData() {
      return {
        azureKey: this.refs.azureKeyInput.value.trim(),
        azureRegion: this.refs.azureRegionInput.value.trim(),
        geminiKey: this.refs.geminiKeyInput.value.trim(),
        recognitionLanguages: this.refs.recognitionLanguagesInput.value,
        segmentIntervalMinutes: Number(this.refs.segmentIntervalInput.value),
        interfaceLanguage: this.refs.settingsLanguageInput.value,
      };
    },

    setRecordingState(isRecording) {
      this.refs.startButton.disabled = isRecording;
      this.refs.stopButton.disabled = !isRecording;
    },

    setSpeechStatus(message) {
      this.refs.speechStatus.textContent = message;
    },

    setNotesStatus(message) {
      this.refs.notesStatus.textContent = message;
    },

    setRecoveryMessage(message) {
      this.refs.recoveryMessage.textContent = message;
    },

    renderTranscript(transcriptHtml) {
      this.refs.transcriptContainer.innerHTML = transcriptHtml;
      this.refs.transcriptContainer.scrollTop = this.refs.transcriptContainer.scrollHeight;
    },

    renderTerms(terms) {
      if (!terms || !terms.length) {
        this.refs.termList.innerHTML = '<span class="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500">No terms detected yet</span>';
        return;
      }

      this.refs.termList.innerHTML = terms
        .map((term) => `<span class="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-zinc-700">${window.TranscriptProcessor.escapeHtml(term)}</span>`)
        .join("");
    },

    renderPartial(text) {
      this.refs.partialTranscript.textContent = text || "Waiting for speech input.";
    },

    renderNotes(markdown) {
      this.refs.notesContainer.textContent = markdown || "# Lecture Title\n\nDate\n\n## Lecture Summary\n\nGenerated notes will appear here.";
    },

    renderDocuments(documents) {
      if (!documents || !documents.length) {
        this.refs.documentList.innerHTML = '<p class="text-sm text-zinc-500">No documents uploaded.</p>';
        return;
      }

      this.refs.documentList.innerHTML = documents
        .map(
          (document) => `
            <div class="rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold">${window.TranscriptProcessor.escapeHtml(document.name)}</p>
                  <p class="text-xs text-zinc-500">${window.TranscriptProcessor.escapeHtml(document.type.toUpperCase())} · ${formatBytes(document.size)}</p>
                </div>
              </div>
            </div>
          `
        )
        .join("");
    },

    renderLectureSummary(lecture, isRecording) {
      const title = (lecture && lecture.title) || "Untitled lecture";
      const date = lecture && lecture.date ? lecture.date : null;
      const duration = lecture && typeof lecture.durationMs === "number" ? lecture.durationMs : 0;

      this.refs.lectureTitleDisplay.textContent = title;
      this.refs.lectureMetaDate.textContent = formatDate(date);
      this.refs.lectureMetaDuration.textContent = formatDuration(duration);
      this.setRecordingState(Boolean(isRecording));
    },

    renderHistory(lectures, activeLectureId, onSelect) {
      if (!lectures.length) {
        this.refs.historyList.innerHTML = '<div class="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">No lectures saved yet.</div>';
        return;
      }

      this.refs.historyList.innerHTML = lectures
        .map(
          (lecture) => `
            <button data-lecture-id="${lecture.id}" data-active="${lecture.id === activeLectureId}" class="history-card w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-steel">${formatDate(lecture.date)}</p>
              <h3 class="mt-2 text-base font-semibold text-zinc-900">${window.TranscriptProcessor.escapeHtml(lecture.title || "Untitled lecture")}</h3>
              <div class="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <span>${formatDuration(lecture.durationMs || 0)}</span>
                <span>•</span>
                <span>${lecture.notes ? "Notes ready" : "Transcript only"}</span>
              </div>
            </button>
          `
        )
        .join("");

      this.refs.historyList.querySelectorAll("[data-lecture-id]").forEach((button) => {
        button.addEventListener("click", () => onSelect(button.getAttribute("data-lecture-id")));
      });
    },

    showToast(message, tone) {
      const toast = document.createElement("div");
      toast.className = `pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200 bg-white/90 text-zinc-700"}`;
      toast.textContent = message;
      this.refs.toastContainer.appendChild(toast);

      window.setTimeout(() => {
        toast.remove();
      }, 3600);
    },
  };

  window.UI = UI;
})();