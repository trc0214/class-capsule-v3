(function () {
  const SPEECH_SAMPLE_RATE = 16000;
  const AUDIO_BUFFER_SIZE = 4096;
  const MIC_CONSTRAINTS = {
    audio: {
      channelCount: 1,
      sampleRate: SPEECH_SAMPLE_RATE,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  };
  const QUALITY_REPORT_INTERVAL_MS = 900;
  const TARGET_SPEECH_RMS = 0.08;
  const MAX_GAIN = 3.5;
  const MIN_GAIN = 0.85;
  const MIN_SIGNAL_RMS = 0.012;
  const PRE_ROLL_MS = 220;
  const VAD_START_MS = 180;
  const VAD_RELEASE_MS = 650;

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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function computeRms(samples) {
    if (!samples || !samples.length) {
      return 0;
    }

    let sum = 0;
    for (let index = 0; index < samples.length; index += 1) {
      sum += samples[index] * samples[index];
    }

    return Math.sqrt(sum / samples.length);
  }

  function computePeak(samples) {
    if (!samples || !samples.length) {
      return 0;
    }

    let peak = 0;
    for (let index = 0; index < samples.length; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index]));
    }

    return peak;
  }

  function applyGain(samples, gain) {
    const output = new Float32Array(samples.length);

    for (let index = 0; index < samples.length; index += 1) {
      output[index] = clamp(samples[index] * gain, -1, 1);
    }

    return output;
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
      this.microphoneState = null;
      this.mediaCompletionInFlight = null;
    }

    on(callbacks) {
      this.callbacks = callbacks || {};
    }

    async requestMicrophonePermission() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("This browser does not support microphone access.");
      }

      this.permissionStream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      this.permissionStream.getTracks().forEach((track) => track.stop());
      this.permissionStream = null;
    }

    buildPushAudioConfig() {
      const format = window.SpeechSDK.AudioStreamFormat.getWaveFormatPCM(SPEECH_SAMPLE_RATE, 16, 1);
      const pushStream = window.SpeechSDK.AudioInputStream.createPushStream(format);
      return {
        pushStream,
        audioConfig: window.SpeechSDK.AudioConfig.fromStreamInput(pushStream),
      };
    }

    reportAudioQuality(payload) {
      this.callbacks.onAudioQuality && this.callbacks.onAudioQuality(payload);
    }

    resolveAudioIssue(metrics, state, frameDurationMs) {
      const lowVolumeThreshold = Math.max(MIN_SIGNAL_RMS * 0.85, state.noiseFloor * 1.3);
      const noisyThreshold = 0.018;

      state.lowVolumeMs = metrics.rms < lowVolumeThreshold ? state.lowVolumeMs + frameDurationMs : Math.max(0, state.lowVolumeMs - frameDurationMs * 0.6);
      state.clippingMs = metrics.peak > 0.98 ? state.clippingMs + frameDurationMs : Math.max(0, state.clippingMs - frameDurationMs);
      state.highNoiseMs = !state.speechActive && state.noiseFloor > noisyThreshold
        ? state.highNoiseMs + frameDurationMs
        : Math.max(0, state.highNoiseMs - frameDurationMs * 0.7);

      if (state.clippingMs >= 180) {
        return "clipping";
      }

      if (state.highNoiseMs >= 1800) {
        return "high-noise";
      }

      if (state.lowVolumeMs >= 2200) {
        return "low-volume";
      }

      return null;
    }

    maybeReportAudioQuality(state, metrics) {
      const now = Date.now();
      if (now - state.lastQualityReportAt < QUALITY_REPORT_INTERVAL_MS && state.lastReportedIssue === state.currentIssue) {
        return;
      }

      state.lastQualityReportAt = now;
      state.lastReportedIssue = state.currentIssue;
      this.reportAudioQuality({
        issue: state.currentIssue,
        rms: metrics.rms,
        peak: metrics.peak,
        noiseFloor: state.noiseFloor,
        isSpeechDetected: state.speechActive,
        silenceMs: state.silenceMs,
        speechMs: state.speechMs,
        sourceType: this.sourceType,
      });
    }

    trimPreRoll(state) {
      let totalDuration = state.preRoll.reduce((sum, frame) => sum + frame.durationMs, 0);
      while (state.preRoll.length && totalDuration > PRE_ROLL_MS) {
        totalDuration -= state.preRoll[0].durationMs;
        state.preRoll.shift();
      }
    }

    writeToPushStream(pushStream, frame) {
      if (!pushStream || !frame || !frame.buffer) {
        return;
      }

      pushStream.write(frame.buffer);
    }

    async createMicrophoneState() {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("This browser does not support advanced microphone processing.");
      }

      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      const audioContext = new AudioContextCtor({ sampleRate: SPEECH_SAMPLE_RATE });
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const highpass = audioContext.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;

      const lowpass = audioContext.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 7500;

      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const processor = audioContext.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1);
      const muteGain = audioContext.createGain();
      muteGain.gain.value = 0;

      const state = {
        pushStream: null,
        noiseFloor: MIN_SIGNAL_RMS * 0.65,
        currentGain: 1,
        speechActive: false,
        speechMs: 0,
        silenceMs: 0,
        lowVolumeMs: 0,
        clippingMs: 0,
        highNoiseMs: 0,
        currentIssue: null,
        lastReportedIssue: null,
        lastQualityReportAt: 0,
        preRoll: [],
        streamClosed: false,
      };

      const createAudioConfig = () => {
        if (state.pushStream) {
          try {
            state.pushStream.close();
          } catch (error) {
            console.warn("Microphone push stream close failed", error);
          }
        }

        const { pushStream, audioConfig } = this.buildPushAudioConfig();
        state.pushStream = pushStream;
        return audioConfig;
      };

      const stopFeeding = () => {
        if (state.streamClosed) {
          return;
        }

        state.streamClosed = true;
        processor.onaudioprocess = null;

        try {
          source.disconnect();
        } catch (error) {
          console.warn("Microphone source disconnect failed", error);
        }

        try {
          highpass.disconnect();
        } catch (error) {
          console.warn("High-pass disconnect failed", error);
        }

        try {
          lowpass.disconnect();
        } catch (error) {
          console.warn("Low-pass disconnect failed", error);
        }

        try {
          compressor.disconnect();
        } catch (error) {
          console.warn("Compressor disconnect failed", error);
        }

        try {
          processor.disconnect();
        } catch (error) {
          console.warn("Processor disconnect failed", error);
        }

        try {
          muteGain.disconnect();
        } catch (error) {
          console.warn("Mute gain disconnect failed", error);
        }

        stream.getTracks().forEach((track) => track.stop());

        if (state.pushStream) {
          try {
            state.pushStream.close();
          } catch (error) {
            console.warn("Microphone push stream close failed", error);
          }
        }

        this.reportAudioQuality({ issue: null, sourceType: "microphone" });
      };

      processor.onaudioprocess = (event) => {
        if (state.streamClosed) {
          return;
        }

        const mono = downmixToMono(event.inputBuffer);
        const resampled = resampleAudio(mono, audioContext.sampleRate, SPEECH_SAMPLE_RATE);
        if (!resampled.length) {
          return;
        }

        const rawRms = computeRms(resampled);
        const rawPeak = computePeak(resampled);
        const frameDurationMs = (resampled.length / SPEECH_SAMPLE_RATE) * 1000;

        state.noiseFloor = rawRms < state.noiseFloor * 1.8
          ? state.noiseFloor * 0.96 + rawRms * 0.04
          : state.noiseFloor * 0.995 + rawRms * 0.005;

        const speechThreshold = Math.max(MIN_SIGNAL_RMS, state.noiseFloor * 2.2);
        const isSpeechCandidate = rawRms >= speechThreshold || (rawPeak >= 0.08 && rawRms >= state.noiseFloor * 1.4);
        const desiredGain = isSpeechCandidate && rawRms > 0.001
          ? clamp(TARGET_SPEECH_RMS / rawRms, MIN_GAIN, MAX_GAIN)
          : 1;

        state.currentGain = state.currentGain * 0.82 + desiredGain * 0.18;
        const normalized = applyGain(resampled, state.currentGain);
        const processedMetrics = {
          rms: computeRms(normalized),
          peak: computePeak(normalized),
        };
        const frame = {
          buffer: encodePcm16(normalized),
          durationMs: frameDurationMs,
        };

        state.currentIssue = this.resolveAudioIssue(processedMetrics, state, frameDurationMs);

        if (!state.speechActive) {
          state.preRoll.push(frame);
          this.trimPreRoll(state);
        }

        if (isSpeechCandidate) {
          state.speechMs += frameDurationMs;
          state.silenceMs = 0;
        } else {
          state.speechMs = 0;
          state.silenceMs += frameDurationMs;
        }

        let frameAlreadyWritten = false;

        if (!state.speechActive && isSpeechCandidate && state.speechMs >= VAD_START_MS) {
          state.speechActive = true;
          state.preRoll.forEach((preRollFrame) => this.writeToPushStream(state.pushStream, preRollFrame));
          state.preRoll = [];
          frameAlreadyWritten = true;
        }

        if (state.speechActive) {
          if (!frameAlreadyWritten) {
            this.writeToPushStream(state.pushStream, frame);
          }
          if (!isSpeechCandidate && state.silenceMs >= VAD_RELEASE_MS) {
            state.speechActive = false;
            state.silenceMs = 0;
            state.preRoll = [];
          }
        }

        this.maybeReportAudioQuality(state, processedMetrics);
      };

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioContext.destination);

      return {
        stream,
        audioContext,
        createAudioConfig,
        stopFeeding,
      };
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
      await this.cleanupMicrophoneState();
      this.microphoneState = await this.createMicrophoneState();
      await this.startRecognizer();
    }

    async startRecognizer(audioConfigOverride) {
      let nextAudioConfig = audioConfigOverride;
      if (!nextAudioConfig && this.sourceType === "microphone" && this.microphoneState) {
        nextAudioConfig = this.microphoneState.createAudioConfig();
      }

      const recognizer = this.buildRecognizer(this.currentConfig, nextAudioConfig);
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

      const { pushStream, audioConfig } = this.buildPushAudioConfig();
      const mediaSource = audioContext.createMediaElementSource(mediaElement);
      const highpass = audioContext.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;
      const lowpass = audioContext.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 7500;
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      const processor = audioContext.createScriptProcessor(AUDIO_BUFFER_SIZE, 2, 1);
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
          highpass.disconnect();
        } catch (error) {
          console.warn("Media high-pass disconnect failed", error);
        }

        try {
          lowpass.disconnect();
        } catch (error) {
          console.warn("Media low-pass disconnect failed", error);
        }

        try {
          compressor.disconnect();
        } catch (error) {
          console.warn("Media compressor disconnect failed", error);
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
        const resampled = resampleAudio(mono, audioContext.sampleRate, SPEECH_SAMPLE_RATE);
        if (!resampled.length) {
          return;
        }

        pushStream.write(encodePcm16(resampled));
      };

      mediaSource.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(processor);
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

    async cleanupMicrophoneState() {
      const microphoneState = this.microphoneState;
      this.microphoneState = null;

      if (!microphoneState) {
        return;
      }

      if (typeof microphoneState.stopFeeding === "function") {
        microphoneState.stopFeeding();
      }

      if (microphoneState.audioContext) {
        try {
          await microphoneState.audioContext.close();
        } catch (error) {
          console.warn("Microphone audio context close failed", error);
        }
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

      await this.cleanupMicrophoneState();
      this.sourceType = null;
    }
  }

  window.AzureSpeechService = AzureSpeechService;
})();