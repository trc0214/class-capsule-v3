(function () {
  const MESSAGES = {
    en: {
      appTitle: "Lecture Assistant",
      sessions: "Sessions",
      new: "New",
      recovery: "Recovery",
      noPendingDraft: "No pending draft.",
      backupHelp: "Export a backup before changing localhost or browser storage.",
      exportData: "Export Data",
      importData: "Import Data",
      exportDataSuccess: "Backup downloaded successfully.",
      importDataSuccess: "Backup restored: {count} lecture(s) imported.",
      importDataInvalid: "Backup file could not be imported.",
      importDataRecordingBlocked: "Stop recording before importing a backup.",
      liveTranscript: "Live Transcript",
      untitledLecture: "Untitled lecture",
      noSessionLoaded: "No session loaded",
      idle: "Idle",
      startRecording: "Start Recording",
      stopRecording: "Stop Recording",
      generateNotes: "Generate Notes",
      settings: "Settings",
      lectureTitle: "Lecture Title",
      lectureTitlePlaceholder: "Distributed Systems - Week 5",
      courseName: "Course Name",
      courseNamePlaceholder: "CS 540",
      lectureTopic: "Lecture Topic",
      lectureTopicPlaceholder: "Consensus and Paxos",
      interfaceLanguage: "Interface Language",
      additionalContext: "Additional Context",
      additionalContextPlaceholder: "Instructor focus, assignment context, exam hints, or anything Gemini should know.",
      referenceDocuments: "Reference Documents",
      referenceDocumentsHelp: "Upload .txt, .md, or .pdf lecture materials before generating notes.",
      upload: "Upload",
      uploadedMedia: "Uploaded Media",
      uploadedMediaHelp: "Upload an audio or video file to transcribe without using the microphone.",
      noMediaSelected: "No media file selected.",
      selectedMedia: "Selected media: {name}",
      preparingMedia: "Preparing uploaded media",
      transcribingMedia: "Transcribing uploaded media",
      transcribingMediaFile: "Transcribing {name}...",
      mediaLectureSavedLocally: "Uploaded media transcript saved locally.",
      uploadAudioOrVideoFirst: "Please upload an audio or video file.",
      unsupportedMediaFile: "Please upload an audio or video file.",
      detectedTechnicalTerms: "Detected Technical Terms",
      partialRecognition: "Partial Recognition",
      liveInterventionAssistant: "Live Intervention Assistant",
      interventionIdle: "Monitoring is idle.",
      interventionMonitoring: "Monitoring for intervention opportunities.",
      interventionMonitoringLocal: "Local tone model is monitoring. Add Gemini for richer intervention wording.",
      interventionUnavailable: "Add a Gemini API key to enable live intervention.",
      interventionDisabled: "Live intervention assistant is disabled.",
      interventionEvaluating: "Analyzing whether AI should intervene...",
      interventionEvaluatingLocal: "Local tone model is evaluating the latest utterance...",
      interventionWaitingForPause: "Waiting for a VAD-confirmed pause before evaluating.",
      interventionEnabled: "Live Intervention Assistant",
      interventionEnabledHelp: "Use VAD, audio quality, and a local tone model to decide whether AI should interject during recording.",
      interventionScenario: "Intervention Scenario",
      interventionPauseThreshold: "Intervention Pause Threshold (ms)",
      interventionSensitivity: "Local Tone Trigger Sensitivity",
      interventionSensitivityHelp: "Higher values make the browser-local tone model trigger more aggressively.",
      scenarioClassroom: "Classroom",
      scenarioInterview: "Interview",
      noInterventionsYet: "No intervention suggestions yet.",
      actionIntervene: "Intervene",
      actionSuggest: "Suggest",
      actionQualityAlert: "Quality Alert",
      manualQuestion: "Manual Question",
      manualQuestionPlaceholder: "Ask the assistant to explain, clarify, or suggest a follow-up.",
      manualQuestionHint: "This sends an immediate request using the current scenario and transcript context.",
      askNow: "Ask Now",
      manualQuestionEmpty: "Enter a question before sending it.",
      manualQuestionSending: "Sending manual question...",
      manualQuestionUnavailable: "Add a Gemini API key before using manual questions.",
      waitingForSpeech: "Waiting for speech input.",
      aiNotes: "AI Notes",
      markdownLectureNotes: "Markdown lecture notes",
      ready: "Ready.",
      preview: "Preview",
      defaultNotes: "# Lecture Title\n\nDate\n\n## Lecture Summary\n\nGenerated notes will appear here.",
      settingsTitle: "Settings",
      apiConfiguration: "API configuration",
      close: "Close",
      azureSpeechApiKey: "Azure Speech API Key",
      pasteAzureSpeechKey: "Paste Azure Speech key",
      azureRegion: "Azure Region",
      geminiApiKey: "Gemini API Key",
      pasteGeminiKey: "Paste Gemini key",
      preferredProcessingLanguage: "Primary Lecture Language",
      preferredProcessingLanguagePlaceholder: "Leave blank to auto detect, e.g. en-US or zh-TW",
      recognitionLanguages: "Recognition Languages (Auto Detect)",
      segmentIntervalFallback: "Segment Interval Fallback (minutes)",
      keysSource: "Keys can come from browser storage or config/local-config.js.",
      reset: "Reset",
      saveSettings: "Save Settings",
      noTermsDetectedYet: "No terms detected yet",
      noDocumentsUploaded: "No documents uploaded.",
      noLecturesSavedYet: "No lectures saved yet.",
      notesReady: "Notes ready",
      transcriptOnly: "Transcript only",
      transcriptWillAppear: "Transcript will appear here as the lecture progresses.",
      configureAzureFirst: "Configure Azure Speech credentials first.",
      configureGeminiFirst: "Configure Gemini API key first.",
      transcriptEmpty: "Transcript is empty. Record or load a lecture first.",
      listening: "Listening",
      listeningLowVolume: "Listening - low input volume",
      listeningHighNoise: "Listening - background noise is high",
      listeningClipping: "Listening - input level is too high",
      lowInputVolumeWarning: "Input volume is low. Move closer to the microphone or raise the input gain.",
      highBackgroundNoiseWarning: "Background noise is high. Move to a quieter place or reduce nearby noise.",
      inputClippingWarning: "Input level is too high. Move slightly away from the microphone.",
      error: "Error",
      stopped: "Stopped",
      lectureSavedLocally: "Lecture saved locally.",
      preparingReferenceContext: "Preparing reference context",
      generationFailed: "Generation failed",
      addedReferenceDocuments: "Added {count} reference document{suffix}.",
      settingsSavedLocally: "Settings saved locally.",
      settingsReset: "Settings reset.",
      stopCurrentRecordingFirst: "Stop the current recording before starting a new lecture.",
      stopRecordingBeforeSwitching: "Stop recording before switching lectures.",
      recoveredDraft: "Recovered draft from {time}. Recording must be started again manually.",
      draftAutosavedAt: "Draft autosaved at {time}.",
    },
    "zh-TW": {
      appTitle: "Lecture Assistant",
      sessions: "講座紀錄",
      new: "新增",
      recovery: "復原",
      noPendingDraft: "沒有待復原的草稿。",
      backupHelp: "在更換 localhost 或清除瀏覽器資料前，先匯出備份。",
      exportData: "匯出資料",
      importData: "匯入資料",
      exportDataSuccess: "備份檔已下載。",
      importDataSuccess: "備份已還原，已匯入 {count} 筆講座。",
      importDataInvalid: "無法匯入這個備份檔。",
      importDataRecordingBlocked: "匯入備份前請先停止錄音。",
      liveTranscript: "即時逐字稿",
      untitledLecture: "未命名講座",
      noSessionLoaded: "尚未載入任何講座",
      idle: "閒置中",
      startRecording: "開始錄音",
      stopRecording: "停止錄音",
      generateNotes: "產生筆記",
      settings: "設定",
      lectureTitle: "講座標題",
      lectureTitlePlaceholder: "分散式系統 - 第 5 週",
      courseName: "課程名稱",
      courseNamePlaceholder: "CS 540",
      lectureTopic: "講座主題",
      lectureTopicPlaceholder: "共識演算法與 Paxos",
      interfaceLanguage: "介面語言",
      additionalContext: "補充背景",
      additionalContextPlaceholder: "輸入教師重點、作業背景、考試提示，或任何希望 Gemini 了解的內容。",
      referenceDocuments: "參考文件",
      referenceDocumentsHelp: "在產生筆記前上傳 .txt、.md 或 .pdf 講義資料。",
      upload: "上傳",
      uploadedMedia: "上傳影音",
      uploadedMediaHelp: "上傳音訊或影片檔即可轉錄，不必使用麥克風。",
      noMediaSelected: "尚未選擇任何影音檔。",
      selectedMedia: "已選擇影音：{name}",
      preparingMedia: "正在準備影音轉錄",
      transcribingMedia: "正在轉錄上傳影音",
      transcribingMediaFile: "正在轉錄 {name}...",
      mediaLectureSavedLocally: "上傳影音的逐字稿已儲存在本機。",
      uploadAudioOrVideoFirst: "請先上傳音訊或影片檔。",
      unsupportedMediaFile: "請上傳音訊或影片檔。",
      detectedTechnicalTerms: "偵測到的技術名詞",
      partialRecognition: "即時辨識片段",
      liveInterventionAssistant: "即時介入助理",
      interventionIdle: "介入監聽目前閒置中。",
      interventionMonitoring: "正在監聽是否需要 AI 介入。",
      interventionMonitoringLocal: "本地語氣模型正在監聽中，可加入 Gemini 取得更完整的介入措辭。",
      interventionUnavailable: "請先填入 Gemini API 金鑰以啟用即時介入。",
      interventionDisabled: "即時介入助理目前已停用。",
      interventionEvaluating: "正在分析是否需要 AI 介入...",
      interventionEvaluatingLocal: "本地語氣模型正在分析最新語句是否需要介入...",
      interventionWaitingForPause: "正在等待 VAD 確認停頓後再判斷是否介入。",
      interventionEnabled: "即時介入助理",
      interventionEnabledHelp: "結合 VAD、音訊品質與本地語氣模型，判斷錄音中是否需要 AI 主動切入。",
      interventionScenario: "介入情境",
      interventionPauseThreshold: "介入停頓門檻（毫秒）",
      interventionSensitivity: "本地語氣觸發敏感度",
      interventionSensitivityHelp: "數值越高，本地端語氣模型越容易觸發介入。",
      scenarioClassroom: "課堂",
      scenarioInterview: "面試",
      noInterventionsYet: "目前尚無介入建議。",
      actionIntervene: "主動介入",
      actionSuggest: "追問建議",
      actionQualityAlert: "品質警告",
      manualQuestion: "手動提問",
      manualQuestionPlaceholder: "主動詢問助理解釋、補充或提供追問建議。",
      manualQuestionHint: "會依照目前情境與逐字稿內容，立即送出一次即時請求。",
      askNow: "立即提問",
      manualQuestionEmpty: "請先輸入提問內容。",
      manualQuestionSending: "正在送出手動提問...",
      manualQuestionUnavailable: "請先填入 Gemini API 金鑰後再使用手動提問。",
      waitingForSpeech: "等待語音輸入。",
      aiNotes: "AI 筆記",
      markdownLectureNotes: "Markdown 講座筆記",
      ready: "已就緒。",
      preview: "預覽",
      defaultNotes: "# Lecture Title\n\nDate\n\n## Lecture Summary\n\n筆記會顯示在這裡。",
      settingsTitle: "設定",
      apiConfiguration: "API 設定",
      close: "關閉",
      azureSpeechApiKey: "Azure Speech API 金鑰",
      pasteAzureSpeechKey: "貼上 Azure Speech 金鑰",
      azureRegion: "Azure 區域",
      geminiApiKey: "Gemini API 金鑰",
      pasteGeminiKey: "貼上 Gemini 金鑰",
      preferredProcessingLanguage: "課堂主要語言",
      preferredProcessingLanguagePlaceholder: "留空則自動偵測，例如 en-US 或 zh-TW",
      recognitionLanguages: "辨識語言（自動偵測）",
      segmentIntervalFallback: "分段後備間隔（分鐘）",
      keysSource: "金鑰可來自瀏覽器儲存或 config/local-config.js。",
      reset: "重設",
      saveSettings: "儲存設定",
      noTermsDetectedYet: "尚未偵測到技術名詞",
      noDocumentsUploaded: "尚未上傳任何文件。",
      noLecturesSavedYet: "尚未儲存任何講座。",
      notesReady: "筆記已完成",
      transcriptOnly: "僅有逐字稿",
      transcriptWillAppear: "逐字稿會隨著講座進行顯示於此。",
      configureAzureFirst: "請先設定 Azure Speech 憑證。",
      configureGeminiFirst: "請先設定 Gemini API 金鑰。",
      transcriptEmpty: "逐字稿為空，請先錄音或載入講座。",
      listening: "聆聽中",
      listeningLowVolume: "聆聽中 - 輸入音量偏低",
      listeningHighNoise: "聆聽中 - 背景噪音偏高",
      listeningClipping: "聆聽中 - 輸入音量過高",
      lowInputVolumeWarning: "目前輸入音量偏低，請靠近麥克風或提高輸入音量。",
      highBackgroundNoiseWarning: "目前背景噪音偏高，請移動到較安靜的環境或降低附近噪音。",
      inputClippingWarning: "目前輸入音量過高，請稍微遠離麥克風。",
      error: "錯誤",
      stopped: "已停止",
      lectureSavedLocally: "講座已儲存在本機。",
      preparingReferenceContext: "正在整理參考內容",
      generationFailed: "產生失敗",
      addedReferenceDocuments: "已加入 {count} 份參考文件。",
      settingsSavedLocally: "設定已儲存在本機。",
      settingsReset: "設定已重設。",
      stopCurrentRecordingFirst: "開始新講座前，請先停止目前錄音。",
      stopRecordingBeforeSwitching: "切換講座前，請先停止錄音。",
      recoveredDraft: "已從 {time} 復原草稿。錄音需要手動重新開始。",
      draftAutosavedAt: "草稿已於 {time} 自動儲存。",
    },
  };

  function formatMessage(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => (values && values[key] !== undefined ? values[key] : ""));
  }

  function formatDate(value, language) {
    if (!value) {
      return language === "zh-TW" ? MESSAGES["zh-TW"].noSessionLoaded : MESSAGES.en.noSessionLoaded;
    }
    return new Date(value).toLocaleString(language === "zh-TW" ? "zh-TW" : "en-US");
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
    currentLanguage: "en",
    sidebarExpandedWidth: null,

    init() {
      this.refs = {
        appTitle: document.querySelector("aside p.text-xs.font-semibold.uppercase"),
        sessionsTitle: document.querySelector("aside h1"),
        historyList: document.getElementById("historyList"),
        recoveryTitle: document.querySelector("#recoveryMessage").previousElementSibling,
        recoveryMessage: document.getElementById("recoveryMessage"),
        backupHelp: document.getElementById("backupHelp"),
        exportDataButton: document.getElementById("exportDataButton"),
        importDataButton: document.getElementById("importDataButton"),
        importDataInput: document.getElementById("importDataInput"),
        liveTranscriptLabel: document.getElementById("lectureTitleDisplay").previousElementSibling,
        transcriptContainer: document.getElementById("transcriptContainer"),
        notesContainer: document.getElementById("notesContainer"),
        termList: document.getElementById("termList"),
        partialTranscript: document.getElementById("partialTranscript"),
        speechStatus: document.getElementById("speechStatus"),
        notesStatus: document.getElementById("notesStatus"),
        lectureTitleDisplay: document.getElementById("lectureTitleDisplay"),
        lectureMetaDate: document.getElementById("lectureMetaDate"),
        lectureMetaDuration: document.getElementById("lectureMetaDuration"),
        lectureTitleLabel: document.querySelector("#lectureTitleInput").previousElementSibling,
        lectureTitleInput: document.getElementById("lectureTitleInput"),
        courseNameLabel: document.querySelector("#courseNameInput").previousElementSibling,
        courseNameInput: document.getElementById("courseNameInput"),
        lectureTopicLabel: document.querySelector("#lectureTopicInput").previousElementSibling,
        lectureTopicInput: document.getElementById("lectureTopicInput"),
        additionalContextLabel: document.querySelector("#additionalContextInput").previousElementSibling,
        additionalContextInput: document.getElementById("additionalContextInput"),
        interfaceLanguageLabel: document.querySelector("#interfaceLanguageSelect").previousElementSibling,
        interfaceLanguageSelect: document.getElementById("interfaceLanguageSelect"),
        mediaInput: document.getElementById("mediaInput"),
        mediaUploadTitle: document.getElementById("mediaUploadTitle"),
        mediaUploadHelp: document.getElementById("mediaUploadHelp"),
        mediaUploadLabel: document.getElementById("mediaUploadLabel"),
        mediaUploadButtonText: document.getElementById("mediaUploadButtonText"),
        mediaUploadStatus: document.getElementById("mediaUploadStatus"),
        documentInput: document.getElementById("documentInput"),
        documentUploadButtonText: document.getElementById("documentUploadButtonText"),
        documentList: document.getElementById("documentList"),
        referenceDocumentsTitle: document.querySelector("#documentList").previousElementSibling.querySelector("p.text-xs.font-semibold.uppercase"),
        referenceDocumentsHelp: document.querySelector("#documentList").previousElementSibling.querySelector("p.mt-2.text-sm.leading-6"),
        technicalTermsTitle: document.querySelector("#termList").previousElementSibling,
        partialRecognitionTitle: document.querySelector("#partialTranscript").previousElementSibling,
        interventionPanelLabel: document.getElementById("interventionPanelLabel"),
        interventionStatus: document.getElementById("interventionStatus"),
        interventionScenarioBadge: document.getElementById("interventionScenarioBadge"),
        manualQuestionForm: document.getElementById("manualQuestionForm"),
        manualQuestionLabel: document.getElementById("manualQuestionLabel"),
        manualQuestionInput: document.getElementById("manualQuestionInput"),
        manualQuestionHint: document.getElementById("manualQuestionHint"),
        manualQuestionButton: document.getElementById("manualQuestionButton"),
        interventionList: document.getElementById("interventionList"),
        startButton: document.getElementById("startButton"),
        stopButton: document.getElementById("stopButton"),
        generateNotesButton: document.getElementById("generateNotesButton"),
        settingsButton: document.getElementById("settingsButton"),
        newLectureButton: document.getElementById("newLectureButton"),
        sidebarSettingsButton: document.getElementById("sidebarSettingsButton"),
        expandSidebarButton: document.getElementById("expandSidebarButton"),
        collapsedExpandButton: document.getElementById("collapsedExpand"),
        compactHistoryList: document.getElementById("compactHistoryList"),
        settingsDialog: document.getElementById("settingsDialog"),
        settingsForm: document.getElementById("settingsForm"),
        closeSettingsButton: document.getElementById("closeSettingsButton"),
        resetSettingsButton: document.getElementById("resetSettingsButton"),
        saveSettingsButton: document.getElementById("saveSettingsButton"),
        azureKeyInput: document.getElementById("azureKeyInput"),
        azureRegionInput: document.getElementById("azureRegionInput"),
        geminiKeyInput: document.getElementById("geminiKeyInput"),
        preferredProcessingLanguageInput: document.getElementById("preferredProcessingLanguageInput"),
        interventionEnabledInput: document.getElementById("interventionEnabledInput"),
        assistantScenarioInput: document.getElementById("assistantScenarioInput"),
        interventionPauseInput: document.getElementById("interventionPauseInput"),
        interventionSensitivityInput: document.getElementById("interventionSensitivityInput"),
        recognitionLanguagesInput: document.getElementById("recognitionLanguagesInput"),
        segmentIntervalInput: document.getElementById("segmentIntervalInput"),
        settingsLanguageInput: document.getElementById("settingsLanguageInput"),
        toastContainer: document.getElementById("toastContainer"),
        aiNotesLabel: document.querySelector("section:nth-of-type(2) header p.text-xs.font-semibold.uppercase"),
        aiNotesTitle: document.querySelector("section:nth-of-type(2) header h2"),
        previewTitle: document.querySelector("#notesContainer").previousElementSibling,
        settingsTitle: document.querySelector("#settingsDialog p.text-xs.font-semibold.uppercase"),
        settingsSubtitle: document.querySelector("#settingsDialog h2"),
        azureKeyLabel: document.querySelector("#azureKeyInput").previousElementSibling,
        azureRegionLabel: document.querySelector("#azureRegionInput").previousElementSibling,
        geminiKeyLabel: document.querySelector("#geminiKeyInput").previousElementSibling,
        preferredProcessingLanguageLabel: document.querySelector("#preferredProcessingLanguageInput").previousElementSibling,
        interventionEnabledLabel: document.getElementById("interventionEnabledLabel"),
        interventionEnabledHelp: document.getElementById("interventionEnabledHelp"),
        assistantScenarioLabel: document.getElementById("assistantScenarioLabel"),
        interventionPauseLabel: document.getElementById("interventionPauseLabel"),
        interventionSensitivityLabel: document.getElementById("interventionSensitivityLabel"),
        interventionSensitivityHelp: document.getElementById("interventionSensitivityHelp"),
        recognitionLanguagesLabel: document.querySelector("#recognitionLanguagesInput").previousElementSibling,
        segmentIntervalLabel: document.querySelector("#segmentIntervalInput").previousElementSibling,
        settingsLanguageLabel: document.querySelector("#settingsLanguageInput").previousElementSibling,
        settingsFooterText: document.querySelector("#settingsDialog .border-t p.text-sm.text-steel"),
      };

      return this.refs;
    },

    t(key, values) {
      const languagePack = MESSAGES[this.currentLanguage] || MESSAGES.en;
      const fallback = MESSAGES.en[key] || key;
      const template = languagePack[key] || fallback;
      return values ? formatMessage(template, values) : template;
    },

    setLanguage(language) {
      this.currentLanguage = language === "zh-TW" ? "zh-TW" : "en";
      document.documentElement.lang = this.currentLanguage;
      document.title = this.t("appTitle");

      this.refs.appTitle.textContent = this.t("appTitle");
      this.refs.sessionsTitle.textContent = this.t("sessions");
      this.refs.newLectureButton.textContent = this.t("new");
      if (this.refs.sidebarSettingsButton) {
        this.refs.sidebarSettingsButton.title = this.t("settings");
        this.refs.sidebarSettingsButton.setAttribute("aria-label", this.t("settings"));
      }
      this.refs.recoveryTitle.textContent = this.t("recovery");
      this.refs.backupHelp.textContent = this.t("backupHelp");
      this.refs.exportDataButton.textContent = this.t("exportData");
      this.refs.importDataButton.textContent = this.t("importData");
      this.refs.liveTranscriptLabel.textContent = this.t("liveTranscript");
      this.refs.startButton.textContent = this.t("startRecording");
      this.refs.stopButton.textContent = this.t("stopRecording");
      this.refs.generateNotesButton.textContent = this.t("generateNotes");
      this.refs.settingsButton.textContent = this.t("settings");
      this.refs.lectureTitleLabel.textContent = this.t("lectureTitle");
      this.refs.lectureTitleInput.placeholder = this.t("lectureTitlePlaceholder");
      this.refs.courseNameLabel.textContent = this.t("courseName");
      this.refs.courseNameInput.placeholder = this.t("courseNamePlaceholder");
      this.refs.lectureTopicLabel.textContent = this.t("lectureTopic");
      this.refs.lectureTopicInput.placeholder = this.t("lectureTopicPlaceholder");
      this.refs.interfaceLanguageLabel.textContent = this.t("interfaceLanguage");
      this.refs.additionalContextLabel.textContent = this.t("additionalContext");
      this.refs.additionalContextInput.placeholder = this.t("additionalContextPlaceholder");
      this.refs.referenceDocumentsTitle.textContent = this.t("referenceDocuments");
      this.refs.referenceDocumentsHelp.textContent = this.t("referenceDocumentsHelp");
      this.refs.documentUploadButtonText.textContent = this.t("upload");
      this.refs.mediaUploadTitle.textContent = this.t("uploadedMedia");
      this.refs.mediaUploadHelp.textContent = this.t("uploadedMediaHelp");
      this.refs.mediaUploadButtonText.textContent = this.t("upload");
      this.refs.technicalTermsTitle.textContent = this.t("detectedTechnicalTerms");
      this.refs.partialRecognitionTitle.textContent = this.t("partialRecognition");
      this.refs.interventionPanelLabel.textContent = this.t("liveInterventionAssistant");
      this.refs.manualQuestionLabel.textContent = this.t("manualQuestion");
      this.refs.manualQuestionInput.placeholder = this.t("manualQuestionPlaceholder");
      this.refs.manualQuestionHint.textContent = this.t("manualQuestionHint");
      this.refs.manualQuestionButton.textContent = this.t("askNow");
      this.refs.aiNotesLabel.textContent = this.t("aiNotes");
      this.refs.aiNotesTitle.textContent = this.t("markdownLectureNotes");
      this.refs.previewTitle.textContent = this.t("preview");
      this.refs.settingsTitle.textContent = this.t("settingsTitle");
      this.refs.settingsSubtitle.textContent = this.t("apiConfiguration");
      this.refs.closeSettingsButton.textContent = this.t("close");
      this.refs.azureKeyLabel.textContent = this.t("azureSpeechApiKey");
      this.refs.azureKeyInput.placeholder = this.t("pasteAzureSpeechKey");
      this.refs.azureRegionLabel.textContent = this.t("azureRegion");
      this.refs.geminiKeyLabel.textContent = this.t("geminiApiKey");
      this.refs.geminiKeyInput.placeholder = this.t("pasteGeminiKey");
      this.refs.preferredProcessingLanguageLabel.textContent = this.t("preferredProcessingLanguage");
      this.refs.preferredProcessingLanguageInput.placeholder = this.t("preferredProcessingLanguagePlaceholder");
      this.refs.interventionEnabledLabel.textContent = this.t("interventionEnabled");
      this.refs.interventionEnabledHelp.textContent = this.t("interventionEnabledHelp");
      this.refs.assistantScenarioLabel.textContent = this.t("interventionScenario");
      this.refs.assistantScenarioInput.options[0].textContent = this.t("scenarioClassroom");
      this.refs.assistantScenarioInput.options[1].textContent = this.t("scenarioInterview");
      this.refs.interventionPauseLabel.textContent = this.t("interventionPauseThreshold");
      this.refs.interventionSensitivityLabel.textContent = this.t("interventionSensitivity");
      this.refs.interventionSensitivityHelp.textContent = this.t("interventionSensitivityHelp");
      this.refs.recognitionLanguagesLabel.textContent = this.t("recognitionLanguages");
      this.refs.segmentIntervalLabel.textContent = this.t("segmentIntervalFallback");
      this.refs.settingsLanguageLabel.textContent = this.t("interfaceLanguage");
      this.refs.settingsFooterText.textContent = this.t("keysSource");
      this.refs.resetSettingsButton.textContent = this.t("reset");
      this.refs.saveSettingsButton.textContent = this.t("saveSettings");

      if (this.refs.expandSidebarButton) {
        this.refs.expandSidebarButton.title = this.currentLanguage === "zh-TW" ? "展開或收合側邊欄" : "Expand or collapse sidebar";
        this.refs.expandSidebarButton.setAttribute("aria-label", this.currentLanguage === "zh-TW" ? "收合側邊欄" : "Collapse sidebar");
      }
      if (this.refs.collapsedExpandButton) {
        this.refs.collapsedExpandButton.title = this.currentLanguage === "zh-TW" ? "展開側邊欄" : "Expand sidebar";
        this.refs.collapsedExpandButton.setAttribute("aria-label", this.refs.collapsedExpandButton.title);
      }
      const collapsedNewLecture = document.getElementById("collapsedNewLecture");
      const collapsedSettings = document.getElementById("collapsedSettings");
      if (collapsedNewLecture) {
        collapsedNewLecture.title = this.currentLanguage === "zh-TW" ? "新增講座" : "New lecture";
        collapsedNewLecture.setAttribute("aria-label", collapsedNewLecture.title);
      }
      if (collapsedSettings) {
        collapsedSettings.title = this.t("settings");
        collapsedSettings.setAttribute("aria-label", this.t("settings"));
      }

      if (!this.refs.mediaUploadStatus.dataset.hasMedia || this.refs.mediaUploadStatus.dataset.hasMedia === "false") {
        this.refs.mediaUploadStatus.textContent = this.t("noMediaSelected");
      }

      if (!this.refs.partialTranscript.textContent || this.refs.partialTranscript.textContent === MESSAGES.en.waitingForSpeech || this.refs.partialTranscript.textContent === MESSAGES["zh-TW"].waitingForSpeech) {
        this.refs.partialTranscript.textContent = this.t("waitingForSpeech");
      }

      if (!this.refs.notesStatus.textContent || this.refs.notesStatus.textContent === MESSAGES.en.ready || this.refs.notesStatus.textContent === MESSAGES["zh-TW"].ready) {
        this.refs.notesStatus.textContent = this.t("ready");
      }

      if (!this.refs.speechStatus.textContent || this.refs.speechStatus.textContent === MESSAGES.en.idle || this.refs.speechStatus.textContent === MESSAGES["zh-TW"].idle) {
        this.refs.speechStatus.textContent = this.t("idle");
      }

      if (!this.refs.interventionStatus.textContent || this.refs.interventionStatus.textContent === MESSAGES.en.interventionIdle || this.refs.interventionStatus.textContent === MESSAGES["zh-TW"].interventionIdle) {
        this.refs.interventionStatus.textContent = this.t("interventionIdle");
      }

      this.setInterventionScenario(this.refs.assistantScenarioInput.value || "classroom");
    },

    bindHandlers(handlers) {
      this.refs.startButton.addEventListener("click", handlers.onStart);
      this.refs.stopButton.addEventListener("click", handlers.onStop);
      this.refs.generateNotesButton.addEventListener("click", handlers.onGenerateNotes);
      this.refs.settingsButton.addEventListener("click", () => this.openSettings());
      this.refs.sidebarSettingsButton.addEventListener("click", () => this.openSettings());
      this.refs.closeSettingsButton.addEventListener("click", () => this.closeSettings());
      this.refs.newLectureButton.addEventListener("click", handlers.onNewLecture);
      this.refs.exportDataButton.addEventListener("click", handlers.onExportData);
      this.refs.importDataButton.addEventListener("click", () => {
        this.refs.importDataInput.value = "";
        this.refs.importDataInput.click();
      });
      this.refs.importDataInput.addEventListener("change", handlers.onImportData);
      this.refs.mediaInput.addEventListener("change", handlers.onMediaUpload);
      this.refs.documentInput.addEventListener("change", handlers.onDocumentUpload);
      this.refs.settingsForm.addEventListener("submit", handlers.onSaveSettings);
      this.refs.resetSettingsButton.addEventListener("click", handlers.onResetSettings);
      this.refs.manualQuestionForm.addEventListener("submit", handlers.onManualQuestion);

      [
        this.refs.lectureTitleInput,
        this.refs.courseNameInput,
        this.refs.lectureTopicInput,
        this.refs.additionalContextInput,
        this.refs.interfaceLanguageSelect,
      ].forEach((element) => {
        element.addEventListener("input", handlers.onLectureMetadataChange);
      });

      // Sidebar expand/collapse
      const sidebar = document.getElementById("sidebar");
      const expandBtn = this.refs.expandSidebarButton;
      expandBtn && expandBtn.addEventListener("click", () => {
        this.setSidebarCollapsed(!sidebar.classList.contains("collapsed"));
      });

      const collapsedNewLecture = document.getElementById("collapsedNewLecture");
      const collapsedSettings = document.getElementById("collapsedSettings");
      if (collapsedNewLecture) {
        collapsedNewLecture.addEventListener("click", handlers.onNewLecture);
      }
      if (collapsedSettings) collapsedSettings.addEventListener("click", () => {
        this.setSidebarCollapsed(false);
        this.openSettings();
      });
      if (this.refs.collapsedExpandButton) this.refs.collapsedExpandButton.addEventListener("click", () => {
        this.setSidebarCollapsed(false);
      });

      const setupResizer = (resizerId, leftId, rightId, minLeft, minRight) => {
        const resizer = document.getElementById(resizerId);
        const left = document.getElementById(leftId);
        const right = document.getElementById(rightId);
        let dragging = false;
        let startX = 0;
        let startLeftWidth = 0;
        let startRightWidth = 0;
        resizer.addEventListener("mousedown", (e) => {
          dragging = true;
          startX = e.clientX;
          startLeftWidth = left.offsetWidth;
          startRightWidth = right.offsetWidth;
          document.body.style.cursor = "ew-resize";
        });
        document.addEventListener("mousemove", (e) => {
          if (!dragging) return;
          const dx = e.clientX - startX;
          if (resizerId === "resizer-sidebar") {
            this.setSidebarCollapsed(false);
            let newWidth = Math.max(minLeft, startLeftWidth + dx);
            this.sidebarExpandedWidth = newWidth;
            left.style.maxWidth = newWidth + "px";
            left.style.minWidth = newWidth + "px";
            left.style.width = newWidth + "px";
          } else {
            const newLeft = Math.max(minLeft, startLeftWidth + dx);
            const newRight = Math.max(minRight, startRightWidth - dx);
            left.style.flexBasis = newLeft + "px";
            right.style.flexBasis = newRight + "px";
          }
        });
        document.addEventListener("mouseup", () => {
          if (dragging) {
            dragging = false;
            document.body.style.cursor = "";
          }
        });
      };
      setupResizer("resizer-sidebar", "sidebar", "mainArea", 220, 300);
      setupResizer("resizer-notes", "transcriptSection", "notesSection", 240, 240);

      window.addEventListener("resize", () => {
        if (window.innerWidth < 1024) {
          this.setSidebarCollapsed(false);
        }
      });
    },

    setSidebarCollapsed(collapsed) {
      const sidebar = document.getElementById("sidebar");
      if (!sidebar) {
        return;
      }

      if (window.innerWidth < 1024) {
        sidebar.classList.remove("collapsed");
        sidebar.style.width = "";
        sidebar.style.minWidth = "";
        sidebar.style.maxWidth = "";
        if (this.refs.expandSidebarButton) {
          this.refs.expandSidebarButton.setAttribute("aria-pressed", "false");
          this.refs.expandSidebarButton.setAttribute("aria-label", this.currentLanguage === "zh-TW" ? "側邊欄" : "Sidebar");
        }
        if (this.refs.collapsedExpandButton) {
          this.refs.collapsedExpandButton.setAttribute("aria-pressed", "false");
        }
        return;
      }

      if (collapsed) {
        if (!sidebar.classList.contains("collapsed")) {
          this.sidebarExpandedWidth = sidebar.offsetWidth || this.sidebarExpandedWidth || 320;
        }
        sidebar.classList.add("collapsed");
        sidebar.style.width = "";
        sidebar.style.minWidth = "";
        sidebar.style.maxWidth = "";
      } else {
        sidebar.classList.remove("collapsed");
        const width = this.sidebarExpandedWidth || 320;
        sidebar.style.width = `${width}px`;
        sidebar.style.minWidth = `${width}px`;
        sidebar.style.maxWidth = `${width}px`;
      }

      if (this.refs.expandSidebarButton) {
        this.refs.expandSidebarButton.setAttribute("aria-pressed", collapsed ? "true" : "false");
        this.refs.expandSidebarButton.title = collapsed ? (this.currentLanguage === "zh-TW" ? "展開側邊欄" : "Expand sidebar") : (this.currentLanguage === "zh-TW" ? "收合側邊欄" : "Collapse sidebar");
        this.refs.expandSidebarButton.setAttribute("aria-label", collapsed ? (this.currentLanguage === "zh-TW" ? "展開側邊欄" : "Expand sidebar") : (this.currentLanguage === "zh-TW" ? "收合側邊欄" : "Collapse sidebar"));
      }
      if (this.refs.collapsedExpandButton) {
        this.refs.collapsedExpandButton.setAttribute("aria-pressed", collapsed ? "true" : "false");
        this.refs.collapsedExpandButton.title = this.currentLanguage === "zh-TW" ? "展開側邊欄" : "Expand sidebar";
        this.refs.collapsedExpandButton.setAttribute("aria-label", this.refs.collapsedExpandButton.title);
      }
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
      this.refs.preferredProcessingLanguageInput.value = settings.preferredProcessingLanguage || "";
      this.refs.interventionEnabledInput.checked = settings.interventionEnabled !== false;
      this.refs.assistantScenarioInput.value = settings.assistantScenario || "classroom";
      this.refs.interventionPauseInput.value = settings.interventionPauseMs || 1500;
      this.refs.interventionSensitivityInput.value = settings.interventionSensitivity || 7;
      this.refs.recognitionLanguagesInput.value = (settings.recognitionLanguages || []).join(", ");
      this.refs.segmentIntervalInput.value = settings.segmentIntervalMinutes || 3;
      this.refs.settingsLanguageInput.value = settings.interfaceLanguage || "en";
      this.refs.interfaceLanguageSelect.value = settings.interfaceLanguage || "en";
      this.setLanguage(settings.interfaceLanguage || "en");
    },

    getSettingsFormData() {
      return {
        azureKey: this.refs.azureKeyInput.value.trim(),
        azureRegion: this.refs.azureRegionInput.value.trim(),
        geminiKey: this.refs.geminiKeyInput.value.trim(),
        preferredProcessingLanguage: this.refs.preferredProcessingLanguageInput.value.trim(),
        interventionEnabled: this.refs.interventionEnabledInput.checked,
        assistantScenario: this.refs.assistantScenarioInput.value,
        interventionPauseMs: Number(this.refs.interventionPauseInput.value),
        interventionSensitivity: Number(this.refs.interventionSensitivityInput.value),
        recognitionLanguages: this.refs.recognitionLanguagesInput.value,
        segmentIntervalMinutes: Number(this.refs.segmentIntervalInput.value),
        interfaceLanguage: this.refs.settingsLanguageInput.value,
      };
    },

    setInterventionStatus(message) {
      this.refs.interventionStatus.textContent = message || this.t("interventionIdle");
    },

    setManualQuestionBusy(isBusy) {
      this.refs.manualQuestionInput.disabled = Boolean(isBusy);
      this.refs.manualQuestionButton.disabled = Boolean(isBusy);
      this.refs.manualQuestionButton.classList.toggle("opacity-60", Boolean(isBusy));
      this.refs.manualQuestionButton.classList.toggle("cursor-not-allowed", Boolean(isBusy));
    },

    getManualQuestion() {
      return this.refs.manualQuestionInput.value.trim();
    },

    clearManualQuestion() {
      this.refs.manualQuestionInput.value = "";
    },

    setInterventionScenario(scenario) {
      this.refs.interventionScenarioBadge.textContent = scenario === "interview" ? this.t("scenarioInterview") : this.t("scenarioClassroom");
    },

    renderInterventions(interventions) {
      if (!interventions || !interventions.length) {
        this.refs.interventionList.innerHTML = `<p class="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-500">${window.TranscriptProcessor.escapeHtml(this.t("noInterventionsYet"))}</p>`;
        return;
      }

      const locale = this.currentLanguage === "zh-TW" ? "zh-TW" : "en-US";
      this.refs.interventionList.innerHTML = interventions
        .map((item) => {
          // 移除 QUALITY_ALERT 顯示
          if (item.action === "QUALITY_ALERT") {
            return "";
          }
          const actionLabel = item.action === "SUGGEST"
            ? this.t("actionSuggest")
            : this.t("actionIntervene");
          const toneClass = item.action === "SUGGEST"
            ? "border-sky-200 bg-sky-50"
            : "border-emerald-200 bg-emerald-50";

          return `
            <article class="rounded-2xl border px-4 py-3 ${toneClass}">
              <div class="flex items-center justify-between gap-3">
                <span class="rounded-full border border-current/15 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700">[ACTION: ${window.TranscriptProcessor.escapeHtml(item.action || "INTERVENE")}] ${window.TranscriptProcessor.escapeHtml(actionLabel)}</span>
                <span class="text-xs text-zinc-500">${window.TranscriptProcessor.escapeHtml(new Date(item.createdAt || Date.now()).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }))}</span>
              </div>
              ${item.userQuestion ? `<p class="mt-3 rounded-2xl border border-zinc-200 bg-white/80 px-3 py-2 text-xs leading-5 text-zinc-600">${window.TranscriptProcessor.escapeHtml(item.userQuestion)}</p>` : ""}
              <p class="mt-3 text-sm leading-6 text-zinc-800">${window.TranscriptProcessor.escapeHtml(item.message || "")}</p>
            </article>
          `;
        })
        .join("");
    },

    setRecordingState(isRecording) {
      this.refs.startButton.disabled = isRecording;
      this.refs.stopButton.disabled = !isRecording;
    },

    setSpeechStatus(message) {
      const reconnectMatch = /^Reconnecting in (\d+)s$/i.exec(message || "");
      if (reconnectMatch) {
        this.refs.speechStatus.textContent = this.currentLanguage === "zh-TW" ? `${reconnectMatch[1]} 秒後重新連線` : `Reconnecting in ${reconnectMatch[1]}s`;
        return;
      }

      const known = {
        Listening: this.t("listening"),
        Idle: this.t("idle"),
        Error: this.t("error"),
        Stopped: this.t("stopped"),
        Reconnected: this.currentLanguage === "zh-TW" ? "已重新連線" : "Reconnected",
        "Session stopped.": this.currentLanguage === "zh-TW" ? "工作階段已停止" : "Session stopped.",
      };

      if (known[message]) {
        this.refs.speechStatus.textContent = known[message];
        return;
      }

      if ((message || "").startsWith("Canceled:")) {
        this.refs.speechStatus.textContent = this.currentLanguage === "zh-TW" ? `已取消：${message.slice("Canceled:".length).trim()}` : message;
        return;
      }

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
        this.refs.termList.innerHTML = `<span class="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500">${window.TranscriptProcessor.escapeHtml(this.t("noTermsDetectedYet"))}</span>`;
        return;
      }

      this.refs.termList.innerHTML = terms
        .map((term) => `<span class="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-zinc-700">${window.TranscriptProcessor.escapeHtml(term)}</span>`)
        .join("");
    },

    renderPartial(text) {
      this.refs.partialTranscript.textContent = text || this.t("waitingForSpeech");
    },

    renderNotes(markdown) {
      const source = markdown || this.t("defaultNotes");

      if (!window.marked || !window.DOMPurify) {
        this.refs.notesContainer.textContent = source;
        return;
      }

      const rendered = window.marked.parse(source, {
        breaks: true,
        gfm: true,
      });

      const sanitized = window.DOMPurify.sanitize(rendered, {
        USE_PROFILES: { html: true },
      });

      this.refs.notesContainer.innerHTML = sanitized;
    },

    renderDocuments(documents) {
      if (!documents || !documents.length) {
        this.refs.documentList.innerHTML = `<p class="text-sm text-zinc-500">${window.TranscriptProcessor.escapeHtml(this.t("noDocumentsUploaded"))}</p>`;
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

    renderUploadedMedia(media, statusOverride) {
      if (statusOverride) {
        this.refs.mediaUploadStatus.textContent = statusOverride;
        this.refs.mediaUploadStatus.dataset.hasMedia = media ? "true" : "false";
        return;
      }

      if (!media) {
        this.refs.mediaUploadStatus.textContent = this.t("noMediaSelected");
        this.refs.mediaUploadStatus.dataset.hasMedia = "false";
        return;
      }

      const baseLabel = this.t("selectedMedia", { name: media.name || "" });
      const details = [];
      if (media.size) {
        details.push(formatBytes(media.size));
      }
      if (media.durationMs) {
        details.push(formatDuration(media.durationMs));
      }

      this.refs.mediaUploadStatus.textContent = details.length ? `${baseLabel} (${details.join(", ")})` : baseLabel;
      this.refs.mediaUploadStatus.dataset.hasMedia = "true";
    },

    setMediaUploadBusy(isBusy) {
      this.refs.mediaInput.disabled = Boolean(isBusy);
      this.refs.mediaUploadLabel.classList.toggle("opacity-60", Boolean(isBusy));
      this.refs.mediaUploadLabel.classList.toggle("cursor-not-allowed", Boolean(isBusy));
      this.refs.mediaUploadLabel.classList.toggle("cursor-pointer", !isBusy);
    },

    renderLectureSummary(lecture, isRecording) {
      const title = (lecture && lecture.title) || this.t("untitledLecture");
      const date = lecture && lecture.date ? lecture.date : null;
      const duration = lecture && typeof lecture.durationMs === "number" ? lecture.durationMs : 0;

      this.refs.lectureTitleDisplay.textContent = title;
      this.refs.lectureMetaDate.textContent = formatDate(date, this.currentLanguage);
      this.refs.lectureMetaDuration.textContent = formatDuration(duration);
      this.setRecordingState(Boolean(isRecording));
    },

    renderHistory(lectures, activeLectureId, onSelect) {
      if (!lectures.length) {
        this.refs.historyList.innerHTML = `<div class="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">${window.TranscriptProcessor.escapeHtml(this.t("noLecturesSavedYet"))}</div>`;
        if (this.refs.compactHistoryList) {
          this.refs.compactHistoryList.innerHTML = `<div class="text-center text-[11px] leading-4 text-zinc-400">${window.TranscriptProcessor.escapeHtml(this.currentLanguage === "zh-TW" ? "尚無" : "Empty")}</div>`;
        }
        return;
      }

      this.refs.historyList.innerHTML = lectures
        .map(
          (lecture) => `
            <button data-lecture-id="${lecture.id}" data-active="${lecture.id === activeLectureId}" class="history-card w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-steel">${formatDate(lecture.date, this.currentLanguage)}</p>
              <h3 class="mt-2 text-base font-semibold text-zinc-900">${window.TranscriptProcessor.escapeHtml(lecture.title || this.t("untitledLecture"))}</h3>
              <div class="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <span>${formatDuration(lecture.durationMs || 0)}</span>
                <span>•</span>
                <span>${lecture.notes ? this.t("notesReady") : this.t("transcriptOnly")}</span>
              </div>
            </button>
          `
        )
        .join("");

      if (this.refs.compactHistoryList) {
        this.refs.compactHistoryList.innerHTML = lectures
          .map((lecture) => {
            const title = lecture.title || this.t("untitledLecture");
            const initials = title
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("") || "L";
            return `<button data-compact-lecture-id="${lecture.id}" data-active="${lecture.id === activeLectureId}" class="sidebar-compact-history-btn" title="${window.TranscriptProcessor.escapeHtml(title)}">${window.TranscriptProcessor.escapeHtml(initials)}</button>`;
          })
          .join("");
      }

      this.refs.historyList.querySelectorAll("[data-lecture-id]").forEach((button) => {
        button.addEventListener("click", () => onSelect(button.getAttribute("data-lecture-id")));
      });

      if (this.refs.compactHistoryList) {
        this.refs.compactHistoryList.querySelectorAll("[data-compact-lecture-id]").forEach((button) => {
          button.addEventListener("click", () => onSelect(button.getAttribute("data-compact-lecture-id")));
        });
      }
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