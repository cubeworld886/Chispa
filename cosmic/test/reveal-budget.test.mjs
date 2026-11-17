import test from 'node:test';
import assert from 'node:assert/strict';
import { ChispaLavenderHost } from '../lavender-host.js';
import { CosmicEventController } from '../cosmic-event.js';

class ActorProbe {
  forced = 0; bodyWrites = 0; motionWrites = 0; state = 'idle';
  async init() {}
  setCinematicLock() {} setCinematicPerformance() {} setCinematicEyeReveal() {}
  setCinematicFocus() {} setCinematicGaze() {} setSceneView() {}
  setSceneMotion() { this.motionWrites++; }
  setCinematicBodyReveal() { this.bodyWrites++; }
  forceVisibleFrame() { this.forced++; }
  pauseAnimation() { this.paused = true; }
  resumeAnimation() { this.paused = false; }
  setState(state) { this.state = state; }
  sceneForScreenRect() { return { centerX: .5, centerY: .5, scale: .2 }; }
  getActorScreenRect() { return { left: 160, top: 380, width: 70, height: 70 }; }
}

test('the normal reveal changes state without bypassing the actor frame budget', async () => {
  const host = new ChispaLavenderHost({ container: { clientWidth: 390, clientHeight: 844 }, Engine: ActorProbe });
  await host.mount(); const before = host.engine.forced;
  host.revealFromStar({ x: 195, y: 422 }, 0);
  for (let step = 1; step <= 100; step++) host.setRevealProgress(step / 100);
  assert.equal(host.engine.forced, before, 'only preflight may force a render');
  assert.equal(host.engine.paused, false);
});

test('completed reveal is idempotent for the remaining realization frames', async () => {
  const host = new ChispaLavenderHost({ container: { clientWidth: 390, clientHeight: 844 }, Engine: ActorProbe });
  await host.mount(); host.revealFromStar({ x: 195, y: 422 }, 1);
  const { bodyWrites, motionWrites } = host.engine;
  for (let frame = 0; frame < 120; frame++) host.setRevealProgress(1);
  assert.equal(host.engine.bodyWrites, bodyWrites);
  assert.equal(host.engine.motionWrites, motionWrites);
  host.primeReveal(); host.setRevealProgress(1);
  assert.ok(host.engine.bodyWrites > bodyWrites, 'a new reveal invalidates its completion cache');
});

test('the cinematic stops sending completed reveal updates but preserves dropped-frame completion', () => {
  const progress = [];
  const controller = new CosmicEventController({
    fracture: {}, renderer: {}, audio: null, music: null, storage: null,
    view: {}, lavender: { revealFromStar(_point, p) { progress.push(p); }, enterLament() {}, setRevealProgress(p) { progress.push(p); } },
  });
  controller.state = 'running'; controller.origin = { x: 100, y: 200 };
  controller.sample(5.25); controller.sample(5.7); controller.sample(7);
  for (let frame = 0; frame < 120; frame++) controller.sample(7 + frame / 120);
  assert.equal(progress.filter(value => value === 1).length, 1);
  assert.equal(progress[0], 0); assert.equal(progress.at(-1), 1);
});

test('the actor requests its next render deadline instead of polling between capped frames', async () => {
  const { LavenderSvgEngine } = await import('../../lavender-runtime/dist/renderer/LavenderSvgEngine.js');
  const saved = new Map(['matchMedia', 'navigator', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { hardwareConcurrency: 8 } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { devicePixelRatio: 3 } });
  const queued = []; let rendered = 0;
  try {
    const engine = new LavenderSvgEngine({}, { quality: 'optimized', reducedMotion: false,
      scheduler: { requestAnimationFrame(fn, options) { queued.push(options); return queued.length; }, cancelAnimationFrame() {} },
    });
    engine.render = () => rendered++;
    engine.lastRenderedAt = 100; engine._lastTick = 100;
    engine.tick(110);
    assert.equal(rendered, 0);
    assert.ok(queued.at(-1).at >= 130);
    engine.tick(134); assert.equal(rendered, 1);
    assert.ok(queued.at(-1).at >= 164);
    engine.pauseAnimation(); engine.tick(200); assert.equal(rendered, 1);
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
