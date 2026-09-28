function defaultAudioContextFactory() {
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

function preparationError(message, details, cause) {
  const error = new Error(message);
  error.cause = cause;
  Object.assign(error, details);
  return error;
}

function nowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function reportAudioFailure(error) {
  const details = {
    stage: error?.stage,
    asset: error?.assetId,
    url: error?.url,
    status: error?.status,
    contentType: error?.contentType,
    bytes: error?.bytes,
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
    failures: error?.failures?.map?.((failure) => ({
      stage: failure?.stage, asset: failure?.assetId, url: failure?.url,
      status: failure?.status, contentType: failure?.contentType,
      name: failure?.cause?.name ?? failure?.name,
      message: failure?.cause?.message ?? failure?.message,
    })),
  };
  console.error('[PREP_FAILED]', JSON.stringify(details));
}

export class CosmicAudioDirector {
  constructor({
    audioContextFactory = defaultAudioContextFactory,
    stemUrl = null,
    soundEffects = [],
    fetcher = globalThis.fetch?.bind(globalThis),
    now = () => globalThis.performance?.now?.() ?? Date.now(),
    gain = 0.34,
    outputGain = 0.78,
    startLeadSeconds = 0.08,
    ambientElements = [],
  } = {}) {
    this.audioContextFactory = audioContextFactory;
    this.stemUrl = stemUrl;
    this.soundEffects = Array.from(soundEffects || []);
    this.fetcher = fetcher;
    this.now = now;
    this.gainValue = gain;
    this.outputGainValue = outputGain;
    this.startLeadSeconds = Math.max(0.02, Number(startLeadSeconds) || 0.08);
    this.ambientElements = Array.from(ambientElements || []).filter(Boolean);
    this.context = null;
    this.output = null;
    this.compressor = null;
    this.buffers = new Map();
    this.source = null;
    this.gainNode = null;
    this.voices = [];
    this.audioStartedAt = null;
    this.visualStartedAt = null;
    this.timelineOffsetSeconds = 0;
    this.authoritative = false;
    this.preloaded = false;
    this.destroyed = false;
  }

  ensureContext() {
    if (this.destroyed) throw new Error('Cosmic audio has been destroyed');
    this.context ||= this.audioContextFactory?.() ?? null;
    if (!this.context) throw new Error('Web Audio is required to prepare the cinematic mix');
    if (!this.output) {
      this.output = this.context.createGain();
      this.output.gain.value = this.outputGainValue;
      this.compressor = this.context.createDynamicsCompressor?.() ?? null;
      if (this.compressor) {
        this.compressor.threshold.value = -5;
        this.compressor.knee.value = 5;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.004;
        this.compressor.release.value = 0.18;
        this.output.connect(this.compressor);
        this.compressor.connect(this.context.destination);
      } else {
        this.output.connect(this.context.destination);
      }
    }
    return this.context;
  }

  getMixOutput() {
    this.ensureContext();
    return this.output;
  }

  async #loadBuffer({ id, url }) {
    const startedAt = nowMs();
    console.info('[AUDIO] asset start', JSON.stringify({ asset: id, url }));
    let response;
    try {
      response = await this.fetcher(url);
    } catch (cause) {
      const error = preparationError(`${id} fetch failed: ${cause?.message ?? cause}`, {
        stage: 'audio-fetch', assetId: id, url,
      }, cause);
      reportAudioFailure(error);
      throw error;
    }
    const status = Number.isFinite(response?.status) ? response.status : null;
    const contentType = response?.headers?.get?.('content-type') ?? null;
    if (!response?.ok) {
      const error = preparationError(`${id} returned HTTP ${status ?? 'error'}`, {
        stage: 'audio-fetch', assetId: id, url, status, contentType,
      });
      reportAudioFailure(error);
      throw error;
    }
    let bytes;
    try {
      bytes = await response.arrayBuffer();
    } catch (cause) {
      const error = preparationError(`${id} response could not be read: ${cause?.message ?? cause}`, {
        stage: 'audio-read', assetId: id, url, status, contentType,
      }, cause);
      reportAudioFailure(error);
      throw error;
    }
    const byteLength = bytes?.byteLength ?? 0;
    console.info('[AUDIO] asset fetched', JSON.stringify({ asset: id, url, status, contentType, bytes: byteLength }));
    let buffer;
    try {
      buffer = await this.context.decodeAudioData(bytes);
    } catch (cause) {
      const error = preparationError(`${id} decode failed: ${cause?.message ?? cause}`, {
        stage: 'audio-decode', assetId: id, url, status, contentType, bytes: byteLength,
      }, cause);
      reportAudioFailure(error);
      throw error;
    }
    if (!buffer || !(buffer.duration > 0)) {
      const error = preparationError(`${id} decoded to an empty buffer`, {
        stage: 'audio-decode', assetId: id, url, status, contentType, bytes: byteLength,
      });
      reportAudioFailure(error);
      throw error;
    }
    this.buffers.set(id, buffer);
    console.info('[AUDIO] asset decoded', JSON.stringify({
      asset: id, url, status, contentType, bytes: byteLength,
      durationSeconds: buffer.duration, elapsedMs: Math.round(nowMs() - startedAt),
    }));
    return buffer;
  }

  async preload() {
    if (this.preloaded) return true;
    if (this.destroyed) throw new Error('Cosmic audio has been destroyed');
    if (typeof this.fetcher !== 'function') throw new Error('The audio assets cannot be fetched');
    try {
      console.info('[AUDIO] context start');
      this.ensureContext();
      if (this.context.state === 'closed') {
        throw preparationError('Web Audio context is closed', { stage: 'audio-context' });
      }
      console.info('[AUDIO] context ready', JSON.stringify({ state: this.context.state, sampleRate: this.context.sampleRate }));
      const assets = [
        ...(this.stemUrl ? [{ id: 'event-stem', url: this.stemUrl }] : []),
        ...this.soundEffects.map(({ id, url }) => ({ id, url })),
      ];
      if (assets.length === 0) {
        throw preparationError('No local cinematic audio assets were configured', { stage: 'audio-manifest' });
      }
      const results = await Promise.allSettled(assets.map((asset) => this.#loadBuffer(asset)));
      const failures = results
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason);
      if (failures.length) {
        const error = preparationError(
          `${failures.length} critical audio asset${failures.length === 1 ? '' : 's'} failed to prepare`,
          { stage: failures[0]?.stage ?? 'audio-preload', failures },
          failures[0],
        );
        reportAudioFailure(error);
        throw error;
      }
      this.preloaded = true;
      return true;
    } catch (error) {
      this.buffers.clear();
      this.preloaded = false;
      const wrapped = preparationError(
        'A critical cinematic sound effect could not be loaded and decoded',
        { stage: error?.stage ?? 'audio-context' },
        error,
      );
      if (error?.failures) reportAudioFailure(wrapped);
      else if (!error?.assetId) reportAudioFailure(wrapped);
      throw wrapped;
    }
  }

  silenceAmbient() {
    for (const element of this.ambientElements) {
      try { element?.pause?.(); } catch {}
    }
  }

  /** Unlock Web Audio synchronously from the user's start gesture. */
  resumeFromGesture() {
    if (!this.preloaded || !this.context || this.destroyed) {
      throw new Error('Cosmic audio must be prepared before the start gesture');
    }
    this.silenceAmbient();
    this.authoritative = false;
    return this.context.resume?.();
  }

  #createVoice(buffer, {
    at,
    gain,
    fadeIn = 0.035,
    fadeOut = 0,
    duration = null,
    lowpassHz = null,
    sourceOffset = 0,
  } = {}) {
    const source = this.context.createBufferSource();
    const voiceGain = this.context.createGain();
    source.buffer = buffer;
    let output = source;
    let filter = null;
    if (Number.isFinite(lowpassHz) && lowpassHz > 0) {
      filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(lowpassHz, this.context.sampleRate / 2), at);
      source.connect(filter);
      output = filter;
    }
    output.connect(voiceGain);
    voiceGain.connect(this.output);
    const param = voiceGain.gain;
    param.setValueAtTime(0, at);
    param.linearRampToValueAtTime(Math.max(0, Math.min(1, gain)), at + Math.max(0.005, fadeIn));
    const voice = { source, gainNode: voiceGain, filter, at, gain, stopped: false };
    if (Number.isFinite(duration) && duration > 0) {
      const endAt = at + duration;
      const fadeDuration = Math.max(0, Math.min(fadeOut, duration));
      if (fadeDuration > 0) {
        const fadeAt = Math.max(at + Math.max(0.005, fadeIn), endAt - fadeDuration);
        param.setValueAtTime(Math.max(0, Math.min(1, gain)), fadeAt);
        param.linearRampToValueAtTime(0, endAt);
      }
      try { source.stop(endAt + 0.015); } catch {}
    }
    source.onended = () => {
      try { source.disconnect?.(); } catch {}
      try { filter?.disconnect?.(); } catch {}
      try { voiceGain.disconnect?.(); } catch {}
      this.voices = this.voices.filter((candidate) => candidate !== voice);
    };
    if (sourceOffset > 0) source.start(at, sourceOffset);
    else source.start(at);
    this.voices.push(voice);
    return voice;
  }

  async start({ beforeT0 = null, getElapsedSeconds = () => 0 } = {}) {
    if (!this.preloaded || !this.context || !this.output) throw new Error('Cosmic audio must be decoded before start');
    this.silenceAmbient();
    this.authoritative = false;
    try {
      // Resume from the gesture and map decoded SFX to the current visual time.
      // The controller does not await this promise, so Safari cannot freeze T0.
      await Promise.all([this.context.resume?.(), Promise.resolve(beforeT0)]);
      if (this.context.state && this.context.state !== 'running') throw new Error('AudioContext did not resume from the start gesture');
      const t0 = this.context.currentTime + this.startLeadSeconds;
      this.timelineOffsetSeconds = Math.max(0, Number(getElapsedSeconds?.()) || 0);
      this.audioStartedAt = t0;
      this.visualStartedAt = null;
      const stemBuffer = this.buffers.get('event-stem');
      if (stemBuffer) {
        const stem = this.#createVoice(stemBuffer, {
          at: t0,
          gain: this.gainValue,
          fadeIn: 0.055,
        });
        this.source = stem.source;
        this.gainNode = stem.gainNode;
      }
      for (const effect of this.soundEffects) {
        for (const cue of effect.cues?.length ? effect.cues : [effect]) {
          const remaining = (Math.max(0, Number(cue.at ?? effect.at) || 0)
            - this.timelineOffsetSeconds - this.startLeadSeconds);
          // The visual cue already passed while a mobile context resumed. Never
          // replay an old impact late; only schedule cues that still lie ahead.
          if (remaining < 0) continue;
          this.#createVoice(this.buffers.get(effect.id), {
            at: t0 + remaining,
            gain: Number(cue.gain ?? effect.gain) || 0,
            fadeIn: cue.fadeIn ?? effect.fadeIn,
            fadeOut: cue.fadeOut ?? effect.fadeOut,
            duration: cue.duration ?? effect.duration,
            lowpassHz: cue.lowpassHz ?? effect.lowpassHz,
            sourceOffset: cue.sourceOffset ?? 0,
          });
        }
      }
      this.authoritative = true;
      return t0;
    } catch (error) {
      this.stop();
      throw new Error('Browser audio could not be unlocked by the start gesture', { cause: error });
    }
  }

  isAuthoritative() {
    return this.authoritative && (!this.context?.state || this.context.state === 'running');
  }

  currentTime() {
    if (this.authoritative && this.context && this.audioStartedAt != null) {
      return Math.max(0, this.context.currentTime - this.audioStartedAt);
    }
    if (this.visualStartedAt == null) this.visualStartedAt = this.now();
    return Math.max(0, (this.now() - this.visualStartedAt) / 1000);
  }

  fadeOutAndStopAt(when, seconds = 0.4) {
    if (!this.source || !this.context || !Number.isFinite(when)) return;
    const duration = Math.max(0.02, Number(seconds) || 0.4);
    const start = Math.max(this.context.currentTime, when - duration);
    const gainParam = this.gainNode?.gain;
    try { gainParam?.cancelScheduledValues?.(start); } catch {}
    try { gainParam?.setValueAtTime?.(this.gainValue, start); } catch {}
    try { gainParam?.linearRampToValueAtTime?.(0, when); } catch {}
    try { this.source.stop(when + 0.01); } catch {}
  }

  fadeOutAndStop(seconds = 0.25) {
    if (!this.context) return;
    this.fadeOutAndStopAt(this.context.currentTime + Math.max(0.02, seconds), seconds);
  }

  stop() {
    for (const voice of [...this.voices]) {
      if (!voice.stopped) {
        voice.stopped = true;
        try { voice.source.stop(); } catch {}
      }
      try { voice.source.disconnect?.(); } catch {}
      try { voice.filter?.disconnect?.(); } catch {}
      try { voice.gainNode.disconnect?.(); } catch {}
    }
    this.voices = [];
    this.source = null;
    this.gainNode = null;
    this.authoritative = false;
    this.audioStartedAt = null;
  }

  async destroy() {
    if (this.destroyed) return;
    this.stop();
    const context = this.context;
    this.destroyed = true;
    this.context = null;
    this.output = null;
    this.compressor = null;
    this.buffers.clear();
    this.preloaded = false;
    try { await context?.close?.(); } catch {}
  }
}
