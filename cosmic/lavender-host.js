import { MelancholicIdleDirector } from './melancholic-idle.js';

const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));

export function lavenderActorSizeForViewport(width, height) {
  const safeWidth = Math.max(1, width || 1);
  const safeHeight = Math.max(1, height || 1);
  const minSide = Math.min(safeWidth, safeHeight);
  if (safeWidth <= 600 || minSide < 700) return Math.round(clamp(minSide * 0.17, 64, 70));
  return Math.round(clamp(minSide * 0.128, 92, 103));
}

export class ChispaLavenderHost {
  constructor({
    container,
    Engine,
    actorSize = null,
    reducedMotion = false,
    idleFactory = (options) => new MelancholicIdleDirector(options),
    scheduler,
    random,
  }) {
    if (!container) throw new Error('Lavender host requires a container');
    if (!Engine) throw new Error('Lavender host requires the canonical WIP41 Engine');
    this.container = container;
    this.Engine = Engine;
    this.actorSize = actorSize;
    this.reducedMotion = reducedMotion;
    this.idleFactory = idleFactory;
    this.scheduler = scheduler;
    this.random = random;
    this.engine = null;
    this.idle = null;
    this.baseSceneView = null;
    this.mounted = false;
  }

  async mount() {
    if (this.mounted) return this;
    this.engine = new this.Engine(this.container, {
      quality: this.reducedMotion ? 'optimized' : 'auto',
      interactive: false,
      reducedMotion: this.reducedMotion,
    });
    await this.engine.init();
    this.engine.setCinematicLock(true);
    this.engine.setCinematicPerformance?.(false);
    this.engine.setCinematicBodyReveal(0);
    this.engine.setCinematicEyeReveal?.(0);
    this.engine.setCinematicFocus?.(0);
    this.engine.setSceneMotion({
      orbitOpacity: 0,
      crescentOpacity: 0,
      star0Opacity: 0,
      star1Opacity: 0,
      star2Opacity: 0,
    });
    this.engine.forceVisibleFrame?.();
    this.engine.pauseAnimation?.();
    this.mounted = true;
    return this;
  }

  primeReveal() {
    if (!this.engine) return;
    this.engine.setCinematicLock(true);
    this.engine.setCinematicPerformance?.(false);
    this.engine.setCinematicBodyReveal(0);
    this.engine.setCinematicEyeReveal?.(0);
    this.engine.setCinematicFocus?.(0);
  }

  #resolvedActorSize() {
    if (Number.isFinite(this.actorSize)) return this.actorSize;
    const width = Math.max(1, this.container.clientWidth || globalThis.innerWidth || 1);
    const height = Math.max(1, this.container.clientHeight || globalThis.innerHeight || 1);
    return lavenderActorSizeForViewport(width, height);
  }

  #idleBounds() {
    const width = Math.max(1, this.container.clientWidth || globalThis.innerWidth || 1);
    const height = Math.max(1, this.container.clientHeight || globalThis.innerHeight || 1);
    const size = this.#resolvedActorSize();
    return {
      x: Math.min(0.045, Math.max(0.018, (width - size * 0.96) / Math.max(width, 1) * 0.055)),
      y: Math.min(0.030, Math.max(0.012, (height - size * 1.08) / Math.max(height, 1) * 0.055)),
    };
  }

  revealCentered() {
    const width = Math.max(1, this.container.clientWidth || globalThis.innerWidth || 1);
    const height = Math.max(1, this.container.clientHeight || globalThis.innerHeight || 1);
    return this.revealFromStar({ x: width / 2, y: height / 2 });
  }

  revealFromStar({ x, y }, progress = 1) {
    if (!this.engine) throw new Error('Lavender must be mounted before reveal');
    this.engine.resumeAnimation?.();
    const size = this.#resolvedActorSize();
    const left = x - size / 2;
    const top = y - size / 2;
    const view = this.engine.sceneForScreenRect(left, top, size);
    this.engine.setState('lament');
    this.engine.setCinematicPerformance?.(true);
    this.engine.setSceneView(view);
    this.baseSceneView = { ...view };
    this.setRevealProgress(progress);
    this.lookAtWorldPoint(x, y);
  }

  setRevealProgress(progress) {
    if (!this.engine) throw new Error('Lavender must be mounted before reveal');
    const amount = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
    const eased = amount * amount * (3 - 2 * amount);
    const eyeProgress = Math.max(0, Math.min(1, (eased - 0.48) / 0.52));
    this.engine.setCinematicBodyReveal(eased);
    this.engine.setCinematicEyeReveal?.(eyeProgress);
    this.engine.setCinematicFocus?.(0.16 * eased);
    this.engine.setSceneMotion({
      orbitOpacity: 0.42 * eased,
      crescentOpacity: 0.46 * eased,
      star0Opacity: 0.28 * eased,
      star1Opacity: 0.24 * eased,
      star2Opacity: 0.22 * eased,
    });
    this.engine.forceVisibleFrame?.();
  }

  enterLament({ eventPoint = null } = {}) {
    if (!this.engine) return;
    this.engine.setState('lament');
    this.engine.setCinematicLock(true);
    this.engine.setCinematicPerformance?.(true);
    this.engine.setCinematicEyeReveal?.(1);
    this.engine.setCinematicFocus?.(0.12);
    this.engine.setSceneMotion({
      orbitOpacity: 0.20,
      crescentOpacity: 0.24,
      star0Opacity: 0.12,
      star1Opacity: 0.10,
      star2Opacity: 0.09,
    });
    if (eventPoint && Number.isFinite(eventPoint.x) && Number.isFinite(eventPoint.y)) {
      this.lookAtWorldPoint(eventPoint.x, eventPoint.y);
    } else {
      this.lookDown();
    }
  }

  enterConcerned() {
    this.enterLament();
  }

  lookAtWorldPoint(x, y, options = {}) {
    if (!this.engine) return;
    const griefGaze = this.engine.state === 'lament';
    if (options.normalized) {
      const range = griefGaze ? 0.54 : 1;
      this.engine.setCinematicGaze(clamp((x - 0.5) * 1.5, -range, range), clamp((y - 0.5) * 1.5, -range, range));
      return;
    }
    const rect = this.engine.getActorScreenRect?.();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = clamp((x - cx) / Math.max(80, rect.width * 0.9));
    const ny = clamp((y - cy) / Math.max(80, rect.height * 0.9));
    this.engine.setCinematicGaze(griefGaze ? clamp(nx, -.54, .54) : nx, griefGaze ? clamp(ny, -.54, .54) : ny);
  }

  lookDown() {
    this.engine?.setCinematicGaze(0, 0.42);
  }

  inspectionOffsetForWorldPoint(x, y) {
    const width = Math.max(1, this.container.clientWidth || globalThis.innerWidth || 1);
    const height = Math.max(1, this.container.clientHeight || globalThis.innerHeight || 1);
    const bounds = this.#idleBounds();
    const nx = clamp((Number(x) / width) - 0.5, -0.5, 0.5);
    const ny = clamp((Number(y) / height) - 0.5, -0.5, 0.5);
    return {
      x: clamp(nx * bounds.x * 1.7, -bounds.x, bounds.x),
      y: clamp(ny * bounds.y * 1.6, -bounds.y, bounds.y),
    };
  }

  setEyeOpenness(left, right) {
    this.engine?.setCinematicEyes(clamp(left, 0, 1), clamp(right, 0, 1));
  }

  forceVisibleFrame() {
    this.engine?.forceVisibleFrame?.();
  }

  applyIdleDrift(dx, dy) {
    if (!this.engine || !this.baseSceneView) return;
    const bounds = this.#idleBounds();
    const centerX = this.baseSceneView.centerX + clamp(dx, -bounds.x, bounds.x);
    const centerY = this.baseSceneView.centerY + clamp(dy, -bounds.y, bounds.y);
    this.engine.setSceneView({
      centerX: clamp(centerX, 0.16, 0.84),
      centerY: clamp(centerY, 0.2, 0.86),
    });
  }

  startMelancholicIdle(targetProvider) {
    if (!this.engine) throw new Error('Lavender must be mounted before idle');
    this.idle?.stop?.();
    if (this.engine.getState?.() !== 'lament') this.enterLament();
    this.applyIdleDrift(0, 0.012);
    this.idle = this.idleFactory({
      actor: this,
      scheduler: this.scheduler,
      random: this.random,
      targetProvider,
    });
    this.idle.start();
    return this.idle;
  }

  destroy() {
    this.idle?.stop?.();
    this.idle = null;
    this.engine?.destroy?.();
    this.mounted = false;
  }
}
