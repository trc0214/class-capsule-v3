(function () {
  function splitIntoChunks(text, maxChars) {
    const chunks = [];
    let index = 0;
    while (index < text.length) {
      chunks.push(text.slice(index, index + maxChars));
      index += maxChars;
    }
    return chunks;
  }

  function tokenize(value) {
    return String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9\u4e00-\u9fff]+/)
      .filter((token) => token.length > 1);
  }

  function scoreChunk(chunk, queryTokens) {
    const lower = chunk.toLowerCase();
    let score = 0;
    queryTokens.forEach((token) => {
      if (lower.includes(token)) {
        score += 2;
      }
    });
    score += Math.min(chunk.length / 1200, 2);
    return score;
  }

  async function extractPdfText(file) {
    if (!window.pdfjsLib) {
      throw new Error("PDF support failed to load.");
    }

    const bytes = await file.arrayBuffer();
    const documentTask = window.pdfjsLib.getDocument({ data: bytes });
    const pdf = await documentTask.promise;
    const pageTexts = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str).join(" ");
      pageTexts.push(text);
    }

    return pageTexts.join("\n\n");
  }

  const RagProcessor = {
    async parseFiles(fileList) {
      const files = Array.from(fileList || []);
      const parsed = [];

      for (const file of files) {
        const extension = file.name.split(".").pop().toLowerCase();
        let text = "";

        if (["txt", "md", "markdown"].includes(extension)) {
          text = await file.text();
        } else if (extension === "pdf") {
          text = await extractPdfText(file);
        } else {
          throw new Error(`Unsupported document type: ${file.name}`);
        }

        parsed.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: extension,
          size: file.size,
          text: text.trim(),
          uploadedAt: Date.now(),
        });
      }

      return parsed;
    },

    buildContext(options) {
      const docs = Array.isArray(options.documents) ? options.documents : [];
      const queryTokens = tokenize([options.lectureTitle, options.courseName, options.topic, options.additionalContext, options.transcript].join(" "));
      const candidates = [];

      docs.forEach((document) => {
        splitIntoChunks(document.text || "", 1800).forEach((chunk, index) => {
          candidates.push({
            docName: document.name,
            index,
            text: chunk,
            score: scoreChunk(chunk, queryTokens),
          });
        });
      });

      return candidates
        .sort((left, right) => right.score - left.score)
        .slice(0, 8)
        .map((item) => `Document: ${item.docName}\nChunk ${item.index + 1}:\n${item.text}`)
        .join("\n\n---\n\n");
    },
  };

  window.RagProcessor = RagProcessor;
})();