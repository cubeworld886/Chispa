const HAVE_FUTURE_DATA = 3;

function createAudioElement(doc) {
  if (typeof doc?.createElement === 'function') return doc.createElement('audio');
  if (typeof globalThis.Audio === 'function') return new globalThis.Audio();
  return null;
}

/** Streams the existing long-form page track through the same Web Audio mix bus.
 * Only the first decodable media data is needed before the critical scene starts;
 * the short SFX recordings are decoded fully by the audio director.
 */
export class PageMusicDirector {
  constructor({ url, audioContext, output, doc = globalThis.document, legacyElements = [], gain = 0.68 } = {}) {
    this.url = url;
    this.audioContext = audioContext;
    this.output = output;
    this.doc = doc;
    this.deferStreamUntilGesture = Boolean(
      doc?.defaultView?.matchMedia?.('(pointer: coarse)')?.matches
      || doc?.defaultView?.navigator?.connection?.saveData,
    );
    this.legacyElements = Array.from(legacyElements || []).filter(Boolean);
    this.gainValue = Math.max(0, Math.min(1, Number(gain) || 0));
    this.track = null;
    this.source = null;
    this.gainNode = null;
    this.preloaded = false;
    this.primed = false;
    this.playPromise = null;
    this.cueAt = null;
    this.destroyed = false;
  }

  silenceLegacy() {
    for (const element of this.legacyElements) {
      try { element?.pause?.(); } catch {}
    }
  }

  async preload() {
    if (this.preloaded) return true;
    if (this.destroyed || !this.url || !this.audioContext || !this.output) {
      throw new Error('The existing page music cannot be prepared');
    }
    const track = createAudioElement(this.doc);
    if (!track || typeof this.audioContext.createMediaElementSource !== 'function') {
      throw new Error('Streaming page music requires an HTML audio element and Web Audio routing');
    }
    const deferReason = this.deferStreamUntilGesture
      ? (this.doc?.defaultView?.matchMedia?.('(pointer: coarse)')?.matches ? 'pointer-coarse' : 'save-data')
      : null;
    console.info('[AUDIO] page music start', JSON.stringify({
      asset: 'page-music', url: this.url, deferUntilGesture: this.deferStreamUntilGesture, deferReason,
    }));
    track.preload = this.deferStreamUntilGesture ? 'none' : 'auto';
    track.autoplay = false;
    track.loop = false;
    track.crossOrigin = 'anonymous';
    track.playsInline = true;
    track.src = this.url;
    const source = this.audioContext.createMediaElementSource(track);
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    source.connect(gainNode);
    gainNode.connect(this.output);
    this.track = track;
    this.source = source;
    this.gainNode = gainNode;

    // Mobile browsers commonly ignore preload=auto until a user gesture. Let
    // the prepared scene reach its single Entrar action; that click primes the
    // stream, but visual T0 never waits for a network-bound play() promise.
    if (this.deferStreamUntilGesture) {
      this.preloaded = true;
      console.info('[AUDIO] page music deferred to start gesture', JSON.stringify({ asset: 'page-music', url: this.url, deferReason }));
      return true;
    }

    try {
      await new Promise((resolve, reject) => {
        const ready = () => Number(track.readyState) >= HAVE_FUTURE_DATA;
        if (ready()) { resolve(); return; }
        const onCanPlay = () => {
          cleanup();
          console.info('[AUDIO] page music canplay', JSON.stringify({
            asset: 'page-music', url: track.currentSrc || this.url,
            readyState: track.readyState, networkState: track.networkState,
          }));
          resolve();
        };
        const onError = () => {
          cleanup();
          const mediaError = track.error;
          const error = new Error(`Page music failed before canplay (MediaError ${mediaError?.code ?? 'unknown'})`);
          error.name = mediaError?.name || 'MediaError';
          error.stage = 'music-canplay';
          error.assetId = 'page-music';
          error.url = track.currentSrc || this.url;
          error.cause = mediaError;
          console.error('[PREP_FAILED]', JSON.stringify({
            stage: error.stage, asset: error.assetId, url: error.url,
            readyState: track.readyState, networkState: track.networkState,
            mediaErrorCode: mediaError?.code, name: error.name,
            message: error.message, stack: error.stack,
          }));
          reject(error);
        };
        const cleanup = () => {
          track.removeEventListener?.('canplay', onCanPlay);
          track.removeEventListener?.('error', onError);
        };
        track.addEventListener?.('canplay', onCanPlay, { once: true });
        track.addEventListener?.('error', onError, { once: true });
        track.load?.();
        if (ready()) { cleanup(); resolve(); }
      });
      this.preloaded = true;
      return true;
    } catch (error) {
      this.destroy();
      const wrapped = new Error(`The existing music track has no playable opening data: ${error?.message ?? error}`);
      wrapped.stage = error?.stage ?? 'music-preload';
      wrapped.assetId = error?.assetId ?? 'page-music';
      wrapped.url = error?.url ?? this.url;
      wrapped.cause = error;
      console.error('[PREP_FAILED]', JSON.stringify({
        stage: wrapped.stage, asset: wrapped.assetId, url: wrapped.url,
        name: error?.name ?? wrapped.name, message: error?.message ?? wrapped.message,
        stack: error?.stack ?? wrapped.stack,
      }));
      throw wrapped;
    }
  }

  /** Must be called directly from the user's start gesture while the gain is zero. */
  primeFromGesture() {
    if (!this.preloaded || !this.track || this.destroyed) {
      throw new Error('Page music must be prepared before the start gesture');
    }
    if (this.primed) return this.playPromise ?? Promise.resolve(true);
    this.silenceLegacy();
    this.track.preload = 'auto';
    try { this.track.currentTime = 0; } catch {}
    this.playPromise = Promise.resolve(this.track.play?.()).then(() => {
      this.primed = true;
      return true;
    });
    return this.playPromise;
  }

  scheduleAt(when) {
    if (!this.preloaded || !Number.isFinite(when)) return false;
    this.cueAt = when;
    return true;
  }

  /** Called by the central visual playhead when it reaches the musical cue. */
  startFromBeginning(rampSeconds = 1.35) {
    if (!this.preloaded || !this.primed || !this.track || !this.gainNode || this.destroyed) return false;
    const now = this.audioContext.currentTime;
    const gain = this.gainNode.gain;
    try {
      this.track.currentTime = 0;
    } catch {
      return false;
    }
    if (this.track.paused) {
      try { this.playPromise = Promise.resolve(this.track.play?.()); } catch { return false; }
    }
    try { gain.cancelScheduledValues(now); } catch {}
    gain.setValueAtTime(0, now);
    gain.linearRampToValueAtTime(this.gainValue, now + Math.max(0.05, rampSeconds));
    return true;
  }

  keepPlayingThroughIdle() {
    return this.primed && !this.destroyed;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    try { this.gainNode?.gain?.cancelScheduledValues?.(this.audioContext?.currentTime ?? 0); } catch {}
    try { this.gainNode?.disconnect?.(); } catch {}
    try { this.source?.disconnect?.(); } catch {}
    try { this.track?.pause?.(); } catch {}
    if (this.track) {
      try { this.track.removeAttribute?.('src'); } catch {}
      try { this.track.load?.(); } catch {}
    }
    this.track = null;
    this.source = null;
    this.gainNode = null;
    this.playPromise = null;
    this.preloaded = false;
    this.primed = false;
  }
}
