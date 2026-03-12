(function () {
  const MAX_HISTORY_ITEMS = 12;
  // 擴充多場景與容錯關鍵字表
  // 五大場景分類與權重
  const KEYWORD_WEIGHTS = {
    // 1. 知識記憶與檢索 (3.5)
    "誰知道": 3.5, "誰知到": 3.5, "誰知到": 3.5, "誰知到": 3.5, // speech typo
    "定義": 3.5, "定意": 3.5, "定義是": 3.5, "定義為": 3.5,
    "是什麼": 3.5, "是什麽": 3.5, "是什麼呢": 3.5, "是什麼啊": 3.5, "是什麼東西": 3.5,
    "列出": 3.5, "列舉": 3.5, "列舉出": 3.5, "列出來": 3.5,
    "在哪裡": 3.5, "在那裡": 3.5, "在什麼地方": 3.5, "哪裡": 3.5, "哪兒": 3.5,
    "還記得": 3.5, "還記得嗎": 3.5, "記得嗎": 3.5, "記得": 3.5,
    "名稱": 3.5, "名字": 3.5, "名詞": 3.5,
    "描述": 3.5, "敘述": 3.5, "說明": 3.5, "標記": 3.5, "標籤": 3.5,
    "identify": 3.5, "id": 3.5, "label": 3.5, "recall": 3.5, "remember": 3.5,
    "who": 3.5, "who's": 3.5, "what": 3.5, "wut": 3.5, "wat": 3.5, "where": 3.5, "list": 3.5, "define": 3.5, "name": 3.5, "describe": 3.5,
    // 2. 理解與概念澄清 (3.0)
    "為什麼": 3.0, "為什麽": 3.0, "為什麼呢": 3.0, "為什麼啊": 3.0, "為什麼會": 3.0, "為什麼不": 3.0,
    "解釋": 3.0, "解釋一下": 3.0, "解釋下": 3.0, "解釋下來": 3.0, "解釋給我": 3.0,
    "總結": 3.0, "總結一下": 3.0, "總結下": 3.0, "總結來說": 3.0,
    "區別": 3.0, "區分": 3.0, "分別": 3.0, "分辨": 3.0,
    "意思": 3.0, "意義": 3.0, "意指": 3.0, "意圖": 3.0,
    "有沒有問題": 3.0, "有問題嗎": 3.0, "有問題": 3.0, "沒問題": 3.0,
    "聽得懂嗎": 3.0, "聽懂嗎": 3.0, "聽得懂": 3.0, "聽懂": 3.0,
    "換句話說": 3.0, "換個說法": 3.0, "換種說法": 3.0, "換句話": 3.0,
    "why": 3.0, "explain": 3.0, "summarize": 3.0, "distinguish": 3.0, "interpret": 3.0, "paraphrase": 3.0, "does that make sense": 3.0, "in other words": 3.0,
    // 3. 應用與案例引導 (4.5)
    "如何使用": 4.5, "怎麼用": 4.5, "怎麼使用": 4.5, "用法": 4.5, "舉例來說": 4.5, "舉例子": 4.5, "舉例": 4.5, "舉個例子": 4.5,
    "試試看": 4.5, "試試": 4.5, "試一下": 4.5, "試下": 4.5, "如果是": 4.5, "如果...的話": 4.5, "如果...呢": 4.5,
    "怎麼解決": 4.5, "怎麼辦": 4.5, "怎麼做": 4.5, "怎麼處理": 4.5, "應用": 4.5, "操作": 4.5, "操作一下": 4.5, "操作下": 4.5,
    "how would you use": 4.5, "how to use": 4.5, "give an example": 4.5, "try this": 4.5, "what if": 4.5, "solve": 4.5, "demonstrate": 4.5, "illustrate": 4.5,
    // 4. 分析與批判性思考 (5.0)
    "關聯性": 5.0, "關聯": 5.0, "相關性": 5.0, "相關": 5.0, "比較": 5.0, "比一比": 5.0, "比對": 5.0, "分析": 5.0, "分析一下": 5.0, "分析下": 5.0,
    "假設": 5.0, "假如": 5.0, "假定": 5.0, "證據": 5.0, "證明": 5.0, "理由": 5.0, "原因": 5.0, "看法": 5.0, "意見": 5.0, "有沒有其他可能": 5.0, "還有其他可能": 5.0,
    "connection": 5.0, "connections": 5.0, "compare": 5.0, "contrast": 5.0, "analyze": 5.0, "assumption": 5.0, "evidence": 5.0, "perspectives": 5.0, "is there another way": 5.0,
    // 5. 對話標記與猶豫填補 (2.0)
    "呃": 2.0, "嗯": 2.0, "那個": 2.0, "其實": 2.0, "也就是說": 2.0, "所以": 2.0, "我想想": 2.0, "可能是": 2.0, "呃...": 2.0, "嗯...": 2.0,
    "uhm": 2.0, "uh": 2.0, "well": 2.0, "actually": 2.0, "basically": 2.0, "i mean": 2.0, "let me think": 2.0, "so": 2.0, "maybe": 2.0,
    // typo/冗餘
    "exmaple": 3.5, "exmple": 3.5, "exapmle": 3.5, "examlpe": 3.5, "exampel": 3.5, "exaple": 3.5,
    "舉例子": 4.5, "舉例子": 4.5, "舉例子": 4.5, "舉例子": 4.5, "舉例子": 4.5,
    // 互動/加分
    "能不能": 2.0, "能不呢": 2.0, "能不": 2.0, "能不能夠": 2.0, "能不夠": 2.0,
    "加分": 2.0, "加分嗎": 2.0, "加分啊": 2.0, "加分呢": 2.0,
    "舉手": 2.0, "舉手嗎": 2.0, "舉手啊": 2.0, "舉手呢": 2.0,
    "回答": 2.0, "回答嗎": 2.0, "回答啊": 2.0, "回答呢": 2.0,
    // 一般問號
    "?": 1.0, "？": 1.0,
  };

  // regex patterns for fuzzy/partial match
  const QUESTION_SIGNAL_PATTERNS = [
    { label: "?", pattern: /[?？]/, weight: 1.0 },
    { label: "問題", pattern: /問題/, weight: 1.5 },
    { label: "example", pattern: /examp?le/i, weight: 2.0 },
    { label: "why", pattern: /為什麼|為什麽|why|how come/i, weight: 2.5 },
    { label: "想一下", pattern: /想一下|困住|卡住|不知道/i, weight: 3.0 },
    { label: "呃", pattern: /呃|umm|uh/i, weight: 1.5 },
    { label: "舉例", pattern: /舉例|舉例子/i, weight: 2.0 },
    { label: "互動", pattern: /能不能|加分|舉手|回答/i, weight: 1.2 },
    { label: "question", pattern: /\bquestion\b/i, weight: 1.5 },
    { label: "can you", pattern: /\bcan you\b/i, weight: 2.0 },
    { label: "could you", pattern: /\bcould you\b/i, weight: 2.0 },
    { label: "would you", pattern: /\bwould you\b/i, weight: 1.8 },
    { label: "how", pattern: /\bhow\b/i, weight: 1.5 },
    { label: "what", pattern: /\bwhat\b/i, weight: 1.5 },
    { label: "when", pattern: /\bwhen\b/i, weight: 1.2 },
    { label: "where", pattern: /\bwhere\b/i, weight: 1.2 },
    { label: "who", pattern: /\bwho\b/i, weight: 1.2 },
  ];

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

  function detectQuestionSignals(latestUtterance, silenceMs = 0) {
    const utterance = String(latestUtterance || "").trim();
    if (!utterance) {
      return {
        matchedKeywords: [],
        scoreBoost: 0,
        hasQuestionIntent: false,
        urgencyScore: 0,
        scenarioTags: [],
      };
    }

    const matchedKeywords = [];
    let scoreBoost = 0;
    let urgencyScore = 0;
    const scenarioTags = [];

    // 1. 關鍵字加權（精確 match）
    for (let kw in KEYWORD_WEIGHTS) {
      if (utterance.includes(kw)) {
        matchedKeywords.push(kw);
        scoreBoost += KEYWORD_WEIGHTS[kw];
        // 標註場景分類
        // 五大分類
        if (["誰知道","定義","是什麼","列出","在哪裡","還記得","名稱","描述","標記","identify","label","recall","who","what","where","list","define","name","describe"].includes(kw)) scenarioTags.push("remembering-retrieval");
        if (["為什麼","解釋","總結","區別","意思","有沒有問題","聽得懂嗎","換句話說","why","explain","summarize","distinguish","interpret","paraphrase","does that make sense","in other words"].includes(kw)) scenarioTags.push("understanding-clarification");
        if (["如何使用","舉例來說","試試看","如果是","怎麼解決","應用","操作","how would you use","give an example","try this","what if","solve","demonstrate","illustrate","舉例子"].includes(kw)) scenarioTags.push("applying-scaffolding");
        if (["關聯性","比較","分析","假設","證據","理由","看法","有沒有其他可能","connection","compare","contrast","analyze","assumption","evidence","perspectives","is there another way"].includes(kw)) scenarioTags.push("analyzing-probing");
        if (["呃","那個","其實","也就是說","所以","我想想","可能是","uhm","uh","well","actually","basically","i mean","let me think"].includes(kw)) scenarioTags.push("discourse-marker");
      }
    }

    // 2. 關鍵字加權（模糊 match）
    QUESTION_SIGNAL_PATTERNS.forEach((entry) => {
      if (entry.pattern.test(utterance)) {
        matchedKeywords.push(entry.label);
        scoreBoost += entry.weight;
        if (["example","舉例"].includes(entry.label)) scenarioTags.push("knowledge-extraction");
        if (["想一下","呃"].includes(entry.label)) scenarioTags.push("stuck-thinking");
      }
    });

    // 3. 沈默時長加權
    if (silenceMs > 2000) urgencyScore += 1.5;
    if (silenceMs > 5000) urgencyScore += 3.0;

    // 4. 總分計算
    const totalScore = Math.min(6.5, Math.round((scoreBoost + urgencyScore) * 1000) / 1000);

    return {
      matchedKeywords,
      scoreBoost: Math.min(4.5, Math.round(scoreBoost * 1000) / 1000),
      hasQuestionIntent: matchedKeywords.length > 0,
      urgencyScore,
      scenarioTags: Array.from(new Set(scenarioTags)),
      totalScore,
    };
  }

  function buildQuestionKeywordFallbackMessage(interfaceLanguage, scenario) {
    const isZh = interfaceLanguage === "zh-TW";

    if (scenario === "interview") {
      return isZh
        ? "[ACTION: SUGGEST]\n這裡像是在提問，可追問限制或具體例子。"
        : "[ACTION: SUGGEST]\nThis sounds like a question. Ask for the constraint or a concrete example.";
    }

    return isZh
      ? "[ACTION: INTERVENE]\n這裡像是在提問，我先補一個關鍵線索。"
      : "[ACTION: INTERVENE]\nThis sounds like a question. Here is the key point first.";
  }

  function applyQuestionKeywordWeight(trigger, questionSignals, interfaceLanguage) {
    if (!questionSignals.hasQuestionIntent) {
      return trigger;
    }

    const weightedScore = Math.min(1, (Number(trigger.score) || 0) + questionSignals.scoreBoost);
    const action = trigger.scenario === "interview" ? "SUGGEST" : "INTERVENE";

    if (trigger.shouldIntervene) {
      return {
        ...trigger,
        score: weightedScore,
        keywordBoost: questionSignals.scoreBoost,
        questionKeywords: questionSignals.matchedKeywords,
      };
    }

    const threshold = typeof trigger.threshold === "number" ? trigger.threshold : 0.58;
    if (weightedScore < Math.max(0.22, threshold - 0.08)) {
      return {
        ...trigger,
        score: weightedScore,
        threshold,
        keywordBoost: questionSignals.scoreBoost,
        questionKeywords: questionSignals.matchedKeywords,
      };
    }

    return {
      shouldIntervene: true,
      scenario: trigger.scenario,
      reason: "question-keyword",
      action,
      score: Math.max(weightedScore, threshold),
      threshold,
      triggerLabel: trigger.scenario === "interview"
        ? (interfaceLanguage === "zh-TW" ? "偵測到提問訊號" : "Question intent detected")
        : (interfaceLanguage === "zh-TW" ? "偵測到提問訊號" : "Question intent detected"),
      localResponse: buildQuestionKeywordFallbackMessage(interfaceLanguage, trigger.scenario),
      keywordBoost: questionSignals.scoreBoost,
      questionKeywords: questionSignals.matchedKeywords,
      prosodySummary: trigger.prosodySummary,
      bypassCooldown: true,
    };
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

    const questionSignals = detectQuestionSignals(input.latestUtterance, input.silenceMs);
    const baseTrigger = window.LocalProsodyService.analyze({
      scenario,
      interfaceLanguage: input.interfaceLanguage,
      latestUtterance: input.latestUtterance,
      prosody: input.prosody,
      utteranceDurationMs: input.utteranceDurationMs,
      silenceMs: input.silenceMs,
      interventionSensitivity: input.interventionSensitivity,
    });

    // urgencyScore 直接疊加到 prosody trigger
    const weightedTrigger = applyQuestionKeywordWeight(baseTrigger, questionSignals, input.interfaceLanguage);
    weightedTrigger.urgencyScore = questionSignals.urgencyScore;
    weightedTrigger.scenarioTags = questionSignals.scenarioTags;
    weightedTrigger.totalKeywordScore = questionSignals.totalScore;
    return weightedTrigger;
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
          keywordBoost: trigger.keywordBoost,
          questionKeywords: trigger.questionKeywords,
          urgencyScore: trigger.urgencyScore,
          scenarioTags: trigger.scenarioTags,
          totalKeywordScore: trigger.totalKeywordScore,
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
        const qSignals = detectQuestionSignals(question);
        questionKeywords: qSignals.matchedKeywords,
        urgencyScore: qSignals.urgencyScore,
        scenarioTags: qSignals.scenarioTags,
        totalKeywordScore: qSignals.totalScore,
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