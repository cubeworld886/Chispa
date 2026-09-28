const BASE = Object.freeze({
  timelineScale: 1,
  antialias: false,
  shadows: false,
});

export const QUALITY_PROFILES = Object.freeze({
  FULL: Object.freeze({
    ...BASE,
    name: 'FULL',
    maxDpr: 1.5,
    targetFps: 60,
    particleCount: 2800,
    debrisCount: 850,
    bloomStrength: 0.74,
    bloomRadius: 0.54,
    bloomThreshold: 0.16,
    shakeScale: 1,
    flashScale: 1,
  }),
  LITE: Object.freeze({
    ...BASE,
    name: 'LITE',
    maxDpr: 1,
    targetFps: 30,
    particleCount: 520,
    debrisCount: 120,
    bloomStrength: 0.32,
    bloomRadius: 0.28,
    bloomThreshold: 0.25,
    shakeScale: 0.45,
    flashScale: 0.72,
  }),
});

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function selectQualityProfile(env = {}) {
  const reducedMotion = Boolean(env.reducedMotion);
  const coarsePointer = Boolean(env.coarsePointer);
  const width = finiteOr(env.width, 1024);
  const memory = finiteOr(env.deviceMemory, 4);
  const cores = finiteOr(env.hardwareConcurrency, 4);
  const devicePixelRatio = Math.max(1, finiteOr(env.devicePixelRatio, 1));

  const constrained = reducedMotion
    || coarsePointer
    || width < 760
    || memory <= 2
    || cores <= 2;

  const base = constrained ? QUALITY_PROFILES.LITE : QUALITY_PROFILES.FULL;
  const reduced = reducedMotion ? {
    shakeScale: Math.min(base.shakeScale, 0.18),
    flashScale: Math.min(base.flashScale, 0.52),
    particleCount: Math.min(base.particleCount, 800),
    debrisCount: Math.min(base.debrisCount, 180),
  } : {};

  return Object.freeze({
    ...base,
    ...reduced,
    reducedMotion,
    dpr: Math.min(devicePixelRatio, base.maxDpr),
  });
}

export function detectBrowserQualityEnvironment(win = globalThis.window) {
  if (!win) {
    return {
      reducedMotion: false,
      coarsePointer: false,
      width: 1024,
      devicePixelRatio: 1,
      deviceMemory: 4,
      hardwareConcurrency: 4,
    };
  }
  return {
    reducedMotion: Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    coarsePointer: Boolean(win.matchMedia?.('(pointer: coarse)').matches),
    width: win.innerWidth,
    devicePixelRatio: win.devicePixelRatio,
    deviceMemory: win.navigator?.deviceMemory,
    hardwareConcurrency: win.navigator?.hardwareConcurrency,
  };
}
