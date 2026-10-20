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
  constructor({ url, outroUrl = null, audioContext, output, doc = globalThis.document, legacyElements = [], gain = 0.68 } = {}) {
    this.outroUrl = outroUrl;
    this.outroTrack = null;
    this.outroSource = null;
    this.outroGainNode = null;
    this.outroPrimed = false;
    this.outroPrimingPromise = null;
    this.outroStarted = false;
    this.currentPrimaryGain = gain;
    this.outroGainValue = 0.64;
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
    if (this.outroUrl) {
      // The two streams are prepared on the same music bus. Safari needs
      // its first play on the user's Entrar gesture, even though it is silent.
      const outro = createAudioElement(this.doc);
      if (!outro) throw new Error('The narrative outro audio element is unavailable');
      outro.preload = 'none';
      outro.autoplay = false;
      outro.loop = true;
      outro.playsInline = true;
      outro.crossOrigin = 'anonymous';
      outro.src = this.outroUrl;
      const outroSource = this.audioContext.createMediaElementSource(outro);
      const outroGain = this.audioContext.createGain();
      outroGain.gain.value = 0;
      outroSource.connect(outroGain);
      outroGain.connect(this.output);
      this.outroTrack = outro;
      this.outroSource = outroSource;
      this.outroGainNode = outroGain;
    }

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
    // Start the hidden outro while the same user gesture is still active.
    // It stays silent on a Web Audio gain node until the final seven bubbles.
    if (this.outroTrack) {
      this.outroTrack.preload = 'auto';
      try {
        this.outroPrimingPromise = Promise.resolve(this.outroTrack.play?.()).then(() => {
          this.outroPrimed = true;
          return true;
        }, (error) => {
          console.warn('[Chispa] Outro preflight deferred by browser.', error);
          return false;
        });
      } catch (error) {
        console.warn('[Chispa] Outro preflight failed; will retry at the end.', error);
      }
    }
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

  fadePrimaryForRemaining(remaining, durationSeconds = 35) {
    if (!this.outroUrl || this.destroyed || !this.gainNode || remaining > 11 || remaining < 7) return false;
    if (this.primaryFadeActive) return true;
    if (remaining !== 11) return false;
    // The outro is cued by the exact number of remaining bubbles, not a
    // wall-clock timer. Fade prairie continuously across the next four
    // messages, with duration estimated from their reading cadence.
    const now = this.audioContext.currentTime;
    const duration = Math.max(18, Math.min(105, Number(durationSeconds) || 35));
    const gain = this.gainNode.gain;
    try {
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(this.currentPrimaryGain, now);
      gain.linearRampToValueAtTime(0, now + duration);
      this.primaryFadeActive = true;
      this.primaryFadeStartedAt = now;
      this.primaryFadeDuration = duration;
      return true;
    } catch (error) {
      console.warn('[Chispa] Prairie fade could not be scheduled.', error);
      return false;
    }
  }

  startNarrativeOutro() {
    if (this.destroyed || this.outroStarted || !this.outroTrack || !this.outroGainNode) return false;
    const now = this.audioContext.currentTime;
    const track = this.outroTrack;
    const fadeIn = 6.2;
    // The stream was unlocked from Entrar, but reset it so Yo Quisiera
    // starts at its actual beginning, not at a position in a silent loop.
    try { track.currentTime = 0; } catch {}
    track.loop = false;
    if (track.paused) {
      try {
        this.outroPrimingPromise = Promise.resolve(track.play?.()).then(() => true, (error) => {
          console.warn('[Chispa] Safari blocked the outro stream.', error);
          return false;
        });
      } catch (error) {
        console.warn('[Chispa] Outro could not resume.', error);
        return false;
      }
    }
    try {
      const outroGain = this.outroGainNode.gain;
      outroGain.cancelScheduledValues(now);
      outroGain.setValueAtTime(0, now);
      outroGain.linearRampToValueAtTime(this.outroGainValue, now + fadeIn);
      if (this.gainNode) {
        const ambientGain = this.gainNode.gain;
        ambientGain.cancelScheduledValues(now);
        const actualLevel = Number.isFinite(ambientGain.value) ? ambientGain.value : this.currentPrimaryGain;
        ambientGain.setValueAtTime(actualLevel, now);
        ambientGain.linearRampToValueAtTime(0, now + 4.0);
      }
      this.currentPrimaryGain = 0;
      this.primaryFadeActive = false;
      this.outroFadeEndsAt = now + fadeIn;
      this.outroStarted = true;
      return true;
    } catch (error) {
      console.warn('[Chispa] Outro crossfade could not be scheduled.', error);
      return false;
    }
  }

  keepPlayingThroughIdle() {
    return this.primed && !this.destroyed;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    try { this.gainNode?.gain?.cancelScheduledValues?.(this.audioContext?.currentTime ?? 0); } catch {}
    try { this.outroGainNode?.gain?.cancelScheduledValues?.(this.audioContext?.currentTime ?? 0); } catch {}
    try { this.outroTrack?.pause?.(); } catch {}
    try { this.outroTrack?.removeAttribute?.('src'); this.outroTrack?.load?.(); } catch {}
    try { this.outroSource?.disconnect?.(); this.outroGainNode?.disconnect?.(); } catch {}
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
    this.outroSource = null;
    this.outroGainNode = null;
    this.outroTrack = null;
    this.outroPrimingPromise = null;
    this.playPromise = null;
    this.preloaded = false;
    this.primed = false;
  }
}
