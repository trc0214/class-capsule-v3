(function () {
  const TECHNICAL_TERMS = [
    "TCP",
    "UDP",
    "PID",
    "API",
    "SDK",
    "HTTP",
    "HTTPS",
    "Gradient Descent",
    "Neural Network",
    "Deep Learning",
    "Heap",
    "Stack",
    "Big-O",
    "Big O",
    "Hash Table",
    "Binary Search",
    "Dynamic Programming",
    "Recursion",
    "Kernel",
    "Thread",
    "Process",
    "Mutex",
    "Semaphore",
    "Paxos",
    "Raft",
    "Consensus",
    "Dijkstra",
    "Backpropagation",
    "Transformer",
    "Embedding",
    "Database",
    "SQL",
    "NoSQL",
    "B-tree",
    "Trie",
    "Heap Sort",
    "Merge Sort",
    "Latency",
    "Throughput",
    "Garbage Collection",
    "Virtual Memory",
    "Generative AI",
    "LLM",
    "RAG",
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeToken(token) {
    return token.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
  }

  function detectTopicShift(previousText, nextText) {
    if (!previousText || !nextText) {
      return false;
    }

    const cuePattern = /\b(next|moving on|in summary|let's switch|now we discuss|turning to)\b|接下來|總結一下|現在我們來看|換句話說/i;
    if (cuePattern.test(nextText)) {
      return true;
    }

    const previousTokens = previousText.split(/\s+/).map(normalizeToken).filter(Boolean);
    const nextTokens = nextText.split(/\s+/).map(normalizeToken).filter(Boolean);

    if (previousTokens.length < 5 || nextTokens.length < 5) {
      return false;
    }

    const previousSet = new Set(previousTokens);
    let overlap = 0;
    nextTokens.forEach((token) => {
      if (previousSet.has(token)) {
        overlap += 1;
      }
    });

    return overlap / Math.max(nextTokens.length, 1) < 0.12;
  }

  function detectTechnicalTerms(text) {
    if (!text) {
      return [];
    }

    const terms = [];
    const uppercaseTerms = text.match(/\b[A-Z][A-Z0-9-]{1,}\b/g) || [];
    terms.push(...uppercaseTerms);

    for (const term of TECHNICAL_TERMS) {
      const expression = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (expression.test(text)) {
        terms.push(term);
      }
    }

    return uniqueSorted(terms);
  }

  function highlightTechnicalTerms(text, terms) {
    let html = escapeHtml(text);
    const sortedTerms = [...(terms || [])].sort((left, right) => right.length - left.length);

    sortedTerms.forEach((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(`(${escaped})`, "gi"), '<span class="term-highlight">$1</span>');
    });

    return html;
  }

  const TranscriptProcessor = {
    create(options) {
      const settings = {
        segmentIntervalMs: (options && options.segmentIntervalMinutes ? options.segmentIntervalMinutes : 3) * 60 * 1000,
        paragraphCharLimit: 520,
        segmentCharLimit: 2400,
        pauseThresholdMs: 3200,
        ...(options || {}),
      };

      const state = {
        paragraphs: [],
        segments: [],
        currentParagraphText: "",
        currentParagraphTerms: [],
        currentParagraphStart: null,
        segmentBuffer: [],
        technicalTerms: [],
        lastResultAt: null,
        partialText: "",
        paragraphId: 0,
      };

      function flushParagraph(reason) {
        if (!state.currentParagraphText.trim()) {
          return null;
        }

        const paragraph = {
          id: `paragraph-${Date.now()}-${++state.paragraphId}`,
          text: state.currentParagraphText.trim(),
          startedAt: state.currentParagraphStart || Date.now(),
          endedAt: state.lastResultAt || Date.now(),
          terms: uniqueSorted(state.currentParagraphTerms),
          reason,
        };

        state.paragraphs.push(paragraph);
        state.segmentBuffer.push(paragraph);
        state.technicalTerms = uniqueSorted(state.technicalTerms.concat(paragraph.terms));
        state.currentParagraphText = "";
        state.currentParagraphTerms = [];
        state.currentParagraphStart = null;
        return paragraph;
      }

      function flushSegment(reason) {
        if (!state.segmentBuffer.length) {
          return null;
        }

        const first = state.segmentBuffer[0];
        const last = state.segmentBuffer[state.segmentBuffer.length - 1];
        const segment = {
          id: `segment-${Date.now()}-${state.segments.length + 1}`,
          startedAt: first.startedAt,
          endedAt: last.endedAt,
          text: state.segmentBuffer.map((paragraph) => paragraph.text).join("\n\n"),
          paragraphs: state.segmentBuffer.map((paragraph) => paragraph.id),
          terms: uniqueSorted(state.segmentBuffer.flatMap((paragraph) => paragraph.terms)),
          reason,
        };

        state.segments.push(segment);
        state.segmentBuffer = [];
        return segment;
      }

      return {
        reset() {
          state.paragraphs = [];
          state.segments = [];
          state.currentParagraphText = "";
          state.currentParagraphTerms = [];
          state.currentParagraphStart = null;
          state.segmentBuffer = [];
          state.technicalTerms = [];
          state.lastResultAt = null;
          state.partialText = "";
          state.paragraphId = 0;
        },

        restore(savedState) {
          this.reset();
          if (!savedState) {
            return;
          }

          state.paragraphs = Array.isArray(savedState.paragraphs) ? savedState.paragraphs : [];
          state.segments = Array.isArray(savedState.segments) ? savedState.segments : [];
          state.currentParagraphText = savedState.currentParagraphText || "";
          state.currentParagraphTerms = Array.isArray(savedState.currentParagraphTerms) ? savedState.currentParagraphTerms : [];
          state.currentParagraphStart = savedState.currentParagraphStart || null;
          state.segmentBuffer = Array.isArray(savedState.segmentBuffer) ? savedState.segmentBuffer : [];
          state.technicalTerms = Array.isArray(savedState.technicalTerms) ? savedState.technicalTerms : [];
          state.lastResultAt = savedState.lastResultAt || null;
          state.partialText = savedState.partialText || "";
          state.paragraphId = savedState.paragraphId || state.paragraphs.length;
        },

        getState() {
          return JSON.parse(JSON.stringify(state));
        },

        getTranscriptText() {
          const paragraphs = state.paragraphs.map((paragraph) => paragraph.text);
          if (state.currentParagraphText.trim()) {
            paragraphs.push(state.currentParagraphText.trim());
          }
          return paragraphs.join("\n\n");
        },

        getHighlightedTranscriptHtml() {
          const paragraphs = [...state.paragraphs];
          if (state.currentParagraphText.trim()) {
            paragraphs.push({
              text: state.currentParagraphText.trim(),
              terms: uniqueSorted(state.currentParagraphTerms),
            });
          }

          if (!paragraphs.length) {
            return '<p class="text-zinc-500">Transcript will appear here as the lecture progresses.</p>';
          }

          return paragraphs
            .map((paragraph) => `<p class="mb-4">${highlightTechnicalTerms(paragraph.text, paragraph.terms)}</p>`)
            .join("");
        },

        getTechnicalTerms() {
          return uniqueSorted(state.technicalTerms.concat(state.currentParagraphTerms));
        },

        updatePartial(partialText) {
          state.partialText = partialText || "";
          return state.partialText;
        },

        consumeFinalResult(payload) {
          const text = (payload && payload.text ? payload.text : "").trim();
          if (!text) {
            return null;
          }

          const resultAt = payload.resultAt || Date.now();
          const longPause = state.lastResultAt ? resultAt - state.lastResultAt >= settings.pauseThresholdMs : false;
          const charLimitExceeded = state.currentParagraphText.length >= settings.paragraphCharLimit;
          const topicShift = detectTopicShift(state.currentParagraphText, text);

          if ((longPause || charLimitExceeded || topicShift) && state.currentParagraphText.trim()) {
            flushParagraph(longPause ? "pause" : topicShift ? "topic-shift" : "length");
          }

          const technicalTerms = detectTechnicalTerms(text);

          if (!state.currentParagraphStart) {
            state.currentParagraphStart = resultAt;
          }

          state.currentParagraphText = state.currentParagraphText.trim()
            ? `${state.currentParagraphText.trim()} ${text}`
            : text;
          state.currentParagraphTerms = uniqueSorted(state.currentParagraphTerms.concat(technicalTerms));
          state.lastResultAt = resultAt;
          state.partialText = "";

          let paragraph = null;
          const segmentDuration = state.segmentBuffer.length
            ? resultAt - state.segmentBuffer[0].startedAt
            : state.currentParagraphStart
              ? resultAt - state.currentParagraphStart
              : 0;
          const segmentSize = state.segmentBuffer.reduce((total, item) => total + item.text.length, 0) + state.currentParagraphText.length;
          let segment = null;

          if (segmentDuration >= settings.segmentIntervalMs || segmentSize >= settings.segmentCharLimit) {
            paragraph = flushParagraph(segmentDuration >= settings.segmentIntervalMs ? "segment-interval" : "segment-length");
            segment = flushSegment(paragraph ? paragraph.reason : "segment");
          }

          return {
            paragraph,
            segment,
            transcriptText: this.getTranscriptText(),
            transcriptHtml: this.getHighlightedTranscriptHtml(),
            technicalTerms: this.getTechnicalTerms(),
            partialText: state.partialText,
          };
        },

        flushAll() {
          const paragraph = flushParagraph("finalize");
          const segment = flushSegment("finalize");
          return {
            paragraph,
            segment,
            transcriptText: this.getTranscriptText(),
            transcriptHtml: this.getHighlightedTranscriptHtml(),
            technicalTerms: this.getTechnicalTerms(),
            partialText: state.partialText,
          };
        },
      };
    },

    detectTechnicalTerms,
    highlightTechnicalTerms,
    escapeHtml,
  };

  window.TranscriptProcessor = TranscriptProcessor;
})();