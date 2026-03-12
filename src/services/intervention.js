(function () {
  const MAX_HISTORY_ITEMS = 12;

  function normalizeScenario(value) {
    return value === "interview" ? "interview" : "classroom";
  }

  function summarizeQualityIssue(issue, language) {
    const isZh = language === "zh-TW";

    if (issue === "low-volume") {
      return isZh
        ? "[ACTION: QUALITY_ALERT]\n目前音量偏低，請靠近麥克風後再繼續。"
        : "[ACTION: QUALITY_ALERT]\nInput volume is too low. Move closer to the microphone before continuing.";
    }

    if (issue === "high-noise") {
      return isZh
        ? "[ACTION: QUALITY_ALERT]\n背景噪音偏高，請先降低環境噪音，再進行語義介入。"
        : "[ACTION: QUALITY_ALERT]\nBackground noise is too high. Reduce environmental noise before semantic intervention.";
    }

    if (issue === "clipping") {
      return isZh
        ? "[ACTION: QUALITY_ALERT]\n輸入音量過高造成失真，請稍微遠離麥克風。"
        : "[ACTION: QUALITY_ALERT]\nThe input is clipping. Move slightly away from the microphone.";
    }

    return isZh
      ? "[ACTION: QUALITY_ALERT]\n目前音訊品質不穩定，暫不進行語義介入。"
      : "[ACTION: QUALITY_ALERT]\nAudio quality is unstable, so semantic intervention is paused.";
  }

  function buildRecentTranscript(transcript, latestUtterance) {
    const normalizedTranscript = String(transcript || "").trim();
    if (!normalizedTranscript) {
      return String(latestUtterance || "").trim();
    }

    return normalizedTranscript.slice(-1800);
  }

  function formatProsodySummary(prosody, interfaceLanguage) {
    if (!prosody) {
      return interfaceLanguage === "zh-TW" ? "無可用的本地語氣特徵。" : "No local prosody features were available.";
    }

    return [
      `Speech duration: ${Math.round(Number(prosody.speechDurationMs) || 0)} ms`,
      `Speech rate: ${Number(prosody.speechRateWpm) || 0} wpm`,
      `Pitch mean: ${Number(prosody.pitchMeanHz) || 0} Hz`,
      `Pitch variation: ${Number(prosody.pitchStdDevHz) || 0} Hz`,
      `Pitch confidence: ${Number(prosody.pitchConfidence) || 0}`,
      `Energy mean: ${Number(prosody.rmsMean) || 0}`,
      `Energy variation: ${Number(prosody.rmsStdDev) || 0}`,
      `Peak mean: ${Number(prosody.peakMean) || 0}`,
      `Voiced frame ratio: ${Number(prosody.voicedFrameRatio) || 0}`,
    ].join("\n");
  }

  function detectTrigger(input) {
    const scenario = normalizeScenario(input.scenario);

    if (input.qualityIssue) {
      return {
        shouldIntervene: true,
        localOnly: true,
        scenario,
        reason: "quality-warning",
        action: "QUALITY_ALERT",
      };
    }

    return window.LocalProsodyService.analyze({
      scenario,
      interfaceLanguage: input.interfaceLanguage,
      latestUtterance: input.latestUtterance,
      prosody: input.prosody,
      utteranceDurationMs: input.utteranceDurationMs,
      silenceMs: input.silenceMs,
      interventionSensitivity: input.interventionSensitivity,
    });
  }

  function normalizeModelResponse(rawResponse, trigger) {
    const raw = String(rawResponse || "").trim();
    if (!raw || /^SILENCE\s*$/i.test(raw)) {
      return null;
    }

    const actionMatch = raw.match(/^\[ACTION:\s*(INTERVENE|SUGGEST|NOTIFICATION|QUALITY_ALERT)\]\s*/i);
    const action = actionMatch ? actionMatch[1].toUpperCase() : trigger.action;
    const message = raw.replace(/^\[ACTION:[^\]]+\]\s*/i, "").trim();

    if (!message) {
      return null;
    }

    return {
      action,
      message,
      scenario: trigger.scenario,
      triggerReason: trigger.reason,
      source: trigger.localOnly ? "local" : "gemini",
    };
  }

  const InterventionService = {
    MAX_HISTORY_ITEMS,

    async evaluate(input) {
      const trigger = detectTrigger(input || {});

      if (!trigger.shouldIntervene) {
        return null;
      }

      if (trigger.localOnly) {
        return normalizeModelResponse(summarizeQualityIssue(input.qualityIssue, input.interfaceLanguage), trigger);
      }

      if (!input.geminiKey) {
        return normalizeModelResponse(trigger.localResponse, {
          ...trigger,
          localOnly: true,
        });
      }

      let rawResponse = "";
      try {
        rawResponse = await window.GeminiService.generateIntervention({
          geminiKey: input.geminiKey,
          preferredProcessingLanguage: input.preferredProcessingLanguage,
          interfaceLanguage: input.interfaceLanguage,
          scenario: trigger.scenario,
          triggerReason: trigger.reason,
          recommendedAction: trigger.action,
          latestUtterance: input.latestUtterance,
          recentTranscript: buildRecentTranscript(input.transcript, input.latestUtterance),
          lectureTitle: input.lectureTitle,
          courseName: input.courseName,
          topic: input.topic,
          additionalContext: input.additionalContext,
          detectedTerms: input.detectedTerms,
          detectedLanguage: input.detectedLanguage,
          pauseMs: input.pauseMs,
          silenceMs: input.silenceMs,
          triggerScore: trigger.score,
          triggerThreshold: trigger.threshold,
          prosodySummary: formatProsodySummary(trigger.prosodySummary || input.prosody, input.interfaceLanguage),
          triggerLabel: trigger.triggerLabel,
          interventionSensitivity: input.interventionSensitivity,
        });
      } catch (error) {
        console.warn("Gemini intervention fallback to local tone response", error);
      }

      const normalized = normalizeModelResponse(rawResponse, trigger);
      if (!normalized) {
        return normalizeModelResponse(trigger.localResponse, {
          ...trigger,
          localOnly: true,
        });
      }

      normalized.bypassCooldown = Boolean(trigger.bypassCooldown);
      normalized.triggerScore = trigger.score;
      return normalized;
    },

    async manualAsk(input) {
      const scenario = normalizeScenario(input && input.scenario);
      const question = String(input && input.question ? input.question : "").trim();

      if (!question) {
        return null;
      }

      const rawResponse = await window.GeminiService.generateIntervention({
        geminiKey: input.geminiKey,
        preferredProcessingLanguage: input.preferredProcessingLanguage,
        interfaceLanguage: input.interfaceLanguage,
        scenario,
        triggerReason: "manual-question",
        recommendedAction: scenario === "interview" ? "SUGGEST" : "INTERVENE",
        latestUtterance: question,
        recentTranscript: buildRecentTranscript(input.transcript, question),
        lectureTitle: input.lectureTitle,
        courseName: input.courseName,
        topic: input.topic,
        additionalContext: input.additionalContext,
        detectedTerms: input.detectedTerms,
        detectedLanguage: input.detectedLanguage,
        pauseMs: 0,
        silenceMs: 0,
      });

      const normalized = normalizeModelResponse(rawResponse, {
        action: scenario === "interview" ? "SUGGEST" : "INTERVENE",
        scenario,
        reason: "manual-question",
      });

      if (!normalized) {
        return null;
      }

      normalized.bypassCooldown = true;
      normalized.userQuestion = question;
      return normalized;
    },
  };

  window.InterventionService = InterventionService;
})();