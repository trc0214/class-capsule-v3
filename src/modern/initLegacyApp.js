import DOMPurify from "dompurify";
import { marked } from "marked";
import "../core/storage.js";
import "../core/settings.js";
import "../core/transcript.js";
import "../services/speech.js";
import "../services/prosody.js";
import "../services/rag.js";
import "../services/gemini.js";
import "../services/intervention.js";
import "../app/lecture-manager.js";
import "../app/app-controller.js";
import "../ui/ui.js";

export async function initLegacyApp() {
  if (window.__legacyAppInitPromise) {
    return window.__legacyAppInitPromise;
  }

  window.LECTURE_ASSISTANT_LOCAL_CONFIG = window.LECTURE_ASSISTANT_LOCAL_CONFIG || {};
  window.DOMPurify = DOMPurify;
  window.marked = marked;
  const app = window.AppController.createController();

  window.__legacyAppInitPromise = app.init().then(() => {
    window.__legacyAppInstance = app;
    return app;
  });

  return window.__legacyAppInitPromise;
}
