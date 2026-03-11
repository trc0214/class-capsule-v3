(function () {
  const DB_NAME = "lecture-assistant-db";
  const DB_VERSION = 1;
  const STORAGE_MODES = {
    browser: "browser",
    remote: "remote",
  };
  const STORES = {
    lectures: "lectures",
    settings: "settings",
    drafts: "drafts",
  };

  function getLocalConfig() {
    return window.LECTURE_ASSISTANT_LOCAL_CONFIG || {};
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
    });
  }

  function cloneJson(value) {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
  }

  function normalizeBackupPayload(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid backup file.");
    }

    if (!Array.isArray(payload.lectures)) {
      throw new Error("Backup file is missing lectures.");
    }

    return {
      lectures: payload.lectures,
      settings: payload.settings && typeof payload.settings === "object" ? payload.settings : null,
      draft: payload.draft && typeof payload.draft === "object" ? payload.draft : null,
    };
  }

  function normalizeApiBaseUrl(value) {
    return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
  }

  function getStorageConfig() {
    const localConfig = getLocalConfig();
    return {
      mode: localConfig.storageMode === STORAGE_MODES.remote ? STORAGE_MODES.remote : STORAGE_MODES.browser,
      apiBaseUrl: normalizeApiBaseUrl(localConfig.storageApiBaseUrl),
    };
  }

  function createBrowserStorageProvider() {
    return {
      db: null,

      async init() {
        if (this.db) {
          return this.db;
        }

        this.db = await new Promise((resolve, reject) => {
          const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

          openRequest.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORES.lectures)) {
              const lectureStore = db.createObjectStore(STORES.lectures, { keyPath: "id" });
              lectureStore.createIndex("updatedAt", "updatedAt");
            }

            if (!db.objectStoreNames.contains(STORES.settings)) {
              db.createObjectStore(STORES.settings, { keyPath: "key" });
            }

            if (!db.objectStoreNames.contains(STORES.drafts)) {
              db.createObjectStore(STORES.drafts, { keyPath: "id" });
            }
          };

          openRequest.onsuccess = () => resolve(openRequest.result);
          openRequest.onerror = () => reject(openRequest.error);
        });

        return this.db;
      },

      async saveSettings(settings) {
        const db = await this.init();
        const transaction = db.transaction(STORES.settings, "readwrite");
        transaction.objectStore(STORES.settings).put({ key: "app-settings", value: settings, updatedAt: Date.now() });
        await transactionDone(transaction);
        localStorage.setItem("lecture-assistant-settings", JSON.stringify(settings));
        return settings;
      },

      async getSettings() {
        const cached = localStorage.getItem("lecture-assistant-settings");
        const db = await this.init();
        const transaction = db.transaction(STORES.settings, "readonly");
        const result = await requestToPromise(transaction.objectStore(STORES.settings).get("app-settings"));
        await transactionDone(transaction);

        if (result && result.value) {
          return result.value;
        }

        return cached ? JSON.parse(cached) : null;
      },

      async saveLecture(lecture) {
        const db = await this.init();
        const transaction = db.transaction(STORES.lectures, "readwrite");
        transaction.objectStore(STORES.lectures).put(lecture);
        await transactionDone(transaction);
        return lecture;
      },

      async getLecture(id) {
        const db = await this.init();
        const transaction = db.transaction(STORES.lectures, "readonly");
        const result = await requestToPromise(transaction.objectStore(STORES.lectures).get(id));
        await transactionDone(transaction);
        return result || null;
      },

      async getLectures() {
        const db = await this.init();
        const transaction = db.transaction(STORES.lectures, "readonly");
        const store = transaction.objectStore(STORES.lectures);
        const results = await requestToPromise(store.getAll());
        await transactionDone(transaction);

        return results.sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
      },

      async deleteLecture(id) {
        const db = await this.init();
        const transaction = db.transaction(STORES.lectures, "readwrite");
        transaction.objectStore(STORES.lectures).delete(id);
        await transactionDone(transaction);
      },

      async saveDraft(draft) {
        const db = await this.init();
        const nextDraft = { ...draft, id: "active-draft", updatedAt: Date.now() };
        const transaction = db.transaction(STORES.drafts, "readwrite");
        transaction.objectStore(STORES.drafts).put(nextDraft);
        await transactionDone(transaction);
        localStorage.setItem("lecture-assistant-active-draft", JSON.stringify(nextDraft));
        return draft;
      },

      async getDraft() {
        const cached = localStorage.getItem("lecture-assistant-active-draft");
        const db = await this.init();
        const transaction = db.transaction(STORES.drafts, "readonly");
        const result = await requestToPromise(transaction.objectStore(STORES.drafts).get("active-draft"));
        await transactionDone(transaction);

        if (result) {
          return result;
        }

        return cached ? JSON.parse(cached) : null;
      },

      async clearDraft() {
        const db = await this.init();
        const transaction = db.transaction(STORES.drafts, "readwrite");
        transaction.objectStore(STORES.drafts).delete("active-draft");
        await transactionDone(transaction);
        localStorage.removeItem("lecture-assistant-active-draft");
      },

      async exportAll() {
        const [lectures, settings, draft] = await Promise.all([
          this.getLectures(),
          this.getSettings(),
          this.getDraft(),
        ]);

        return {
          schemaVersion: 1,
          exportedAt: Date.now(),
          lectures: cloneJson(lectures) || [],
          settings: cloneJson(settings),
          draft: cloneJson(draft),
        };
      },

      async importAll(payload) {
        const normalized = normalizeBackupPayload(payload);
        const db = await this.init();

        const lectureTransaction = db.transaction(STORES.lectures, "readwrite");
        lectureTransaction.objectStore(STORES.lectures).clear();
        normalized.lectures.forEach((lecture) => {
          lectureTransaction.objectStore(STORES.lectures).put(lecture);
        });
        await transactionDone(lectureTransaction);

        const settingsTransaction = db.transaction(STORES.settings, "readwrite");
        settingsTransaction.objectStore(STORES.settings).clear();
        if (normalized.settings) {
          settingsTransaction.objectStore(STORES.settings).put({
            key: "app-settings",
            value: normalized.settings,
            updatedAt: Date.now(),
          });
          localStorage.setItem("lecture-assistant-settings", JSON.stringify(normalized.settings));
        } else {
          localStorage.removeItem("lecture-assistant-settings");
        }
        await transactionDone(settingsTransaction);

        const draftTransaction = db.transaction(STORES.drafts, "readwrite");
        draftTransaction.objectStore(STORES.drafts).clear();
        if (normalized.draft) {
          const nextDraft = {
            ...normalized.draft,
            id: "active-draft",
            updatedAt: normalized.draft.updatedAt || Date.now(),
          };
          draftTransaction.objectStore(STORES.drafts).put(nextDraft);
          localStorage.setItem("lecture-assistant-active-draft", JSON.stringify(nextDraft));
        } else {
          localStorage.removeItem("lecture-assistant-active-draft");
        }
        await transactionDone(draftTransaction);

        return {
          lectureCount: normalized.lectures.length,
          hasDraft: Boolean(normalized.draft && normalized.draft.lecture),
          hasSettings: Boolean(normalized.settings),
        };
      },
    };
  }

  function createRemoteStorageProvider(apiBaseUrl) {
    if (!apiBaseUrl) {
      throw new Error("storageApiBaseUrl is required when storageMode is remote.");
    }

    return {
      apiBaseUrl,

      async init() {
        return true;
      },

      async request(path, options) {
        const response = await fetch(`${this.apiBaseUrl}${path}`, {
          headers: {
            "Content-Type": "application/json",
            ...(options && options.headers ? options.headers : {}),
          },
          ...options,
        });

        if (!response.ok) {
          throw new Error(`Remote storage request failed: ${response.status}`);
        }

        if (response.status === 204) {
          return null;
        }

        return response.json();
      },

      async saveSettings(settings) {
        await this.request("/settings", { method: "PUT", body: JSON.stringify({ settings }) });
        return settings;
      },

      async getSettings() {
        const payload = await this.request("/settings", { method: "GET" });
        return payload && payload.settings ? payload.settings : null;
      },

      async saveLecture(lecture) {
        await this.request(`/lectures/${encodeURIComponent(lecture.id)}`, { method: "PUT", body: JSON.stringify({ lecture }) });
        return lecture;
      },

      async getLecture(id) {
        const payload = await this.request(`/lectures/${encodeURIComponent(id)}`, { method: "GET" });
        return payload && payload.lecture ? payload.lecture : null;
      },

      async getLectures() {
        const payload = await this.request("/lectures", { method: "GET" });
        return Array.isArray(payload && payload.lectures) ? payload.lectures : [];
      },

      async deleteLecture(id) {
        await this.request(`/lectures/${encodeURIComponent(id)}`, { method: "DELETE" });
      },

      async saveDraft(draft) {
        await this.request("/draft", { method: "PUT", body: JSON.stringify({ draft }) });
        return draft;
      },

      async getDraft() {
        const payload = await this.request("/draft", { method: "GET" });
        return payload && payload.draft ? payload.draft : null;
      },

      async clearDraft() {
        await this.request("/draft", { method: "DELETE" });
      },

      async exportAll() {
        const payload = await this.request("/backup", { method: "GET" });
        return normalizeBackupPayload(payload);
      },

      async importAll(payload) {
        const normalized = normalizeBackupPayload(payload);
        const result = await this.request("/backup", { method: "PUT", body: JSON.stringify(normalized) });
        return result || {
          lectureCount: normalized.lectures.length,
          hasDraft: Boolean(normalized.draft && normalized.draft.lecture),
          hasSettings: Boolean(normalized.settings),
        };
      },
    };
  }

  function createStorageProvider() {
    const config = getStorageConfig();
    if (config.mode === STORAGE_MODES.remote) {
      return createRemoteStorageProvider(config.apiBaseUrl);
    }

    return createBrowserStorageProvider();
  }

  const AppStorage = {
    provider: null,
    providerReady: null,

    async init() {
      if (!this.provider) {
        this.provider = createStorageProvider();
      }

      if (!this.providerReady) {
        this.providerReady = this.provider.init();
      }

      return this.providerReady;
    },

    async saveSettings(settings) {
      await this.init();
      return this.provider.saveSettings(settings);
    },

    async getSettings() {
      await this.init();
      return this.provider.getSettings();
    },

    async saveLecture(lecture) {
      await this.init();
      return this.provider.saveLecture(lecture);
    },

    async getLecture(id) {
      await this.init();
      return this.provider.getLecture(id);
    },

    async getLectures() {
      await this.init();
      return this.provider.getLectures();
    },

    async deleteLecture(id) {
      await this.init();
      return this.provider.deleteLecture(id);
    },

    async saveDraft(draft) {
      await this.init();
      return this.provider.saveDraft(draft);
    },

    async getDraft() {
      await this.init();
      return this.provider.getDraft();
    },

    async clearDraft() {
      await this.init();
      return this.provider.clearDraft();
    },

    async exportAll() {
      await this.init();
      return this.provider.exportAll();
    },

    async importAll(payload) {
      await this.init();
      return this.provider.importAll(payload);
    },

    getMode() {
      return getStorageConfig().mode;
    },
  };

  window.AppStorage = AppStorage;
})();