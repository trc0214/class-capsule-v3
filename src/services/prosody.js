(function () {
  const DEFAULT_SENSITIVITY = 7;

  const TEXT_SIGNAL_GROUPS = [
    {
      tag: "remembering-retrieval",
      label: { "zh-TW": "知識記憶檢索", en: "knowledge recall" },
      weight: 3.5,
      defaultAction: "INTERVENE",
      keywords: [
        "誰知道", "誰知到", "定義", "定意", "定義是", "定義為", "是什麼", "是什麽", "列出", "列舉", "列出來",
        "在哪裡", "在那裡", "哪裡", "哪兒", "還記得", "還記得嗎", "記得嗎", "名稱", "名字", "描述", "敘述",
        "說明", "標記", "標籤", "identify", "label", "recall", "remember", "who", "what", "where", "list",
        "define", "name", "describe", "wut", "wat"
      ],
      patterns: [
        /有沒有人知道|有人知道|誰知道|還記得嗎|記不記得/i,
        /does anyone know|who knows|do you remember|remember this/i,
      ],
    },
    {
      tag: "understanding-clarification",
      label: { "zh-TW": "理解澄清", en: "clarification" },
      weight: 3.0,
      defaultAction: "SUGGEST",
      keywords: [
        "為什麼", "為什麽", "解釋", "解釋一下", "總結", "總結一下", "區別", "區分", "分辨", "意思",
        "意義", "有沒有問題", "有問題嗎", "聽得懂嗎", "聽懂嗎", "換句話說", "換個說法", "換種說法",
        "why", "explain", "summarize", "distinguish", "interpret", "paraphrase", "does that make sense",
        "in other words"
      ],
      patterns: [
        /為什麼|為什麽|解釋|總結|區別|換句話說|聽得懂嗎|有沒有問題/i,
        /does that make sense|in other words|can you explain|could you explain/i,
      ],
    },
    {
      tag: "applying-scaffolding",
      label: { "zh-TW": "應用引導", en: "scaffolding" },
      weight: 4.5,
      defaultAction: "INTERVENE",
      keywords: [
        "如何使用", "怎麼用", "怎麼使用", "用法", "舉例來說", "舉例子", "舉例", "舉個例子", "試試看",
        "試一下", "如果是", "怎麼解決", "怎麼辦", "怎麼做", "怎麼處理", "應用", "操作", "操作一下",
        "how would you use", "how to use", "give an example", "try this", "what if", "solve", "demonstrate",
        "illustrate", "example", "exmaple", "exmple", "exapmle", "examlpe", "exampel", "exaple"
      ],
      patterns: [
        /舉例|舉個例子|試試看|怎麼解決|怎麼辦|怎麼做|應用|操作/i,
        /how (?:would you )?use|give an example|what if|solve|demonstrate|illustrate/i,
      ],
    },
    {
      tag: "analyzing-probing",
      label: { "zh-TW": "分析探問", en: "analysis" },
      weight: 5.0,
      defaultAction: "INTERVENE",
      keywords: [
        "關聯性", "關聯", "相關性", "比較", "比對", "分析", "分析一下", "假設", "假如", "假定", "證據",
        "證明", "理由", "原因", "看法", "意見", "有沒有其他可能", "還有其他可能", "connection", "compare",
        "contrast", "analyze", "assumption", "evidence", "perspectives", "is there another way"
      ],
      patterns: [
        /關聯|比較|分析|假設|證據|理由|有沒有其他可能/i,
        /compare|contrast|analyze|assumption|evidence|another way/i,
      ],
    },
    {
      tag: "discourse-marker",
      label: { "zh-TW": "語言組織停頓", en: "discourse hesitation" },
      weight: 2.0,
      defaultAction: "SUGGEST",
      keywords: [
        "呃", "嗯", "那個", "其實", "也就是說", "所以", "我想想", "可能是", "呃...", "嗯...", "uhm",
        "uh", "umm", "well", "actually", "basically", "i mean", "let me think", "so", "maybe"
      ],
      patterns: [
        /呃|嗯|那個|我想想|可能是/i,
        /uhm|uh|umm|well|actually|basically|i mean|let me think/i,
      ],
    },
    {
      tag: "question-intent",
      label: { "zh-TW": "提問意圖", en: "question intent" },
      weight: 2.4,
      defaultAction: "INTERVENE",
      keywords: [
        "?", "？", "問題", "能不能", "能不能夠", "加分", "舉手", "回答", "can you", "could you", "would you",
        "question", "how", "what", "when", "where", "who"
      ],
      patterns: [
        /[?？]/,
        /問題|能不能|加分|舉手|回答/i,
        /\bquestion\b|\bcan you\b|\bcould you\b|\bwould you\b|\bhow\b|\bwhat\b|\bwhen\b|\bwhere\b|\bwho\b/i,
      ],
    },
  ];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function pushUnique(list, value) {
    if (value && !list.includes(value)) {
      list.push(value);
    }
  }

  function countWords(text) {
    const normalized = String(text || "").trim();
    if (!normalized) {
      return 0;
    }

    const cjkMatches = normalized.match(/[\u3400-\u9fff]/g) || [];
    const latinMatches = normalized.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];
    const cjkTokenEstimate = Math.ceil(cjkMatches.length / 2);
    return cjkTokenEstimate + latinMatches.length;
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

    if (trigger.reason === "classroom-recall") {
      return trigger.action === "SUGGEST"
        ? isZh
          ? "[ACTION: SUGGEST]\n這段像是在確認學生是否記得舊知識，適合立刻追問定義、用途或代表例子。"
          : "[ACTION: SUGGEST]\nThis sounds like a recall check. Ask for the definition, use case, or a canonical example next."
        : isZh
          ? "[ACTION: INTERVENE]\n這段像是在確認學生是否記得舊知識，現在適合先補上核心定義，再接代表性例子。"
          : "[ACTION: INTERVENE]\nThis sounds like a recall check. Add the core definition first, then the canonical example.";
    }

    if (trigger.reason === "classroom-prompt") {
      return trigger.action === "SUGGEST"
        ? isZh
          ? "[ACTION: SUGGEST]\n這段像是在拋給全班作答的情境題，適合立刻追問對方的選擇理由與風險取捨。"
          : "[ACTION: SUGGEST]\nThis sounds like a whole-class scenario prompt. Ask for the reasoning behind the choice and the trade-offs next."
        : isZh
          ? "[ACTION: INTERVENE]\n這段像是在拋給全班作答的情境題，現在適合先整理選項，再補上判斷依據。"
          : "[ACTION: INTERVENE]\nThis sounds like a whole-class scenario prompt. Organize the choices first, then add the decision criteria.";
    }

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

    if (trigger.reason === "keyword-signal") {
      if (trigger.strongestSignalTag === "remembering-retrieval") {
        return isZh
          ? "[ACTION: INTERVENE]\n這裡像是在回想知識點，先補核心名詞或定義。"
          : "[ACTION: INTERVENE]\nThis sounds like recall. Add the core term or definition first.";
      }

      if (trigger.strongestSignalTag === "understanding-clarification") {
        return isZh
          ? "[ACTION: SUGGEST]\n這裡適合換個說法，先用更直白的比喻補充。"
          : "[ACTION: SUGGEST]\nA simpler paraphrase or analogy would help here.";
      }

      if (trigger.strongestSignalTag === "applying-scaffolding") {
        return isZh
          ? "[ACTION: INTERVENE]\n這裡像是要應用概念，先提示一條可行解題路徑。"
          : "[ACTION: INTERVENE]\nThis looks like an application step. Offer one workable path forward.";
      }

      if (trigger.strongestSignalTag === "analyzing-probing") {
        return isZh
          ? "[ACTION: INTERVENE]\n這裡適合補一組對比觀點，幫助往下分析。"
          : "[ACTION: INTERVENE]\nAdd one contrast or counterpoint to support deeper analysis.";
      }

      return trigger.action === "SUGGEST"
        ? isZh
          ? "[ACTION: SUGGEST]\n這裡像是在提問，適合補一個關鍵提示。"
          : "[ACTION: SUGGEST]\nThis sounds like a question. Add one key hint."
        : isZh
          ? "[ACTION: INTERVENE]\n這裡像是在提問，先補最重要的線索。"
          : "[ACTION: INTERVENE]\nThis sounds like a question. Add the most important clue first.";
    }

    return trigger.action === "SUGGEST"
      ? isZh
        ? "[ACTION: SUGGEST]\n語氣偏猶豫，適合補一個精準追問，確認對方是否真的掌握重點。"
        : "[ACTION: SUGGEST]\nThe tone sounds uncertain. Add one precise follow-up to verify whether the key idea is really understood."
      : isZh
        ? "[ACTION: INTERVENE]\n語氣偏猶豫，現在適合主動補一個簡短釐清，先把核心概念講清楚。"
        : "[ACTION: INTERVENE]\nThe tone sounds uncertain. This is a good point to offer a short clarification of the core concept.";
  }

  function summarizeTrigger(reason, language, strongestSignalTag) {
    const isZh = language === "zh-TW";

    if (reason === "classroom-recall") {
      return isZh ? "課堂回想提問" : "classroom recall";
    }

    if (reason === "classroom-prompt") {
      return isZh ? "課堂拋問" : "classroom prompt";
    }

    if (reason === "prosody-urgency") {
      return isZh ? "語氣急促" : "urgent tone";
    }

    if (reason === "prosody-strain") {
      return isZh ? "語調吃力" : "strained tone";
    }

    if (reason === "keyword-signal") {
      const labels = {
        "remembering-retrieval": isZh ? "知識回想訊號" : "knowledge recall signal",
        "understanding-clarification": isZh ? "概念澄清訊號" : "clarification signal",
        "applying-scaffolding": isZh ? "應用引導訊號" : "scaffolding signal",
        "analyzing-probing": isZh ? "分析探問訊號" : "analysis signal",
        "discourse-marker": isZh ? "語言組織停頓" : "hesitation signal",
        "question-intent": isZh ? "提問意圖訊號" : "question intent signal",
      };

      return labels[strongestSignalTag] || (isZh ? "文字訊號" : "text signal");
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

  function countMatches(text, patterns) {
    return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
  }

  function scoreClassroomPrompt(latestUtterance, summary, silenceMs) {
    const text = String(latestUtterance || "").trim();
    if (!text) {
      return { promptScore: 0, promptSignals: [] };
    }

    const normalized = text.toLowerCase();
    const signals = [];

    const audienceScore = countMatches(normalized, [/同學/, /各位/, /大家/, /class/, /everyone/, /anyone/]);
    if (audienceScore) {
      signals.push("audience-address");
    }

    const hypotheticalScore = countMatches(normalized, [/如果/, /假如/, /假設/, /if today/, /if you/, /imagine/]);
    if (hypotheticalScore) {
      signals.push("hypothetical");
    }

    const choiceScore = countMatches(normalized, [
      /哪一個|哪個|哪種|哪邊/,
      /會想用|選哪|怎麼選/,
      /或者是說|或是說|還是說|或者|還是/,
      /which one|which would|what would you choose|choose/,
    ]);
    if (choiceScore) {
      signals.push("choice");
    }

    const roleScore = countMatches(normalized, [
      /如果你是/, /你是老闆/, /今天你有/, /站在.*角度/, /as the boss/, /if you were the owner/, /if you were the manager/,
    ]);
    if (roleScore) {
      signals.push("role-play");
    }

    const questionLikeScore = countMatches(normalized, [
      /\?/, /嗎|呢|喔|哦/, /會不會|要不要|可不可以/, /what do you think|would you|do you think/,
    ]);
    if (questionLikeScore) {
      signals.push("question-like");
    }

    const repetitionBoost = normalizeRange(summary.wordCount, 12, 48) * 0.1;
    const pauseBoost = normalizeRange(silenceMs, 900, 2200) * 0.12;

    const promptScore = clamp(
      audienceScore * 0.16 +
      hypotheticalScore * 0.2 +
      choiceScore * 0.24 +
      roleScore * 0.24 +
      questionLikeScore * 0.1 +
      repetitionBoost +
      pauseBoost,
      0,
      1
    );

    return {
      promptScore: Math.round(promptScore * 1000) / 1000,
      promptSignals: signals,
    };
  }

  function scoreClassroomRecall(latestUtterance, summary, silenceMs) {
    const text = String(latestUtterance || "").trim();
    if (!text) {
      return { recallScore: 0, recallSignals: [] };
    }

    const normalized = text.toLowerCase();
    const signals = [];

    const memoryCheckScore = countMatches(normalized, [
      /有沒有人知道/, /有人知道/, /還記得嗎/, /記不記得/, /知道嗎/, /想一下/, /誰知道/, /does anyone know/, /who knows/, /do you remember/, /remember this/,
    ]);
    if (memoryCheckScore) {
      signals.push("memory-check");
    }

    const priorCourseScore = countMatches(normalized, [
      /一定學過/, /我一定也講過/, /以前講過/, /之前講過/, /修過演算法/, /上次上過/, /課本看過/, /you learned this/, /you saw this before/, /we covered this/, /you took algorithms/,
    ]);
    if (priorCourseScore) {
      signals.push("prior-knowledge");
    }

    const conceptPromptScore = countMatches(normalized, [
      /叫做/, /最有名/, /代表/, /是什麼/, /哪一個/, /舉例/, /定義/, /called/, /most famous/, /example/, /definition/, /what is/,
    ]);
    if (conceptPromptScore) {
      signals.push("concept-prompt");
    }

    const hesitationBoost = countMatches(normalized, [/嗯|欸|那個/, /uh|um|well/]) ? 0.06 : 0;
    const durationBoost = normalizeRange(summary.speechDurationMs, 2500, 9000) * 0.08;
    const pauseBoost = normalizeRange(silenceMs, 900, 2200) * 0.12;

    const recallScore = clamp(
      memoryCheckScore * 0.28 +
      priorCourseScore * 0.28 +
      conceptPromptScore * 0.18 +
      hesitationBoost +
      durationBoost +
      pauseBoost,
      0,
      1
    );

    return {
      recallScore: Math.round(recallScore * 1000) / 1000,
      recallSignals: signals,
    };
  }

  function inspectTextSignals(input) {
    const latestUtterance = String(input && input.latestUtterance ? input.latestUtterance : "").trim();
    const silenceMs = Number(input && input.silenceMs) || 0;
    if (!latestUtterance) {
      return {
        matchedKeywords: [],
        matchedGroups: [],
        scenarioTags: [],
        hasQuestionIntent: false,
        keywordBoost: 0,
        urgencyScore: 0,
        totalKeywordScore: 0,
        strongestSignalTag: null,
      };
    }

    const normalized = latestUtterance.toLowerCase();
    const matchedKeywords = [];
    const matchedGroups = [];
    const scenarioTags = [];
    let rawScore = 0;
    let strongestGroup = null;

    TEXT_SIGNAL_GROUPS.forEach((group) => {
      let matched = false;

      group.keywords.forEach((keyword) => {
        if (normalized.includes(String(keyword).toLowerCase())) {
          matched = true;
          pushUnique(matchedKeywords, keyword);
        }
      });

      group.patterns.forEach((pattern) => {
        if (pattern.test(normalized)) {
          matched = true;
        }
      });

      if (!matched) {
        return;
      }

      pushUnique(matchedGroups, group.tag);
      pushUnique(scenarioTags, group.tag);
      rawScore += group.weight;

      if (!strongestGroup || group.weight > strongestGroup.weight) {
        strongestGroup = group;
      }
    });

    let urgencyScore = 0;
    if (silenceMs > 2000) {
      urgencyScore += 0.08;
    }
    if (silenceMs > 5000) {
      urgencyScore += 0.1;
    }

    const keywordBoost = rawScore > 0 ? clamp(0.08 + rawScore * 0.045, 0, 0.38) : 0;
    const totalKeywordScore = Math.round((rawScore + urgencyScore * 10) * 1000) / 1000;

    return {
      matchedKeywords,
      matchedGroups,
      scenarioTags,
      hasQuestionIntent: matchedGroups.includes("question-intent"),
      keywordBoost: Math.round(keywordBoost * 1000) / 1000,
      urgencyScore: Math.round(urgencyScore * 1000) / 1000,
      totalKeywordScore,
      strongestSignalTag: strongestGroup ? strongestGroup.tag : null,
      strongestSignalAction: strongestGroup ? strongestGroup.defaultAction : null,
    };
  }

  function decorateTriggerWithTextSignals(trigger, textSignals, interfaceLanguage) {
    const decorated = {
      ...trigger,
      keywordBoost: textSignals.keywordBoost,
      questionKeywords: textSignals.matchedKeywords,
      urgencyScore: textSignals.urgencyScore,
      scenarioTags: textSignals.scenarioTags,
      totalKeywordScore: textSignals.totalKeywordScore,
      strongestSignalTag: textSignals.strongestSignalTag,
    };

    if (!textSignals.matchedKeywords.length) {
      return decorated;
    }

    const threshold = typeof decorated.threshold === "number" ? decorated.threshold : 0.58;
    const weightedScore = clamp((Number(decorated.score) || 0) + textSignals.keywordBoost + textSignals.urgencyScore, 0, 1);

    if (decorated.shouldIntervene) {
      decorated.score = Math.max(Number(decorated.score) || 0, weightedScore);
      return decorated;
    }

    const shouldPromote = weightedScore >= Math.max(0.24, threshold - 0.08);
    if (!shouldPromote) {
      decorated.score = weightedScore;
      decorated.threshold = threshold;
      return decorated;
    }

    const action = decorated.scenario === "interview"
      ? "SUGGEST"
      : (textSignals.strongestSignalAction || "INTERVENE");

    return {
      ...decorated,
      shouldIntervene: true,
      reason: "keyword-signal",
      action,
      score: Math.max(weightedScore, threshold),
      threshold,
      triggerLabel: summarizeTrigger("keyword-signal", interfaceLanguage, textSignals.strongestSignalTag),
      localResponse: buildFallbackMessage({
        reason: "keyword-signal",
        action,
        strongestSignalTag: textSignals.strongestSignalTag,
      }, interfaceLanguage),
      bypassCooldown: Boolean(textSignals.hasQuestionIntent || textSignals.strongestSignalTag === "applying-scaffolding"),
    };
  }

  const LocalProsodyService = {
    DEFAULT_SENSITIVITY,

    normalizeSensitivity,

    inspectTextSignals,

    analyze(input) {
      const scenario = normalizeScenario(input && input.scenario);
      const interfaceLanguage = input && input.interfaceLanguage;
      const sensitivity = normalizeSensitivity(input && input.interventionSensitivity);
      const silenceMs = Number(input && input.silenceMs) || 0;
      const summary = describeProsody(input && input.prosody, input && input.utteranceDurationMs, input && input.latestUtterance);
      const prompt = scenario === "classroom"
        ? scoreClassroomPrompt(input && input.latestUtterance, summary, silenceMs)
        : { promptScore: 0, promptSignals: [] };
      const recall = scenario === "classroom"
        ? scoreClassroomRecall(input && input.latestUtterance, summary, silenceMs)
        : { recallScore: 0, recallSignals: [] };
      const textSignals = inspectTextSignals({
        latestUtterance: input && input.latestUtterance,
        silenceMs,
      });

      const threshold = clamp(0.78 - ((sensitivity - 5) * 0.045), 0.5, 0.86);
      const promptThreshold = clamp(0.72 - ((sensitivity - 5) * 0.05), 0.42, 0.82);
      const recallThreshold = clamp(0.62 - ((sensitivity - 5) * 0.05), 0.38, 0.74);

      if (scenario === "classroom" && recall.recallScore >= recallThreshold) {
        return decorateTriggerWithTextSignals({
          shouldIntervene: true,
          scenario,
          reason: "classroom-recall",
          action: "INTERVENE",
          score: recall.recallScore,
          threshold: recallThreshold,
          sensitivity,
          prosodySummary: summary,
          textSignals: recall.recallSignals,
          triggerLabel: summarizeTrigger("classroom-recall", interfaceLanguage),
          localResponse: buildFallbackMessage({ reason: "classroom-recall", action: "INTERVENE" }, interfaceLanguage),
        }, textSignals, interfaceLanguage);
      }

      if (scenario === "classroom" && prompt.promptScore >= promptThreshold) {
        return decorateTriggerWithTextSignals({
          shouldIntervene: true,
          scenario,
          reason: "classroom-prompt",
          action: "INTERVENE",
          score: prompt.promptScore,
          threshold: promptThreshold,
          sensitivity,
          prosodySummary: summary,
          textSignals: prompt.promptSignals,
          triggerLabel: summarizeTrigger("classroom-prompt", interfaceLanguage),
          localResponse: buildFallbackMessage({ reason: "classroom-prompt", action: "INTERVENE" }, interfaceLanguage),
        }, textSignals, interfaceLanguage);
      }

      const scores = scoreProsody(summary, silenceMs);
      const best = [
        { reason: "prosody-confusion", score: scores.uncertaintyScore },
        { reason: "prosody-urgency", score: scores.urgencyScore },
        { reason: "prosody-strain", score: scores.strainScore },
      ].sort((left, right) => right.score - left.score)[0];

      const action = scenario === "interview" ? "SUGGEST" : "INTERVENE";
      const baseTrigger = (summary.speechDurationMs < 900 || summary.wordCount < 4 || !best || best.score < threshold)
        ? {
            shouldIntervene: false,
            scenario,
            score: best ? best.score : 0,
            threshold,
            sensitivity,
            prosodySummary: summary,
            textSignals: prompt.promptSignals.concat(recall.recallSignals),
          }
        : {
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

      return decorateTriggerWithTextSignals(baseTrigger, textSignals, interfaceLanguage);
    },
  };

  window.LocalProsodyService = LocalProsodyService;
})();