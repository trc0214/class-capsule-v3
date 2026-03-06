(function () {
  const DB_NAME = "lecture-assistant-db";
  const DB_VERSION = 1;
  const STORES = {
    lectures: "lectures",
    settings: "settings",
    drafts: "drafts",
  };

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

  const AppStorage = {
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
      const transaction = db.transaction(STORES.drafts, "readwrite");
      transaction.objectStore(STORES.drafts).put({ ...draft, id: "active-draft", updatedAt: Date.now() });
      await transactionDone(transaction);
      localStorage.setItem("lecture-assistant-active-draft", JSON.stringify({ ...draft, updatedAt: Date.now() }));
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
  };

  window.AppStorage = AppStorage;
})();