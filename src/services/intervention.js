(function () {
  const DIRECT_INVOCATION_PATTERN = /\b(ai|assistant|copilot)\b|幫我|請你|請問你|可以幫我|能幫我|help me|can you|could you|what do you think/i;
  const CLASSROOM_QUESTION_PATTERN = /不懂|怎麼做|為什麼|請問|可以解釋|這是什麼|what is|why\b|how do|how does|i don't understand|can you explain/i;
  const HESITATION_PATTERN = /(^|\s)(呃|嗯|這個|那個|我想一下|well|uh|um|erm|let me think|maybe)(\s|$)/i;
  const INTERVIEW_IMPLEMENTATION_PATTERN = /實作|做過|開發過|設計過|implemented|built|designed|handled|optimized|scaled|debugged|migrated|architecture|concurrency|parallel|latency|edge case/i;
  const MAX_HISTORY_ITEMS = 12;

  function countWords(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

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

  function detectTrigger(input) {
    const scenario = normalizeScenario(input.scenario);
    const latestUtterance = String(input.latestUtterance || "").trim();
    const detectedTerms = Array.isArray(input.detectedTerms) ? input.detectedTerms.filter(Boolean) : [];
    const silenceMs = Number(input.silenceMs) || 0;
    const pauseMs = Number(input.pauseMs) || 1500;
    const pauseSatisfied = silenceMs >= Math.max(900, pauseMs - 150);
    const wordCount = countWords(latestUtterance);
    const hasDirectInvocation = DIRECT_INVOCATION_PATTERN.test(latestUtterance);
    const hasTechnicalGap = detectedTerms.length > 0;

    if (input.qualityIssue) {
      return {
        shouldIntervene: true,
        localOnly: true,
        scenario,
        reason: "quality-warning",
        action: "QUALITY_ALERT",
      };
    }

    if (!latestUtterance) {
      return { shouldIntervene: false, scenario };
    }

    if (hasDirectInvocation) {
      return {
        shouldIntervene: true,
        scenario,
        reason: "direct-invocation",
        action: scenario === "interview" ? "SUGGEST" : "INTERVENE",
        bypassCooldown: true,
      };
    }

    if (!pauseSatisfied) {
      return { shouldIntervene: false, scenario };
    }

    if (scenario === "classroom") {
      if (CLASSROOM_QUESTION_PATTERN.test(latestUtterance)) {
        return {
          shouldIntervene: true,
          scenario,
          reason: "classroom-question",
          action: "INTERVENE",
        };
      }

      if (hasTechnicalGap && (HESITATION_PATTERN.test(latestUtterance) || wordCount <= 14)) {
        return {
          shouldIntervene: true,
          scenario,
          reason: "semantic-gap",
          action: "INTERVENE",
        };
      }
    }

    if (scenario === "interview") {
      if (INTERVIEW_IMPLEMENTATION_PATTERN.test(latestUtterance) && wordCount <= 24) {
        return {
          shouldIntervene: true,
          scenario,
          reason: "interview-follow-up",
          action: "SUGGEST",
        };
      }

      if (hasTechnicalGap && wordCount <= 18) {
        return {
          shouldIntervene: true,
          scenario,
          reason: "technical-follow-up",
          action: "SUGGEST",
        };
      }
    }

    return { shouldIntervene: false, scenario };
  }

  function normalizeModelResponse(rawResponse, trigger) {
    const raw = String(rawResponse || "").trim();
    if (!raw || /^SILENCE\s*$/i.test(raw)) {
      return null;
    }

    const actionMatch = raw.match(/^\[ACTION:\s*(INTERVENE|SUGGEST|QUALITY_ALERT)\]\s*/i);
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

      const rawResponse = await window.GeminiService.generateIntervention({
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
      });

      const normalized = normalizeModelResponse(rawResponse, trigger);
      if (!normalized) {
        return null;
      }

      normalized.bypassCooldown = Boolean(trigger.bypassCooldown);
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