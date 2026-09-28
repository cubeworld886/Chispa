import { completedProgressFor, IDLE_SECONDS, LAVENDER_REVEAL_SECONDS, MUSIC_CUE_SECONDS, phaseAt, samplePhaseWindows } from './timeline.js?prepdiag=20260928g';

export const COSMIC_STATE_KEY = 'chispa_cosmic_event_v1';

function defaultScheduler() {
  return {
    requestAnimationFrame: (fn) => globalThis.requestAnimationFrame(fn),
    cancelAnimationFrame: (id) => globalThis.cancelAnimationFrame(id),
    now: () => globalThis.performance?.now?.() ?? Date.now(),
  };
}

function safePersist(storage) {
  try { storage?.setItem?.(COSMIC_STATE_KEY, JSON.stringify({ version: 1, completed: true })); } catch {}
}


const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

async function tracePreparationStep(stage, prepare) {
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  console.info(`[PREP] ${stage} start`);
  try {
    const result = await prepare();
    console.info(`[PREP] ${stage} ok`, JSON.stringify({
      elapsedMs: Math.round((globalThis.performance?.now?.() ?? Date.now()) - startedAt),
      result: result === false ? false : 'ready',
    }));
    return result;
  } catch (cause) {
    const error = new Error(`${stage} failed: ${cause?.message ?? cause}`);
    error.cause = cause;
    error.stage = cause?.stage ?? stage;
    for (const key of ['assetId', 'url', 'status', 'contentType', 'bytes']) {
      if (cause?.[key] != null) error[key] = cause[key];
    }
    console.error('[PREP_FAILED]', JSON.stringify({
      stage: error.stage,
      asset: error.assetId,
      url: error.url,
      status: error.status,
      contentType: error.contentType,
      name: cause?.name ?? error.name,
      message: cause?.message ?? error.message,
      stack: cause?.stack ?? error.stack,
    }));
    throw error;
  }
}

function windowValue(windows, name) {
  return clamp01(windows?.[name] ?? 0);
}

export function deriveCinematicShake(windows = {}, elapsed = 0, quality = {}) {
  const crack = windowValue(windows, 'crackPropagation');
  const waveA = windowValue(windows, 'shardWaveA');
  const waveB = windowValue(windows, 'shardWaveB');
  const waveC = windowValue(windows, 'shardWaveC');
  const singularity = windowValue(windows, 'singularity');
  const bigBang = windowValue(windows, 'bigBang');
  const debris = windowValue(windows, 'debrisExpansion');
  const aftermath = windowValue(windows, 'aftermath');

  let baseAmplitude = 0;
  if (crack > 0) baseAmplitude = Math.max(baseAmplitude, 0.55 + crack * 0.95);
  if (waveA > 0) baseAmplitude = Math.max(baseAmplitude, 1.35 + waveA * 1.25);
  if (waveB > 0) baseAmplitude = Math.max(baseAmplitude, 2.30 + waveB * 1.65);
  if (waveC > 0) baseAmplitude = Math.max(baseAmplitude, 3.45 + waveC * 2.05);
  if (singularity > 0) baseAmplitude = Math.max(baseAmplitude, 2.2 + singularity * 2.4);
  if (bigBang > 0) baseAmplitude = Math.max(baseAmplitude, 14.0 * Math.pow(1 - bigBang, 2));
  if (debris > 0) baseAmplitude = Math.max(baseAmplitude, 3.8 * Math.pow(1 - debris, 1.45));
  if (aftermath > 0) baseAmplitude = 0;

  const scale = Number.isFinite(quality.shakeScale) ? Math.max(0, quality.shakeScale) : 1;
  let amplitude = baseAmplitude * scale;
  if (quality.reducedMotion) amplitude = Math.min(amplitude, 0.9);

  const t = Number.isFinite(elapsed) ? elapsed : 0;
  const x = Math.sin(t * 83.0 + Math.sin(t * 13.1) * 0.75) * amplitude;
  const y = Math.cos(t * 71.0 + Math.sin(t * 11.7) * 0.55) * amplitude * 0.72;
  return Object.freeze({ amplitude, x, y });
}

export function deriveCinematicViewState({ windows = {}, elapsed = 0, quality = {} } = {}) {
  const shake = deriveCinematicShake(windows, elapsed, quality);
  const tension = windowValue(windows, 'tension');
  const crack = windowValue(windows, 'crackPropagation');
  const waveA = windowValue(windows, 'shardWaveA');
  const waveB = windowValue(windows, 'shardWaveB');
  const waveC = windowValue(windows, 'shardWaveC');
  const singularity = windowValue(windows, 'singularity');
  const primaryFlash = windowValue(windows, 'primaryFlash');
  const lavenderFlash = windowValue(windows, 'lavenderFlash');
  const debris = windowValue(windows, 'debrisExpansion');
  const aftermath = windowValue(windows, 'aftermath');
  const realization = windowValue(windows, 'realization');

  let exposure = 1;
  if (tension > 0) exposure = Math.max(exposure, 1 + tension * 0.075);
  if (crack > 0) exposure = Math.max(exposure, 1.045 + crack * 0.085);
  if (waveA > 0) exposure = Math.max(exposure, 1.08 + waveA * 0.055);
  if (waveB > 0) exposure = Math.max(exposure, 1.10 + waveB * 0.065);
  if (waveC > 0) exposure = Math.max(exposure, 1.12 + waveC * 0.075);
  if (singularity > 0) exposure = Math.max(exposure, 1.12 + singularity * 0.16);
  if (aftermath > 0 || realization > 0) exposure = 1;

  const flashScale = Number.isFinite(quality.flashScale) ? Math.max(0, quality.flashScale) : 1;
  const primaryPulse = primaryFlash > 0 ? Math.sin(primaryFlash * Math.PI) : 0;
  const lavenderPulse = lavenderFlash > 0 ? Math.sin(lavenderFlash * Math.PI) : 0;
  const flashOpacity = clamp01(Math.max(primaryPulse, lavenderPulse) * flashScale);
  const flashKind = lavenderPulse > primaryPulse ? 'lavender' : 'white';

  let veilOpacity = 0;
  if (debris > 0) veilOpacity = Math.max(veilOpacity, 0.12 + debris * 0.18);
  if (aftermath > 0) veilOpacity = Math.max(veilOpacity, 0.30 - aftermath * 0.06);
  if (realization > 0) veilOpacity = Math.max(veilOpacity, 0.22);

  return Object.freeze({
    shakeAmplitudePx: shake.amplitude,
    x: shake.x,
    y: shake.y,
    exposure,
    flashOpacity,
    flashKind,
    veilOpacity: clamp01(veilOpacity),
  });
}

export class CosmicEventController {
  constructor({
    fracture,
    renderer,
    audio,
    music = null,
    lavender,
    view,
    criticalAssetPreparer = async () => true,
    scheduler = defaultScheduler(),
    storage = globalThis.localStorage,
  }) {
    this.fracture = fracture;
    this.renderer = renderer;
    this.audio = audio;
    this.music = music;
    this.lavender = lavender;
    this.view = view;
    this.criticalAssetPreparer = criticalAssetPreparer;
    this.scheduler = scheduler;
    this.storage = storage;
    this.state = 'cold';
    this.origin = null;
    this.residualTargets = [];
    this.rafId = null;
    this.revealed = false;
    this.lamentStarted = false;
    this.idleStarted = false;
    this.disposed = false;
    this.visualStartedAtMs = null;
    this.musicCued = false;
    this.audioClockLost = false;
    this.audioUnavailable = false;
    this.audioReady = false;
    this.musicUnavailable = false;
    this.audioGesturePromise = null;
    this.musicGesturePromise = null;
  }

  async preload({ onProgress = () => {} } = {}) {
    if (this.state !== 'cold') return this;
    this.music?.silenceLegacy?.();
    if (typeof this.lavender?.mount !== 'function') {
      const error = new Error('Cosmic event requires Lavender to be mounted before the constellation can fracture');
      this.dispose();
      throw error;
    }

    try {
      await tracePreparationStep('page-assets', () => this.criticalAssetPreparer?.());

      onProgress('audio-prep');
      const [audioReady, musicReady] = await Promise.all([
        tracePreparationStep('audio-sfx', () => this.audio?.preload?.()),
        tracePreparationStep('page-music', () => this.music?.preload?.()),
      ]);
      if (audioReady === false || musicReady === false || !this.audio || !this.music) {
        throw new Error('The critical event audio and existing music must both decode before start');
      }
      onProgress('audio-ready');

      onProgress('visual-prep');
      const [rendererReady, lavenderReady] = await Promise.all([
        tracePreparationStep('renderer-prewarm', () => this.renderer?.prewarm?.()),
        tracePreparationStep('lavender-mount', () => this.lavender.mount()),
        tracePreparationStep('fracture-prepare', () => this.fracture?.prepare?.()),
      ]);
      if (rendererReady === false) {
        const error = new Error('No usable WebGL or canvas renderer is available');
        error.stage = 'renderer-prewarm';
        throw error;
      }
      if (lavenderReady === false) {
        const error = new Error('Lavender did not mount');
        error.stage = 'lavender-mount';
        throw error;
      }

      this.fracture?.refreshGeometry?.();
      this.origin = this.fracture?.getOriginScreenPoint?.() ?? { x: 0, y: 0 };
      this.residualTargets = this.fracture?.getResidualTargets?.() ?? [];
      this.renderer?.setOrigin?.(this.origin);
      this.view?.setOrigin?.(this.origin);
      this.lavender?.primeReveal?.();
      this.lavender?.forceVisibleFrame?.();

      const initialPayload = {
        phase: 'hold',
        progress: 0,
        elapsed: 0,
        windows: samplePhaseWindows(0),
      };
      this.view?.renderFrame?.(initialPayload);
      this.renderer?.sample?.(initialPayload);
      this.state = 'preloaded';
      return this;
    } catch (error) {
      this.dispose();
      const wrapped = new Error('Critical scene preparation failed; the sequence remains stopped');
      wrapped.cause = error;
      wrapped.stage = error?.stage;
      throw wrapped;
    }
  }

  arm() {
    if (this.state === 'cold') throw new Error('Cosmic event must preload before arm');
    if (this.state === 'preloaded') this.state = 'armed';
    return this;
  }

  primeStartGesture() {
    if (this.state !== 'preloaded' && this.state !== 'armed') return false;
    this.musicUnavailable = false;
    const audioUnlocks = [];
    try {
      const audioUnlock = this.audio?.resumeFromGesture?.();
      if (audioUnlock !== undefined) audioUnlocks.push(Promise.resolve(audioUnlock));
    } catch (error) {
      audioUnlocks.push(Promise.reject(error));
    }
    this.audioGesturePromise = Promise.all(audioUnlocks);
    void this.audioGesturePromise.catch(() => {});

    try {
      const musicUnlock = this.music?.primeFromGesture?.();
      this.musicGesturePromise = Promise.resolve(musicUnlock).then(() => true, (error) => {
        this.musicUnavailable = true;
        console.warn('[Chispa] The streamed page music is unavailable; continuing with the visual timeline.', error);
        return false;
      });
    } catch (error) {
      this.musicUnavailable = true;
      this.musicGesturePromise = Promise.resolve(false);
      console.warn('[Chispa] The streamed page music is unavailable; continuing with the visual timeline.', error);
    }
    // A gesture-bound HTMLMediaElement.play() promise can stay pending while a
    // mobile network buffers the song. Keep that stream off the visual T0 gate.
    return this.audioGesturePromise;
  }

  async canStartAutomatically() {
    if (this.state !== 'preloaded' && this.state !== 'armed') return false;
    if (this.music?.deferStreamUntilGesture) return false;

    this.primeStartGesture();
    const [audioReady, musicReady] = await Promise.all([
      Promise.resolve(this.audioGesturePromise).then(() => true, () => false),
      Promise.resolve(this.musicGesturePromise).then(Boolean, () => false),
    ]);
    const contextState = this.audio?.context?.state;
    return audioReady && musicReady && (!contextState || contextState === 'running');
  }

  async start({ auto = true } = {}) {
    if (this.state === 'cold') await this.preload();
    if (this.state === 'preloaded') this.arm();
    if (this.state !== 'armed') return false;

    this.fracture?.refreshGeometry?.();
    this.origin = this.fracture?.getOriginScreenPoint?.() ?? { x: 0, y: 0 };
    this.residualTargets = this.fracture?.getResidualTargets?.() ?? [];
    this.renderer?.setOrigin?.(this.origin);
    this.view?.setOrigin?.(this.origin);
    this.audioUnavailable = false;
    this.visualStartedAtMs = this.scheduler.now?.() ?? globalThis.performance?.now?.() ?? Date.now();
    this.audioReady = false;
    this.audioClockAvailable = false;
    this.state = 'running';
    this.sample(0);
    if (auto) this.#queueFrame();
    // Unlock/start audio in the same gesture, but never let a browser's pending
    // resume() or media promise hold the loader or visual playhead.
    void this.#startAudioOnVisualTimeline();
    return true;
  }

  async #startAudioOnVisualTimeline() {
    let elapsedAtAudioStart = 0;
    const getElapsedSeconds = () => {
      const now = this.scheduler.now?.() ?? globalThis.performance?.now?.() ?? Date.now();
      elapsedAtAudioStart = Math.max(0, (now - this.visualStartedAtMs) / 1000);
      return elapsedAtAudioStart;
    };
    try {
      const startUnlock = this.audioGesturePromise ?? this.audio?.resumeFromGesture?.();
      const audioT0 = await this.audio?.start?.({ beforeT0: startUnlock, getElapsedSeconds });
      this.audioGesturePromise = null;
      if (audioT0 === false) throw new Error('Audio did not start from the user gesture');
      this.audioReady = Number.isFinite(audioT0);
      if (this.audioReady) {
        const lead = Math.max(0, Number(this.audio?.startLeadSeconds) || 0);
        const cueRemaining = MUSIC_CUE_SECONDS - elapsedAtAudioStart - lead;
        if (cueRemaining > 0) {
          const cueAt = audioT0 + cueRemaining;
          if (this.music?.scheduleAt?.(cueAt) === false) {
            this.musicUnavailable = true;
            this.music?.destroy?.();
          }
          this.audio?.fadeOutAndStopAt?.(cueAt, 0.46);
        } else {
          this.musicUnavailable = true;
          this.music?.destroy?.();
        }
      }
    } catch (error) {
      this.audioGesturePromise = null;
      this.audio?.stop?.();
      this.music?.destroy?.();
      this.audioReady = false;
      this.audioUnavailable = true;
      this.audioClockLost = true;
      this.audioClockAvailable = false;
      console.warn('[Chispa] Mobile playback was blocked; continuing the visual sequence without audio.', error);
    }
  }

  #queueFrame() {
    if (this.state !== 'running') return;
    this.rafId = this.scheduler.requestAnimationFrame((timestamp) => {
      this.rafId = null;
      if (this.state !== 'running') return;
      const now = Number.isFinite(timestamp) ? timestamp : (this.scheduler.now?.() ?? Date.now());
      const origin = Number.isFinite(this.visualStartedAtMs) ? this.visualStartedAtMs : now;
      if (this.audioReady && this.audio?.isAuthoritative?.() === false) {
        this.audioClockAvailable = false;
        this.audioClockLost = true;
        this.audioUnavailable = true;
        this.audioReady = false;
        // Do not let scheduled voices fire late if a mobile browser resumes its
        // suspended context after the visual playhead has continued.
        this.audio?.stop?.();
        this.music?.destroy?.();
      }
      const seconds = Math.max(0, (now - origin) / 1000);
      try {
        this.sample(seconds);
      } catch (error) {
        console.error('[Chispa] Cosmic transition failed; restoring the existing constellation.', error);
        this.dispose();
        return;
      }
      if (this.state === 'running') this.#queueFrame();
    });
  }

  sample(seconds) {
    if (this.state !== 'running') return;
    const frame = phaseAt(seconds);
    const windows = samplePhaseWindows(seconds);
    const payload = { phase: frame.name, progress: frame.progress, elapsed: frame.seconds, windows };

    // View first: during the Lavender handoff the flash must already cover the renderer swap.
    this.view?.renderFrame?.(payload);

    // Glass transforms are durable state. Every stage is reconstructed from the
    // absolute playhead so dropped frames cannot skip a crack, shard wave or impulse.
    const tensionProgress = completedProgressFor('tension', seconds);
    const crackSeedProgress = completedProgressFor('crackSeed', seconds);
    const crackPropagationProgress = completedProgressFor('crackPropagation', seconds);
    const waveA = completedProgressFor('shardWaveA', seconds);
    const waveB = completedProgressFor('shardWaveB', seconds);
    const waveC = completedProgressFor('shardWaveC', seconds);
    const explosionProgress = completedProgressFor('bigBang', seconds);
    if (tensionProgress > 0) this.fracture?.tension?.(tensionProgress);
    if (crackSeedProgress > 0) this.fracture?.crackSeed?.(crackSeedProgress);
    if (crackPropagationProgress > 0) this.fracture?.crackPropagation?.(crackPropagationProgress);
    if (waveA > 0) this.fracture?.releaseWave?.('A', waveA);
    if (waveB > 0) this.fracture?.releaseWave?.('B', waveB);
    if (waveC > 0) this.fracture?.releaseWave?.('C', waveC);
    if (explosionProgress > 0) this.fracture?.applyExplosion?.(explosionProgress, seconds);

    this.renderer?.sample?.(payload);

    if (!this.musicCued && seconds >= MUSIC_CUE_SECONDS) {
      this.musicCued = true;
      if (this.audioReady && !this.audioUnavailable && !this.audioClockLost && !this.musicUnavailable
        && this.music?.startFromBeginning?.() === false) {
        // Do not tear down the scene if a mobile stream is still buffering at
        // the cue. Starting it late would break sync; the visual timeline wins.
        this.musicUnavailable = true;
        this.music?.destroy?.();
      } else if (!this.audioReady || this.audioUnavailable || this.audioClockLost || this.musicUnavailable) {
        this.musicUnavailable = true;
        this.music?.destroy?.();
      }
    }

    const lavenderRevealProgress = completedProgressFor('lavenderReveal', seconds);
    if (seconds >= LAVENDER_REVEAL_SECONDS) {
      if (!this.revealed) {
        this.revealed = true;
        if (typeof this.lavender?.revealFromStar === 'function') {
          this.lavender.revealFromStar(this.origin, lavenderRevealProgress);
          this.lavender?.enterLament?.({ eventPoint: this.origin });
          this.lamentStarted = true;
        } else if (typeof this.lavender?.revealCentered === 'function') {
          this.lavender.revealCentered();
          this.lamentStarted = true;
        }
      } else {
        this.lavender?.setRevealProgress?.(lavenderRevealProgress);
      }
    }

    if (!this.lamentStarted && seconds >= LAVENDER_REVEAL_SECONDS) {
      this.lamentStarted = true;
      this.lavender?.enterLament?.({ eventPoint: this.origin });
    }

    if (seconds >= LAVENDER_REVEAL_SECONDS + 0.90 && seconds < IDLE_SECONDS) this.#driveRealization(seconds);
    if (!this.idleStarted && seconds >= IDLE_SECONDS) this.#enterIdle();
  }

  #driveRealization(seconds) {
    const age = seconds - (LAVENDER_REVEAL_SECONDS + 0.90);
    const targets = this.fracture?.getResidualTargets?.() ?? this.residualTargets;
    if (age < 0.55) {
      return;
    } else if (age < 1.45) {
      const first = targets[0];
      if (first) this.lavender?.lookAtWorldPoint?.(first.x, first.y);
    } else if (age < 2.35) {
      this.lavender?.lookDown?.();
    } else if (age < 4.15) {
      const first = targets[0];
      if (first) this.lavender?.lookAtWorldPoint?.(first.x, first.y);
    } else if (age < 6.10) {
      this.lavender?.lookDown?.();
    } else if (age < 8.20) {
      this.lavender?.lookAtWorldPoint?.(0.5, 0.51, { normalized: true });
    } else {
      const second = targets[1] ?? targets[0];
      if (second) this.lavender?.lookAtWorldPoint?.(second.x, second.y);
    }
  }

  #enterIdle() {
    this.idleStarted = true;
    this.renderer?.disposeHeavyVfx?.();
    this.fracture?.releaseHeavyPreparation?.();
    this.fracture?.enterResidualDrift?.(IDLE_SECONDS);
    this.view?.settleFinal?.();
    this.lavender?.startMelancholicIdle?.(() => this.fracture?.getResidualTargets?.() ?? []);
    safePersist(this.storage);
    if (this.rafId != null) this.scheduler.cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.music?.keepPlayingThroughIdle?.();
    this.state = 'idle';
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId != null) this.scheduler.cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.renderer?.disposeHeavyVfx?.();
    this.fracture?.destroy?.({ restoreOriginal: true });
    this.audio?.stop?.();
    this.music?.destroy?.();
    void Promise.resolve(this.audio?.destroy?.()).catch(() => {});
    this.lavender?.destroy?.();
    this.view?.destroy?.();
    this.state = 'disposed';
  }
}

export function createDomCosmicSceneView({ layer, world, vfxHost, quality = {} }) {
  const flash = layer.querySelector('.cosmic-flash');
  const veil = layer.ownerDocument?.querySelector?.('.cosmic-void-veil') ?? null;
  let origin = { x: 0, y: 0 };
  const flashScale = Number.isFinite(quality.flashScale) ? quality.flashScale : 1;
  const shakeScale = Number.isFinite(quality.shakeScale) ? quality.shakeScale : 1;

  const setOrigin = (point) => {
    origin = { ...point };
    layer.style.setProperty('--cosmic-origin-x', `${point.x}px`);
    layer.style.setProperty('--cosmic-origin-y', `${point.y}px`);
  };

  const renderFrame = ({ phase, progress, elapsed, windows }) => {
    layer.dataset.phase = phase;
    if (veil) veil.dataset.phase = phase;
    layer.style.setProperty('--cosmic-time', String(elapsed));
    const state = deriveCinematicViewState({ windows, elapsed, quality: { ...quality, flashScale, shakeScale } });

    if (flash) {
      flash.style.opacity = String(state.flashOpacity);
      flash.dataset.kind = state.flashKind;
    }
    if (veil) veil.style.opacity = String(state.veilOpacity);

    const transform = state.shakeAmplitudePx > 0.025
      ? `translate3d(${state.x}px,${state.y}px,0)`
      : '';
    if (world) {
      world.style.transform = transform;
      world.style.filter = state.exposure > 1.001
        ? `brightness(${state.exposure}) saturate(${1 + (state.exposure - 1) * 0.8})`
        : '';
    }
    if (vfxHost) vfxHost.style.transform = transform;
  };

  return {
    setOrigin,
    renderFrame,
    settleFinal() {
      layer.dataset.phase = 'melancholicIdle';
      if (veil) veil.dataset.phase = 'melancholicIdle';
      flash && (flash.style.opacity = '0');
      if (world) { world.style.transform = ''; world.style.filter = ''; }
      if (vfxHost) vfxHost.style.transform = '';
      if (veil) veil.style.opacity = '.22';
    },
    destroy() {
      if (world) { world.style.transform = ''; world.style.filter = ''; }
      veil?.remove?.();
      layer.remove?.();
    },
    getOrigin: () => ({ ...origin }),
  };
}


