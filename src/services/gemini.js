(function () {
  const GEMINI_API_VERSION = "v1beta";
  const MODEL_PREFERENCES = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-pro"];
  let cachedModelName = null;

  function extractResponseText(payload) {
    const parts = payload && payload.candidates && payload.candidates[0] && payload.candidates[0].content && payload.candidates[0].content.parts;
    if (!parts) {
      return "";
    }

    return parts.map((part) => part.text || "").join("\n").trim();
  }

  function splitTranscript(transcript, maxChars) {
    const segments = [];
    let cursor = 0;

    while (cursor < transcript.length) {
      let end = Math.min(cursor + maxChars, transcript.length);
      if (end < transcript.length) {
        const nearestBreak = transcript.lastIndexOf("\n\n", end);
        if (nearestBreak > cursor + maxChars * 0.6) {
          end = nearestBreak;
        }
      }
      segments.push(transcript.slice(cursor, end).trim());
      cursor = end;
    }

    return segments.filter(Boolean);
  }

  function normalizeModelName(name) {
    return String(name || "").replace(/^models\//, "");
  }

  function canGenerateContent(model) {
    const methods = Array.isArray(model && model.supportedGenerationMethods) ? model.supportedGenerationMethods : [];
    return methods.includes("generateContent");
  }

  function describePreferredLanguage(languageCode) {
    const normalized = String(languageCode || "").trim();

    if (!normalized) {
      return "";
    }

    const labels = {
      en: "English",
      "en-US": "English (United States)",
      "en-GB": "English (United Kingdom)",
      zh: "Chinese",
      "zh-TW": "Traditional Chinese",
      "zh-CN": "Simplified Chinese",
      ja: "Japanese",
      "ja-JP": "Japanese",
      ko: "Korean",
      "ko-KR": "Korean",
    };

    return labels[normalized] || `language code ${normalized}`;
  }

  function buildLanguageInstruction(languageCode) {
    const normalized = String(languageCode || "").trim();

    if (!normalized) {
      return "Detect the dominant lecture language from the transcript and write the notes in that language.";
    }

    return `The preferred lecture language is ${describePreferredLanguage(normalized)} (${normalized}). Write headings and explanations primarily in this language.`;
  }

  function buildUiLanguageInstruction(languageCode) {
    return languageCode === "zh-TW"
      ? "Respond in Traditional Chinese unless the preferred processing language strongly indicates another language."
      : "Respond in English unless the preferred processing language strongly indicates another language.";
  }

  function chooseBestModel(models) {
    const normalized = models
      .filter(canGenerateContent)
      .map((model) => ({
        original: model,
        normalizedName: normalizeModelName(model.name),
      }));

    for (const preferred of MODEL_PREFERENCES) {
      const match = normalized.find((model) => model.normalizedName === preferred);
      if (match) {
        return match.normalizedName;
      }
    }

    return normalized.length ? normalized[0].normalizedName : null;
  }

  async function resolveModelName(apiKey, forceRefresh) {
    if (cachedModelName && !forceRefresh) {
      return cachedModelName;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models?key=${encodeURIComponent(apiKey)}`);
    const payload = await response.json();

    if (!response.ok) {
      const message = payload && payload.error && payload.error.message ? payload.error.message : "Unable to list Gemini models.";
      throw new Error(message);
    }

    const modelName = chooseBestModel(Array.isArray(payload.models) ? payload.models : []);
    if (!modelName) {
      throw new Error("No Gemini model with generateContent support is available for this API key.");
    }

    cachedModelName = modelName;
    return modelName;
  }

  async function sendGenerateContentRequest(apiKey, modelName, prompt, options) {
    return fetch(`https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options && typeof options.temperature === "number" ? options.temperature : 0.2,
          topP: 0.9,
          maxOutputTokens: options && options.maxOutputTokens ? options.maxOutputTokens : 4096,
        },
      }),
    });
  }

  function isModelNotFoundError(payload) {
    const message = payload && payload.error && payload.error.message ? payload.error.message : "";
    return /not found|not supported/i.test(message);
  }

  async function callGemini(apiKey, prompt, options) {
    let modelName = await resolveModelName(apiKey, false);
    let response = await sendGenerateContentRequest(apiKey, modelName, prompt, options);
    let payload = await response.json();

    if (!response.ok && isModelNotFoundError(payload)) {
      modelName = await resolveModelName(apiKey, true);
      response = await sendGenerateContentRequest(apiKey, modelName, prompt, options);
      payload = await response.json();
    }

    if (!response.ok) {
      const message = payload && payload.error && payload.error.message ? payload.error.message : "Gemini request failed.";
      throw new Error(message);
    }

    return extractResponseText(payload);
  }

  const GeminiService = {
    async generateNotes(input) {
      const apiKey = input.geminiKey;
      if (!apiKey) {
        throw new Error("Gemini API key is missing.");
      }

      const transcript = (input.transcript || "").trim();
      if (!transcript) {
        throw new Error("Transcript is empty.");
      }

      const languageInstruction = buildLanguageInstruction(input.preferredProcessingLanguage);
      const transcriptSegments = splitTranscript(transcript, 12000);
      const contextBlock = input.referenceContext
        ? `Reference material excerpts:\n${input.referenceContext}\n\n`
        : "";
      const metadataBlock = [
        `Lecture title: ${input.lectureTitle || "Untitled lecture"}`,
        `Course name: ${input.courseName || "Unknown course"}`,
        `Lecture topic: ${input.topic || "Not provided"}`,
        `Lecture date: ${new Date(input.date || Date.now()).toLocaleString()}`,
        `Preferred lecture language: ${input.preferredProcessingLanguage || "Auto detect from transcript"}`,
        `Technical terms: ${(input.technicalTerms || []).join(", ") || "None detected"}`,
        `Additional context: ${input.additionalContext || "None provided"}`,
      ].join("\n");

      const segmentSummaries = [];

      if (transcriptSegments.length > 1) {
        for (let index = 0; index < transcriptSegments.length; index += 1) {
          input.onProgress && input.onProgress(`Summarizing segment ${index + 1} of ${transcriptSegments.length}`);
          const segmentPrompt = [
            "You are producing faithful lecture notes for university students.",
            languageInstruction,
            "Summarize the segment below. Preserve technical terminology exactly, including mixed Chinese and English terms.",
            "Return Markdown with these sections only:",
            "## Segment Summary",
            "## Key Concepts",
            "## Definitions",
            "## Technical Terms",
            "## Code / Formulas",
            metadataBlock,
            contextBlock,
            `Transcript segment ${index + 1}/${transcriptSegments.length}:`,
            transcriptSegments[index],
          ].join("\n\n");

          const summary = await callGemini(apiKey, segmentPrompt, { maxOutputTokens: 2200, temperature: 0.15 });
          segmentSummaries.push(`### Segment ${index + 1}\n${summary}`);
        }
      }

      input.onProgress && input.onProgress(transcriptSegments.length > 1 ? "Combining segment summaries" : "Generating lecture notes");
      const finalPrompt = [
        "You are generating polished Markdown lecture notes for a student after a live university lecture.",
        languageInstruction,
        "Be precise, structured, and faithful to the transcript. Preserve technical terms exactly and include computer science vocabulary.",
        "If the transcript is noisy, infer structure conservatively and avoid inventing details.",
        "Return Markdown in exactly this structure:",
        "# Lecture Title",
        "Date",
        "## Lecture Summary",
        "## Lecture Chapters",
        "## Key Concepts",
        "## Important Definitions",
        "## Technical Terms",
        "## Key Explanations",
        "## Code / Formulas",
        "## Study Notes",
        "## Follow-up Questions",
        metadataBlock,
        contextBlock,
        transcriptSegments.length > 1
          ? `Hierarchical segment summaries:\n${segmentSummaries.join("\n\n")}`
          : `Transcript:\n${transcript}`,
      ].join("\n\n");

      return callGemini(apiKey, finalPrompt, { maxOutputTokens: 4096, temperature: 0.2 });
    },

    async generateIntervention(input) {
      const apiKey = input.geminiKey;
      if (!apiKey) {
        throw new Error("Gemini API key is missing.");
      }

      const scenario = input.scenario === "interview" ? "interview" : "classroom";
      const preferredLanguageInstruction = buildLanguageInstruction(input.preferredProcessingLanguage);
      const uiLanguageInstruction = buildUiLanguageInstruction(input.interfaceLanguage);
      const scenarioInstructions = scenario === "interview"
        ? [
            "Scenario: Mock interview support.",
            "Use the STAR method as the evaluation lens.",
            "Only help the interviewer. Do not answer on behalf of the candidate.",
            "When intervening, provide exactly one concise follow-up question or one concise probing suggestion.",
          ].join("\n")
        : [
            "Scenario: Classroom learning support.",
            "Use scaffolding: guide understanding without directly giving the final answer.",
            "When intervening, provide a short clarification, definition, or next-step hint in no more than 2 sentences.",
          ].join("\n");

      const sensitivityLine = typeof input.interventionSensitivity === "number"
        ? `Intervention sensitivity: ${input.interventionSensitivity}/10 (higher = intervene more readily; lower = prefer SILENCE)`
        : "";
      const keywordBoostLine = typeof input.keywordBoost === "number"
        ? `Question-intent keyword boost: ${input.keywordBoost}`
        : "";
      const questionKeywordLine = Array.isArray(input.questionKeywords) && input.questionKeywords.length
        ? `Matched question keywords: ${input.questionKeywords.join(", ")}`
        : "";
      const urgencyScoreLine = typeof input.urgencyScore === "number"
        ? `Urgency score (keyword+silence): ${input.urgencyScore}`
        : "";
      const scenarioTagsLine = Array.isArray(input.scenarioTags) && input.scenarioTags.length
        ? `Scenario tags: ${input.scenarioTags.join(", ")}`
        : "";
      const totalKeywordScoreLine = typeof input.totalKeywordScore === "number"
        ? `Total keyword+urgency score: ${input.totalKeywordScore}`
        : "";

      const prompt = [
        // ── ROLE ──────────────────────────────────────────────────────────────
        "You are a real-time conversation observer and knowledge assistant monitoring a live conversation.",
        preferredLanguageInstruction,
        uiLanguageInstruction,
        scenarioInstructions,

        // ── INNER THOUGHTS (silent CoT — do NOT output this section) ──────────
        "Before choosing an action, silently reason through the following three questions (do NOT include this reasoning in your output):",
        "1. Conversation state: Is this a knowledge gap, listener confusion, or a natural flowing pause?",
        "2. Intervention value: Does speaking now add clear, concrete value — or would it create noise and interrupt flow?",
        "3. Timing: Given the prosody features and observed silence duration, would speaking now feel abrupt or intrusive?",
        "Use these answers only as internal signals to choose the lowest justified action level.",

        // ── PROACTIVE LEVELS (decision ladder) ────────────────────────────────
        "Action taxonomy — always prefer the lowest level that fits:",
        "• SILENCE          — conversation is flowing; no clear value to add right now.",
        "• [ACTION: NOTIFICATION] — a technical or environmental issue is disrupting the session (e.g. noise, clipping).",
        "• [ACTION: SUGGEST]      — a natural pause with a non-urgent supplemental point or related keyword worth noting.",
        "• [ACTION: INTERVENE]    — clear confusion, an explicit help request, or a significant factual error requiring correction.",

        // ── CONSTRAINTS ───────────────────────────────────────────────────────
        "Hard constraints:",
        "1. Default is SILENCE. Only escalate if the evidence is unambiguous.",
        "2. The local prosody trigger score and recommended action are strong prior signals — respect them.",
        "3. Explicit question-intent keywords are a strong signal that the speaker may want an answer or clarification.",
        "4. Message after the action tag must be ≤ 30 words. Tone: natural, humble, like a knowledgeable bystander.",
        "5. Never mention VAD, thresholds, prosody scores, or internal policy in the message.",
        "6. Do not invent facts beyond the transcript.",
        sensitivityLine,
        keywordBoostLine,
        questionKeywordLine,
        urgencyScoreLine,
        scenarioTagsLine,
        totalKeywordScoreLine,

        // ── SITUATION AWARENESS CONTEXT ───────────────────────────────────────
        "Current situation:",
        `Scenario: ${scenario}`,
        `Trigger reason: ${input.triggerReason || "unknown"} | Label: ${input.triggerLabel || "unknown"}`,
        `Recommended action: ${input.recommendedAction || "INTERVENE"} | Score: ${typeof input.triggerScore === "number" ? input.triggerScore : "?"} / Threshold: ${typeof input.triggerThreshold === "number" ? input.triggerThreshold : "?"}`,
        `Pause: ${Number(input.pauseMs) || 1500} ms | Silence: ${Number(input.silenceMs) || 0} ms`,
        `Detected language: ${input.detectedLanguage || "unknown"}`,
        `Topic: ${input.topic || "—"} | Lecture: ${input.lectureTitle || "—"} | Course: ${input.courseName || "—"}`,
        `Detected terms: ${(input.detectedTerms || []).join(", ") || "none"}`,
        input.additionalContext ? `Additional context: ${input.additionalContext}` : "",
        "Prosody:",
        input.prosodySummary || "N/A",
        "Latest utterance:",
        input.latestUtterance || "(none)",
        "Recent transcript:",
        input.recentTranscript || "(none)",

        // ── OUTPUT FORMAT ─────────────────────────────────────────────────────
        "Output: Respond with exactly SILENCE, or start with one of [ACTION: NOTIFICATION] / [ACTION: SUGGEST] / [ACTION: INTERVENE] followed by your message (≤ 30 words) on the same or next line.",
      ].filter(Boolean).join("\n\n");

      return callGemini(apiKey, prompt, { maxOutputTokens: 160, temperature: 0.1 });
    },
  };

  window.GeminiService = GeminiService;
})();