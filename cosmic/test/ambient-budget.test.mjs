import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { ConstellationFracture } from '../constellation-fracture.js';
import { MelancholicIdleDirector } from '../melancholic-idle.js';
import { createNativeWebglBackend } from '../webgl-adapter.js';

function frameProbe() {
  const requests = [];
  return { requests, now: () => 0,
    requestAnimationFrame(fn, options) { requests.push({ fn, options }); return requests.length; },
    cancelAnimationFrame() {}, setTimeout() { return 1; }, clearTimeout() {},
  };
}

test('slow residual shards request their next useful frame instead of polling every refresh', () => {
  const scheduler = frameProbe();
  const fracture = new ConstellationFracture({ svg: {}, group: {}, scheduler });
  fracture.prepared = true; fracture.shards = []; let samples = 0;
  fracture.sampleAt = () => samples++;
  fracture.enterResidualDrift(15.2); scheduler.requests[0].fn(10);
  assert.equal(samples, 1);
  assert.ok(scheduler.requests.at(-1).options.at >= 135);
  assert.equal(scheduler.requests.at(-1).options.label, 'shards');
  fracture.stopResidualDrift();
});

test('melancholic drift schedules at the actor budget, not at display refresh', () => {
  const scheduler = frameProbe();
  const director = new MelancholicIdleDirector({ scheduler, actor: {
    engine: { performance: { maxFps: 12 } }, applyIdleDrift() {},
  } });
  director.start(); scheduler.requests[0].fn(100);
  assert.ok(scheduler.requests.at(-1).options.at >= 183);
  assert.equal(scheduler.requests.at(-1).options.label, 'idle-drift');
  director.stop();
});

function skyScene() {
  const frames = new Map(); const timers = new Map(); const listeners = new Map();
  let seq = 0, clears = 0;
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, { get: (_o, name) => name === 'clearRect' ? () => clears++ : name.startsWith('create') ? () => gradient : () => {}, set: () => true });
  const canvas = { style: {}, getContext: () => context, width: 0, height: 0 };
  const loader = { dataset: { state: 'ready' } };
  const requestAnimationFrame = (fn, options) => { const id = ++seq; frames.set(id, { fn, options }); return id; };
  const cancelAnimationFrame = id => frames.delete(id);
  const setTimeout = (fn, delay) => { const id = ++seq; timers.set(id, { fn, delay }); return id; };
  const clearTimeout = id => timers.delete(id);
  const doc = {
    readyState: 'complete', hidden: false,
    getElementById: id => id === 'background' ? canvas : id === 'cosmic-loader' ? loader : null,
    querySelectorAll: () => [], querySelector: () => null,
    addEventListener: (event, fn) => listeners.set('doc:' + event, fn),
  };
  const win = { innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
    matchMedia: query => ({ matches: query.includes('coarse') }),
    addEventListener: (event, fn) => listeners.set('win:' + event, fn),
    chispaFrames: { requestAnimationFrame, cancelAnimationFrame, qualityScale: 1 },
  };
  runInNewContext(readFileSync(new URL('../../script.js', import.meta.url), 'utf8'), {
    window: win, document: doc, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout,
    localStorage: { getItem: () => null }, console,
  });
  return { frames, timers, listeners, loader, canvas, doc,
    get clears() { return clears; },
    frame(time) { const batch = [...frames.values()]; frames.clear(); batch.forEach(({ fn }) => fn(time)); },
  };
}

test('the opaque loader suppresses sky rendering until the scene becomes visible', () => {
  const scene = skyScene();
  assert.equal(scene.frames.size, 0);
  scene.loader.dataset.state = 'started';
  scene.listeners.get('win:chispa:scene-state')?.({ detail: { stage: 'started' } });
  assert.equal(scene.frames.size, 1);
  scene.frame(16); assert.equal(scene.clears, 1);
  assert.ok([...scene.frames.values()][0].options.at > 16);
  scene.doc.hidden = true; scene.listeners.get('doc:visibilitychange')();
  assert.equal(scene.frames.size, 0); assert.equal(scene.timers.size, 0);
});

test('the mobile WebGL backend requests low-power selection, including its fallback path', async () => {
  let options;
  const canvas = { className: '', setAttribute() {}, remove() {}, getContext(_name, value) { options = value; return null; } };
  const container = { ownerDocument: { createElement: () => canvas }, append() {} };
  await assert.rejects(createNativeWebglBackend({ container, quality: { name: 'LITE' } }), /WebGL2 is unavailable/);
  assert.equal(options.powerPreference, 'low-power');
});

test('adaptive raster resolution stays inside the selected profile and never changes CSS viewport size', async () => {
  const api = await import('../webgl-adapter.js');
  assert.equal(typeof api.resolveRasterDpr, 'function');
  assert.equal(api.resolveRasterDpr({ dpr: 3, maxDpr: 1 }, 1), 1);
  assert.equal(api.resolveRasterDpr({ dpr: 3, maxDpr: 1 }, .7), .7);
  assert.equal(api.resolveRasterDpr({ dpr: 3, maxDpr: 1.5 }, .85), 1.275);
  assert.equal(api.resolveRasterDpr({ dpr: 1, maxDpr: 1 }, 10), 1);
  assert.equal(api.resolveRasterDpr({ dpr: 1, maxDpr: 1 }, NaN), 1);
});

test('an unchanged cinematic view does not rewrite phase and opacity on every callback', async () => {
  const { createDomCosmicSceneView } = await import('../cosmic-event.js');
  let writes = 0;
  const tracked = () => new Proxy({}, { set(target, key, value) { writes++; target[key] = value; return true; } });
  const flash = { style: tracked(), dataset: tracked() };
  const veil = { style: tracked(), dataset: tracked() };
  const layer = { dataset: tracked(), querySelector: () => flash, ownerDocument: { querySelector: () => veil } };
  const view = createDomCosmicSceneView({ layer, world: { style: tracked() }, vfxHost: { style: tracked() } });
  const frame = { phase: 'hold', elapsed: 0, windows: {} };
  view.renderFrame(frame); const first = writes;
  view.renderFrame(frame); assert.equal(writes, first);
});
