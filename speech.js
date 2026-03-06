(function () {
  function ensureSpeechSdk() {
    if (!window.SpeechSDK) {
      throw new Error("Azure Speech SDK is not loaded.");
    }
  }

  function safeCloseRecognizer(recognizer) {
    if (!recognizer) {
      return;
    }

    try {
      recognizer.close();
    } catch (error) {
      console.warn("Recognizer close failed", error);
    }
  }

  class AzureSpeechService {
    constructor() {
      this.recognizer = null;
      this.keepAlive = false;
      this.isStopping = false;
      this.retryCount = 0;
      this.maxRetryDelayMs = 15000;
      this.callbacks = {};
      this.sessionStartedAt = null;
      this.currentConfig = null;
      this.permissionStream = null;
    }

    on(callbacks) {
      this.callbacks = callbacks || {};
    }

    async requestMicrophonePermission() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("This browser does not support microphone access.");
      }

      this.permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.permissionStream.getTracks().forEach((track) => track.stop());
      this.permissionStream = null;
    }

    buildRecognizer(config) {
      ensureSpeechSdk();
      const speechConfig = window.SpeechSDK.SpeechConfig.fromSubscription(config.azureKey, config.azureRegion);
      speechConfig.outputFormat = window.SpeechSDK.OutputFormat.Detailed;
      speechConfig.enableDictation();
      speechConfig.setProperty(window.SpeechSDK.PropertyId.SpeechServiceResponse_RequestWordLevelTimestamps, "true");
      speechConfig.setProperty(window.SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous");
      speechConfig.setProperty(window.SpeechSDK.PropertyId.SpeechServiceResponse_PostProcessingOption, "TrueText");

      const autoDetectConfig = window.SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(config.recognitionLanguages);
      const audioConfig = window.SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      if (typeof window.SpeechSDK.SpeechRecognizer.FromConfig === "function") {
        return window.SpeechSDK.SpeechRecognizer.FromConfig(speechConfig, autoDetectConfig, audioConfig);
      }

      return new window.SpeechSDK.SpeechRecognizer(speechConfig, autoDetectConfig, audioConfig);
    }

    wireRecognizer(recognizer) {
      recognizer.recognizing = (_, event) => {
        this.callbacks.onRecognizing && this.callbacks.onRecognizing({ text: event.result.text || "" });
      };

      recognizer.recognized = (_, event) => {
        if (!event.result || event.result.reason !== window.SpeechSDK.ResultReason.RecognizedSpeech) {
          return;
        }

        let detailed = null;
        try {
          detailed = event.result.json ? JSON.parse(event.result.json) : null;
        } catch (error) {
          console.warn("Unable to parse Azure detailed result", error);
        }

        const autoDetectResult = window.SpeechSDK.AutoDetectSourceLanguageResult.fromResult(event.result);
        const language = autoDetectResult ? autoDetectResult.language : null;
        const offsetMs = Number(event.result.offset || 0) / 10000;
        const durationMs = Number(event.result.duration || 0) / 10000;
        const resultAt = (this.sessionStartedAt || Date.now()) + offsetMs;

        this.callbacks.onRecognized && this.callbacks.onRecognized({
          text: event.result.text || "",
          language,
          resultAt,
          durationMs,
          rawJson: detailed,
        });
      };

      recognizer.canceled = (_, event) => {
        this.callbacks.onStatus && this.callbacks.onStatus(`Canceled: ${event.errorDetails || event.reason}`);
        this.callbacks.onError && this.callbacks.onError(new Error(event.errorDetails || "Speech recognition canceled."));

        safeCloseRecognizer(this.recognizer);
        this.recognizer = null;

        if (this.keepAlive && !this.isStopping) {
          this.scheduleRestart();
        }
      };

      recognizer.sessionStopped = () => {
        this.callbacks.onStatus && this.callbacks.onStatus("Session stopped.");
        safeCloseRecognizer(this.recognizer);
        this.recognizer = null;

        if (this.keepAlive && !this.isStopping) {
          this.scheduleRestart();
        }
      };
    }

    async start(config) {
      ensureSpeechSdk();
      if (!config.azureKey || !config.azureRegion) {
        throw new Error("Azure Speech settings are incomplete.");
      }

      this.currentConfig = { ...config };
      this.keepAlive = true;
      this.isStopping = false;
      this.retryCount = 0;

      await this.requestMicrophonePermission();
      await this.startRecognizer();
    }

    async startRecognizer() {
      const recognizer = this.buildRecognizer(this.currentConfig);
      this.sessionStartedAt = Date.now();
      this.wireRecognizer(recognizer);
      this.recognizer = recognizer;

      await new Promise((resolve, reject) => {
        recognizer.startContinuousRecognitionAsync(
          () => {
            this.callbacks.onStatus && this.callbacks.onStatus("Listening");
            resolve();
          },
          (error) => reject(new Error(error))
        );
      });
    }

    scheduleRestart() {
      const delay = Math.min(1500 * Math.pow(2, this.retryCount), this.maxRetryDelayMs);
      this.retryCount += 1;
      this.callbacks.onStatus && this.callbacks.onStatus(`Reconnecting in ${Math.round(delay / 1000)}s`);

      window.setTimeout(async () => {
        if (!this.keepAlive || this.isStopping) {
          return;
        }

        try {
          await this.startRecognizer();
          this.retryCount = 0;
          this.callbacks.onStatus && this.callbacks.onStatus("Reconnected");
        } catch (error) {
          this.callbacks.onError && this.callbacks.onError(error);
          this.scheduleRestart();
        }
      }, delay);
    }

    async stop() {
      this.keepAlive = false;
      this.isStopping = true;

      if (!this.recognizer) {
        return;
      }

      const recognizer = this.recognizer;
      this.recognizer = null;

      await new Promise((resolve) => {
        recognizer.stopContinuousRecognitionAsync(
          () => {
            safeCloseRecognizer(recognizer);
            resolve();
          },
          () => {
            safeCloseRecognizer(recognizer);
            resolve();
          }
        );
      });
    }
  }

  window.AzureSpeechService = AzureSpeechService;
})();