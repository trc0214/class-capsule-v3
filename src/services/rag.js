(function () {
  const PDFJS_FALLBACKS = [
    {
      scriptUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      workerUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    },
    {
      scriptUrl: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js",
      workerUrl: "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
    },
  ];

  let pdfJsLoadPromise = null;

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

  function getPdfJsApi() {
    return window.pdfjsLib || window["pdfjs-dist/build/pdf"] || null;
  }

  function configurePdfWorker(pdfjsLib) {
    if (!pdfjsLib || !pdfjsLib.GlobalWorkerOptions) {
      return;
    }

    const existingWorker = pdfjsLib.GlobalWorkerOptions.workerSrc;
    if (existingWorker) {
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_FALLBACKS[0].workerUrl;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        if (getPdfJsApi()) {
          resolve();
          return;
        }

        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error(`Failed to load script: ${url}`)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  }

  async function ensurePdfJsLoaded() {
    const loadedApi = getPdfJsApi();
    if (loadedApi) {
      configurePdfWorker(loadedApi);
      return loadedApi;
    }

    if (!pdfJsLoadPromise) {
      pdfJsLoadPromise = (async () => {
        let lastError = null;

        for (const candidate of PDFJS_FALLBACKS) {
          try {
            await loadScript(candidate.scriptUrl);
            const pdfjsLib = getPdfJsApi();
            if (pdfjsLib) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = candidate.workerUrl;
              return pdfjsLib;
            }
          } catch (error) {
            lastError = error;
          }
        }

        throw lastError || new Error("PDF support failed to load.");
      })();
    }

    try {
      return await pdfJsLoadPromise;
    } catch (error) {
      pdfJsLoadPromise = null;
      throw error;
    }
  }

  async function extractPdfText(file) {
    const pdfjsLib = await ensurePdfJsLoaded();

    const bytes = await file.arrayBuffer();
    const documentTask = pdfjsLib.getDocument({ data: bytes });
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