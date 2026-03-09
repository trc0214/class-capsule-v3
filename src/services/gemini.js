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

      const transcriptSegments = splitTranscript(transcript, 12000);
      const contextBlock = input.referenceContext
        ? `Reference material excerpts:\n${input.referenceContext}\n\n`
        : "";
      const metadataBlock = [
        `Lecture title: ${input.lectureTitle || "Untitled lecture"}`,
        `Course name: ${input.courseName || "Unknown course"}`,
        `Lecture topic: ${input.topic || "Not provided"}`,
        `Lecture date: ${new Date(input.date || Date.now()).toLocaleString()}`,
        `Technical terms: ${(input.technicalTerms || []).join(", ") || "None detected"}`,
        `Additional context: ${input.additionalContext || "None provided"}`,
      ].join("\n");

      const segmentSummaries = [];

      if (transcriptSegments.length > 1) {
        for (let index = 0; index < transcriptSegments.length; index += 1) {
          input.onProgress && input.onProgress(`Summarizing segment ${index + 1} of ${transcriptSegments.length}`);
          const segmentPrompt = [
            "You are producing faithful lecture notes for university students.",
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
  };

  window.GeminiService = GeminiService;
})();