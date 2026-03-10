(function () {
  const DEFAULT_SENSITIVITY = 7;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function countWords(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function normalizeScenario(value) {
    return value === "interview" ? "interview" : "classroom";
  }

  function normalizeSensitivity(value) {
    return clamp(Math.round(Number(value) || DEFAULT_SENSITIVITY), 1, 10);
  }

  function normalizeRange(value, min, max) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    if (max <= min) {
      return value >= max ? 1 : 0;
    }

    return clamp((value - min) / (max - min), 0, 1);
  }

  function invertRange(value, min, max) {
    return 1 - normalizeRange(value, min, max);
  }

  function buildFallbackMessage(trigger, language) {
    const isZh = language === "zh-TW";

    if (trigger.reason === "prosody-urgency") {
      return trigger.action === "SUGGEST"
        ? isZh
          ? "[ACTION: SUGGEST]\n語氣明顯變急，適合立刻追問一個具體實作細節或限制條件。"
          : "[ACTION: SUGGEST]\nThe speaker's tone became urgent. A single concrete follow-up about implementation details or constraints is warranted now."
        : isZh
          ? "[ACTION: INTERVENE]\n語氣明顯變急，現在適合立即補一個關鍵定義或步驟，避免理解落差擴大。"
          : "[ACTION: INTERVENE]\nThe speaker's tone became urgent. This is a good moment to add one key definition or step before the gap widens.";
    }

    if (trigger.reason === "prosody-strain") {
      return trigger.action === "SUGGEST"
        ? isZh
          ? "[ACTION: SUGGEST]\n語調顯得吃力且不穩，適合追問一個較小且可驗證的細節。"
          : "[ACTION: SUGGEST]\nThe tone sounds strained and unstable. Ask one smaller, verifiable follow-up next."
        : isZh
          ? "[ACTION: INTERVENE]\n語調顯得吃力且不穩，建議先補上最核心的概念，再繼續往下。"
          : "[ACTION: INTERVENE]\nThe tone sounds strained and unstable. Add the core concept first before continuing.";
    }

    return trigger.action === "SUGGEST"
      ? isZh
        ? "[ACTION: SUGGEST]\n語氣偏猶豫，適合補一個精準追問，確認對方是否真的掌握重點。"
        : "[ACTION: SUGGEST]\nThe tone sounds uncertain. Add one precise follow-up to verify whether the key idea is really understood."
      : isZh
        ? "[ACTION: INTERVENE]\n語氣偏猶豫，現在適合主動補一個簡短釐清，先把核心概念講清楚。"
        : "[ACTION: INTERVENE]\nThe tone sounds uncertain. This is a good point to offer a short clarification of the core concept.";
  }

  function summarizeTrigger(reason, language) {
    const isZh = language === "zh-TW";

    if (reason === "prosody-urgency") {
      return isZh ? "語氣急促" : "urgent tone";
    }

    if (reason === "prosody-strain") {
      return isZh ? "語調吃力" : "strained tone";
    }

    return isZh ? "語氣猶豫" : "uncertain tone";
  }

  function describeProsody(prosody, utteranceDurationMs, latestUtterance) {
    const safeProsody = prosody || {};
    const durationMs = Number(safeProsody.speechDurationMs) || Number(utteranceDurationMs) || 0;
    const wordCount = countWords(latestUtterance);
    const speechRateWpm = durationMs > 0
      ? Math.round((wordCount / (durationMs / 60000)) * 10) / 10
      : 0;

    return {
      speechDurationMs: durationMs,
      wordCount,
      speechRateWpm,
      pitchMeanHz: Number(safeProsody.pitchMeanHz) || 0,
      pitchStdDevHz: Number(safeProsody.pitchStdDevHz) || 0,
      pitchConfidence: Number(safeProsody.pitchConfidence) || 0,
      rmsMean: Number(safeProsody.rmsMean) || 0,
      rmsStdDev: Number(safeProsody.rmsStdDev) || 0,
      peakMean: Number(safeProsody.peakMean) || 0,
      zeroCrossingMean: Number(safeProsody.zeroCrossingMean) || 0,
      voicedFrameRatio: Number(safeProsody.voicedFrameRatio) || 0,
    };
  }

  function scoreProsody(summary, silenceMs) {
    const uncertaintyScore = (
      invertRange(summary.speechRateWpm, 105, 185) * 0.18 +
      normalizeRange(summary.pitchStdDevHz, 18, 70) * 0.27 +
      normalizeRange(summary.rmsStdDev, 0.01, 0.055) * 0.16 +
      invertRange(summary.pitchConfidence, 0.45, 0.82) * 0.14 +
      normalizeRange(summary.zeroCrossingMean, 0.04, 0.16) * 0.1 +
      normalizeRange(silenceMs, 1100, 2600) * 0.15
    );

    const urgencyScore = (
      normalizeRange(summary.speechRateWpm, 150, 245) * 0.24 +
      normalizeRange(summary.pitchMeanHz, 155, 285) * 0.18 +
      normalizeRange(summary.pitchStdDevHz, 24, 82) * 0.2 +
      normalizeRange(summary.peakMean, 0.22, 0.7) * 0.2 +
      normalizeRange(summary.rmsMean, 0.03, 0.14) * 0.1 +
      normalizeRange(summary.voicedFrameRatio, 0.45, 0.95) * 0.08
    );

    const strainScore = (
      normalizeRange(summary.rmsStdDev, 0.012, 0.06) * 0.22 +
      normalizeRange(summary.pitchStdDevHz, 20, 78) * 0.22 +
      normalizeRange(summary.zeroCrossingMean, 0.05, 0.2) * 0.14 +
      invertRange(summary.voicedFrameRatio, 0.5, 0.92) * 0.16 +
      invertRange(summary.pitchConfidence, 0.42, 0.85) * 0.12 +
      normalizeRange(summary.speechDurationMs, 1800, 8200) * 0.14
    );

    return {
      uncertaintyScore: Math.round(uncertaintyScore * 1000) / 1000,
      urgencyScore: Math.round(urgencyScore * 1000) / 1000,
      strainScore: Math.round(strainScore * 1000) / 1000,
    };
  }

  const LocalProsodyService = {
    DEFAULT_SENSITIVITY,

    normalizeSensitivity,

    analyze(input) {
      const scenario = normalizeScenario(input && input.scenario);
      const interfaceLanguage = input && input.interfaceLanguage;
      const sensitivity = normalizeSensitivity(input && input.interventionSensitivity);
      const silenceMs = Number(input && input.silenceMs) || 0;
      const summary = describeProsody(input && input.prosody, input && input.utteranceDurationMs, input && input.latestUtterance);

      if (summary.speechDurationMs < 900 || summary.wordCount < 3) {
        return { shouldIntervene: false, scenario };
      }

      const scores = scoreProsody(summary, silenceMs);
      const threshold = clamp(0.78 - ((sensitivity - 5) * 0.045), 0.5, 0.86);
      const best = [
        { reason: "prosody-confusion", score: scores.uncertaintyScore },
        { reason: "prosody-urgency", score: scores.urgencyScore },
        { reason: "prosody-strain", score: scores.strainScore },
      ].sort((left, right) => right.score - left.score)[0];

      if (!best || best.score < threshold) {
        return {
          shouldIntervene: false,
          scenario,
          score: best ? best.score : 0,
          threshold,
          prosodySummary: summary,
        };
      }

      const action = scenario === "interview" ? "SUGGEST" : "INTERVENE";
      return {
        shouldIntervene: true,
        scenario,
        reason: best.reason,
        action,
        score: best.score,
        threshold,
        sensitivity,
        prosodySummary: summary,
        triggerLabel: summarizeTrigger(best.reason, interfaceLanguage),
        localResponse: buildFallbackMessage({ reason: best.reason, action }, interfaceLanguage),
      };
    },
  };

  window.LocalProsodyService = LocalProsodyService;
})();