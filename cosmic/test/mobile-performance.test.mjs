import assert from 'node:assert/strict';
import test from 'node:test';
import { CosmicRenderer } from '../cosmic-renderer.js';
import { selectQualityProfile } from '../quality-profile.js';
import { deriveVfxState } from '../vfx-state.js';
import { hasRenderableEffect, waitForGpu } from '../webgl-adapter.js';
import { ChispaLavenderHost } from '../lavender-host.js';
import { resolveLavenderPerformance } from '../../lavender-runtime/dist/performance/LavenderPerformanceGovernor.js';
import { LavenderSvgEngine } from '../../lavender-runtime/dist/renderer/LavenderSvgEngine.js';

test('mobile profile limits full-screen renderer work while preserving the latest timeline sample', async () => {
  const quality = selectQualityProfile({
    coarsePointer: true,
    width: 390,
    devicePixelRatio: 3,
    deviceMemory: 4,
    hardwareConcurrency: 8,
  });
  const rendered = [];
  let now = 0;
  const backend = {
    async prewarm() { return true; },
    setOrigin() {},
    sample(frame) { rendered.push(frame.elapsed); },
    dispose() {},
  };
  const renderer = new CosmicRenderer({
    container: {},
    quality,
    now: () => now,
    webglAdapter: { async createBackend() { return backend; } },
  });

  await renderer.prewarm();
  rendered.length = 0;
  renderer.sample({ elapsed: 0 });
  now = 16;
  renderer.sample({ elapsed: 0.016 });
  now = 33.2;
  renderer.sample({ elapsed: 0.0332 });

  assert.equal(quality.dpr, 1);
  assert.equal(quality.targetFps, 30);
  assert.equal(quality.particleCount, 520);
  assert.equal(quality.debrisCount, 120);
  assert.equal(quality.bloomStrength, 0.32);
  assert.deepEqual(rendered, [0, 0.0332]);
});

test('inactive timeline phases do not require a full-screen WebGL composite', () => {
  const hold = deriveVfxState({ phase: 'hold', progress: 0, windows: {} });
  const release = deriveVfxState({ phase: 'bigBang', progress: 0.1, windows: { bigBang: 0.1 } });
  const tail = deriveVfxState({ phase: 'aftermath', progress: 1, windows: { aftermath: 1 } });

  assert.equal(hasRenderableEffect(hold), false);
  assert.equal(hasRenderableEffect(release), true);
  assert.equal(hasRenderableEffect(tail), false);
});

test('a GPU warm-up fence that never signals rejects so the renderer can use its fallback', async () => {
  let nextFrame;
  let polls = 0;
  let deleted = 0;
  const gl = {
    SYNC_GPU_COMMANDS_COMPLETE: 1,
    ALREADY_SIGNALED: 2,
    CONDITION_SATISFIED: 3,
    WAIT_FAILED: 4,
    TIMEOUT_EXPIRED: 5,
    fenceSync() { return {}; },
    flush() {},
    clientWaitSync() { polls += 1; return this.TIMEOUT_EXPIRED; },
    deleteSync() { deleted += 1; },
  };
  const ready = waitForGpu(gl, {
    requestAnimationFrame(callback) { nextFrame = callback; },
    maxPolls: 2,
  });

  assert.equal(polls, 1);
  nextFrame();

  await assert.rejects(ready, /warm-up fence did not finish/);
  assert.equal(polls, 2);
  assert.equal(deleted, 1);
});

test('the optimized Lavender profile caps its render work for touch devices', () => {
  const previous = {
    matchMedia: Object.getOwnPropertyDescriptor(globalThis, 'matchMedia'),
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
  };
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    value: (query) => ({ matches: query === '(pointer: coarse)' }),
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { hardwareConcurrency: 8, connection: { saveData: false } },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { devicePixelRatio: 3 },
  });

  try {
    const profile = resolveLavenderPerformance('auto');
    assert.equal(profile.quality, 'optimized');
    assert.equal(profile.maxFps, 30);
  } finally {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test('Lavender stays paused behind the loader and resumes when the reveal begins', async () => {
  const calls = [];
  const actorSizes = [];
  class FakeEngine {
    async init() { calls.push('init'); }
    setCinematicLock() {}
    setCinematicPerformance() {}
    setCinematicBodyReveal() {}
    setCinematicEyeReveal() {}
    setCinematicFocus() {}
    setSceneMotion() {}
    forceVisibleFrame() {}
    pauseAnimation() { calls.push('pause'); }
    resumeAnimation() { calls.push('resume'); }
    sceneForScreenRect(_left, _top, size) { actorSizes.push(size); return { centerX: 0.5, centerY: 0.5, scale: 1 }; }
    setState() {}
    setSceneView() {}
    getActorScreenRect() { return null; }
    destroy() {}
  }
  const host = new ChispaLavenderHost({
    container: { clientWidth: 390, clientHeight: 844 },
    Engine: FakeEngine,
  });

  await host.mount();
  assert.deepEqual(calls, ['init', 'pause']);
  host.revealFromStar({ x: 195, y: 422 }, 0.2);

  assert.equal(calls.at(-1), 'resume');
  assert.deepEqual(actorSizes, [66]);
  host.destroy();
});

test('Lavender animation loop can pause and resume without starting duplicate frames', () => {
  const previousRaf = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
  const previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  const scheduled = [];
  const cancelled = [];
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value(callback) { scheduled.push(callback); return scheduled.length; },
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value(id) { cancelled.push(id); },
  });
  const engine = Object.create(LavenderSvgEngine.prototype);
  engine.destroyed = false;
  engine.raf = 12;
  engine.tick = () => {};

  try {
    engine.pauseAnimation();
    assert.deepEqual(cancelled, [12]);
    assert.equal(engine.raf, 0);
    engine.resumeAnimation();
    engine.resumeAnimation();
    assert.equal(scheduled.length, 1);
    assert.equal(engine.raf, 1);
  } finally {
    if (previousRaf) Object.defineProperty(globalThis, 'requestAnimationFrame', previousRaf);
    else delete globalThis.requestAnimationFrame;
    if (previousCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', previousCancel);
    else delete globalThis.cancelAnimationFrame;
  }
});
