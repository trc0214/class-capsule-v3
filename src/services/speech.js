(function () {
  const MEDIA_SAMPLE_RATE = 16000;
  const MEDIA_BUFFER_SIZE = 4096;

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

  function safePauseMedia(element) {
    if (!element) {
      return;
    }

    try {
      element.pause();
    } catch (error) {
      console.warn("Unable to pause media element", error);
    }
  }

  function getPreferredProcessingLanguage(config) {
    return typeof (config && config.preferredProcessingLanguage) === "string"
      ? config.preferredProcessingLanguage.trim()
      : "";
  }

  function downmixToMono(inputBuffer) {
    if (!inputBuffer || inputBuffer.numberOfChannels === 0) {
      return new Float32Array();
    }

    if (inputBuffer.numberOfChannels === 1) {
      return new Float32Array(inputBuffer.getChannelData(0));
    }

    const mono = new Float32Array(inputBuffer.length);
    for (let channel = 0; channel < inputBuffer.numberOfChannels; channel += 1) {
      const channelData = inputBuffer.getChannelData(channel);
      for (let index = 0; index < channelData.length; index += 1) {
        mono[index] += channelData[index] / inputBuffer.numberOfChannels;
      }
    }
    return mono;
  }

  function resampleAudio(samples, inputRate, outputRate) {
    if (!samples.length || inputRate === outputRate) {
      return samples;
    }

    const ratio = inputRate / outputRate;
    const outputLength = Math.max(1, Math.round(samples.length / ratio));
    const output = new Float32Array(outputLength);

    for (let index = 0; index < outputLength; index += 1) {
      const start = Math.floor(index * ratio);
      const end = Math.min(samples.length, Math.floor((index + 1) * ratio));
      let sum = 0;
      let count = 0;

      for (let pointer = start; pointer < end; pointer += 1) {
        sum += samples[pointer];
        count += 1;
      }

      output[index] = count ? sum / count : samples[Math.min(start, samples.length - 1)] || 0;
    }

    return output;
  }

  function encodePcm16(samples) {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);

    for (let index = 0; index < samples.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, samples[index]));
      view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }

    return buffer;
  }

  function waitForMediaMetadata(element) {
    if (element.readyState >= 1) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        element.removeEventListener("loadedmetadata", onLoaded);
        element.removeEventListener("error", onError);
      };

      const onLoaded = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error("Unable to load the selected media file."));
      };

      element.addEventListener("loadedmetadata", onLoaded, { once: true });
      element.addEventListener("error", onError, { once: true });
    });
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
      this.sourceType = null;
      this.mediaState = null;
      this.mediaCompletionInFlight = null;
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

    buildRecognizer(config, audioConfigOverride) {
      ensureSpeechSdk();
      const speechConfig = window.SpeechSDK.SpeechConfig.fromSubscription(config.azureKey, config.azureRegion);
      const preferredProcessingLanguage = getPreferredProcessingLanguage(config);
      const audioConfig = audioConfigOverride || window.SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      speechConfig.outputFormat = window.SpeechSDK.OutputFormat.Detailed;
      speechConfig.enableDictation();
      speechConfig.setProperty(window.SpeechSDK.PropertyId.SpeechServiceResponse_RequestWordLevelTimestamps, "true");
      speechConfig.setProperty(window.SpeechSDK.PropertyId.SpeechServiceResponse_PostProcessingOption, "TrueText");

      if (preferredProcessingLanguage) {
        speechConfig.speechRecognitionLanguage = preferredProcessingLanguage;
        return new window.SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      }

      speechConfig.setProperty(window.SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous");
      const autoDetectConfig = window.SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(config.recognitionLanguages);

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

        const preferredProcessingLanguage = getPreferredProcessingLanguage(this.currentConfig);
        let language = preferredProcessingLanguage;

        if (!language) {
          const autoDetectResult = window.SpeechSDK.AutoDetectSourceLanguageResult.fromResult(event.result);
          language = autoDetectResult ? autoDetectResult.language : null;
        }

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

        if (this.sourceType === "media") {
          if (!this.mediaCompletionInFlight) {
            this.finishMediaTranscription("error").catch((error) => console.error("Media transcription cleanup failed", error));
          }
          return;
        }

        if (this.keepAlive && !this.isStopping) {
          this.scheduleRestart();
        }
      };

      recognizer.sessionStopped = () => {
        this.callbacks.onStatus && this.callbacks.onStatus("Session stopped.");
        safeCloseRecognizer(this.recognizer);
        this.recognizer = null;

        if (this.sourceType === "media") {
          if (!this.mediaCompletionInFlight && !this.isStopping) {
            this.finishMediaTranscription("stopped").catch((error) => console.error("Media session cleanup failed", error));
          }
          return;
        }

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
      this.sourceType = "microphone";

      await this.requestMicrophonePermission();
      await this.startRecognizer();
    }

    async startRecognizer(audioConfigOverride) {
      const recognizer = this.buildRecognizer(this.currentConfig, audioConfigOverride);
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

    isSupportedMediaFile(file) {
      if (!file) {
        return false;
      }

      const mimeType = (file.type || "").toLowerCase();
      if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) {
        return true;
      }

      return /\.(mp3|wav|m4a|aac|ogg|webm|mp4|mov|mkv)$/i.test(file.name || "");
    }

    async createMediaState(file) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("This browser does not support uploaded media transcription.");
      }

      const mediaElement = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
      const objectUrl = URL.createObjectURL(file);
      mediaElement.src = objectUrl;
      mediaElement.preload = "auto";
      mediaElement.playsInline = true;
      mediaElement.controls = false;
      mediaElement.muted = true;
      mediaElement.style.display = "none";
      document.body.appendChild(mediaElement);

      await waitForMediaMetadata(mediaElement);

      const audioContext = new AudioContextCtor();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const format = window.SpeechSDK.AudioStreamFormat.getWaveFormatPCM(MEDIA_SAMPLE_RATE, 16, 1);
      const pushStream = window.SpeechSDK.AudioInputStream.createPushStream(format);
      const audioConfig = window.SpeechSDK.AudioConfig.fromStreamInput(pushStream);
      const mediaSource = audioContext.createMediaElementSource(mediaElement);
      const processor = audioContext.createScriptProcessor(MEDIA_BUFFER_SIZE, 2, 1);
      const muteGain = audioContext.createGain();
      let streamClosed = false;

      muteGain.gain.value = 0;

      const stopFeeding = () => {
        if (streamClosed) {
          return;
        }

        streamClosed = true;
        processor.onaudioprocess = null;

        try {
          mediaSource.disconnect();
        } catch (error) {
          console.warn("Media source disconnect failed", error);
        }

        try {
          processor.disconnect();
        } catch (error) {
          console.warn("Processor disconnect failed", error);
        }

        try {
          muteGain.disconnect();
        } catch (error) {
          console.warn("Gain disconnect failed", error);
        }

        try {
          pushStream.close();
        } catch (error) {
          console.warn("Push stream close failed", error);
        }
      };

      processor.onaudioprocess = (event) => {
        if (streamClosed) {
          return;
        }

        const mono = downmixToMono(event.inputBuffer);
        const resampled = resampleAudio(mono, audioContext.sampleRate, MEDIA_SAMPLE_RATE);
        if (!resampled.length) {
          return;
        }

        pushStream.write(encodePcm16(resampled));
      };

      mediaSource.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioContext.destination);

      mediaElement.addEventListener("ended", () => {
        if (!this.mediaCompletionInFlight) {
          this.finishMediaTranscription("completed").catch((error) => console.error("Unable to finalize media transcription", error));
        }
      });

      return {
        fileName: file.name,
        durationMs: Number.isFinite(mediaElement.duration) && mediaElement.duration > 0 ? Math.round(mediaElement.duration * 1000) : 0,
        element: mediaElement,
        objectUrl,
        audioContext,
        audioConfig,
        stopFeeding,
        start: async () => {
          if (audioContext.state === "suspended") {
            await audioContext.resume();
          }
          await mediaElement.play();
        },
      };
    }

    async cleanupMediaState() {
      const mediaState = this.mediaState;
      this.mediaState = null;

      if (!mediaState) {
        return;
      }

      safePauseMedia(mediaState.element);

      if (typeof mediaState.stopFeeding === "function") {
        mediaState.stopFeeding();
      }

      if (mediaState.audioContext) {
        try {
          await mediaState.audioContext.close();
        } catch (error) {
          console.warn("Audio context close failed", error);
        }
      }

      if (mediaState.element && mediaState.element.parentNode) {
        mediaState.element.parentNode.removeChild(mediaState.element);
      }

      if (mediaState.objectUrl) {
        URL.revokeObjectURL(mediaState.objectUrl);
      }
    }

    async startMediaTranscription(config, file) {
      ensureSpeechSdk();

      if (!file) {
        throw new Error("Please upload an audio or video file.");
      }

      if (!this.isSupportedMediaFile(file)) {
        throw new Error("Please upload an audio or video file.");
      }

      if (!config.azureKey || !config.azureRegion) {
        throw new Error("Azure Speech settings are incomplete.");
      }

      this.currentConfig = { ...config };
      this.keepAlive = false;
      this.isStopping = false;
      this.retryCount = 0;
      this.sourceType = "media";
      await this.cleanupMediaState();

      const mediaState = await this.createMediaState(file);
      this.mediaState = mediaState;
      await this.startRecognizer(mediaState.audioConfig);
      this.callbacks.onStatus && this.callbacks.onStatus("Processing uploaded media");
      await mediaState.start();

      return {
        fileName: mediaState.fileName,
        durationMs: mediaState.durationMs,
        mimeType: file.type || "",
      };
    }

    async finishMediaTranscription(reason) {
      if (this.mediaCompletionInFlight) {
        return this.mediaCompletionInFlight;
      }

      const recognizer = this.recognizer;
      const mediaState = this.mediaState;
      this.keepAlive = false;
      this.isStopping = true;

      this.mediaCompletionInFlight = (async () => {
        if (mediaState && typeof mediaState.stopFeeding === "function") {
          mediaState.stopFeeding();
        }

        if (recognizer) {
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

        await this.cleanupMediaState();
        this.sourceType = null;
        this.isStopping = false;

        const payload = {
          reason,
          durationMs: mediaState && mediaState.durationMs ? mediaState.durationMs : 0,
          fileName: mediaState && mediaState.fileName ? mediaState.fileName : "",
        };

        this.mediaCompletionInFlight = null;
        this.callbacks.onMediaCompleted && this.callbacks.onMediaCompleted(payload);
        return payload;
      })();

      return this.mediaCompletionInFlight;
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

      if (this.sourceType === "media") {
        await this.finishMediaTranscription("stopped");
        return;
      }

      if (!this.recognizer) {
        this.sourceType = null;
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

      this.sourceType = null;
    }
  }

  window.AzureSpeechService = AzureSpeechService;
})();