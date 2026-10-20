import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const code = readFileSync(new URL('../narrative-preview.js', import.meta.url), 'utf8');

function mockNode(tag) {
  const descendants = new Map();
  const classes = new Set();
  return {
    tag, id: '', hidden: false, offsetHeight: 128,
    textContent: '', innerHTML: '', dataset: {},
    style: { setProperty() {} },
    classList: {
      add(...values) { for (const value of values) classes.add(value); },
      remove(...values) { for (const value of values) classes.delete(value); },
      contains(value) { return classes.has(value); },
    },
    setAttribute() {}, addEventListener() {}, removeEventListener() {},
    append(node) { (this.appended ??= []).push(node); },
    remove() { this.removed = true; },
    querySelector(selector) {
      if (!descendants.has(selector)) descendants.set(selector, mockNode(selector));
      return descendants.get(selector);
    },
  };
}

function makeEnvironment(search = '') {
  const scheduled = new Map();
  const listeners = new Map();
  let nextId = 0;
  const setTimeout = (fn, ms) => {
    const id = ++nextId;
    scheduled.set(id, { fn, ms });
    return id;
  };
  const clearTimeout = (id) => scheduled.delete(id);
  const document = {
    baseURI: 'https://example.test/index.html',
    head: mockNode('head'),
    body: mockNode('body'),
    hidden: false,
    createElement: mockNode,
    addEventListener(kind, handler) { listeners.set('document:' + kind, handler); },
    removeEventListener(kind) { listeners.delete('document:' + kind); },
  };
  const window = {
    innerWidth: 390,
    innerHeight: 844,
    setTimeout,
    matchMedia: () => ({ matches: false }),
    addEventListener(kind, handler) { listeners.set('window:' + kind, handler); },
    removeEventListener(kind) { listeners.delete('window:' + kind); },
  };
  const sandbox = {
    window, document,
    location: { search },
    URL, URLSearchParams, Intl,
    console: { info() {}, warn() {} },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    clearTimeout,
  };
  const nextTimer = () => {
    if (!scheduled.size) return false;
    const [id, callback] = scheduled.entries().next().value;
    scheduled.delete(id);
    callback.fn();
    return true;
  };
  return { sandbox, document, window, listeners, scheduled, nextTimer };
}

test('normal Chispa visits have no narrative overlays and no sound preload', () => {
  const env = makeEnvironment('');
  runInNewContext(code, env.sandbox);
  assert.equal(env.document.body.appended, undefined);
  assert.equal(env.document.head.appended, undefined);
  assert.equal(env.window.__chispaNarrativePreview, undefined);
});

test('narrative only starts automatically after canonical Lavender reaches idle', () => {
  const env = makeEnvironment('?previewNarrative=1');
  runInNewContext(code, env.sandbox);
  assert.equal(env.window.__chispaNarrativePreview.getStatus().state, 'waiting-for-cosmic-idle');
  assert.equal(env.window.__chispaNarrativePreview.getStatus().total, 62);
  assert.equal(env.document.body.appended, undefined);

  const music = { track: { loop: false } };
  const lavender = {
    engine: {
      getActorScreenRect() {
        return { left: 160, top: 380, right: 230, bottom: 450, width: 70, height: 70 };
      },
    },
    lookDown() {},
    lookAtWorldPoint() {},
  };
  const onIdle = env.listeners.get('window:chispa:cosmic-idle');
  assert.equal(typeof onIdle, 'function');
  onIdle({ detail: { lavender, audio: { context: null }, music } });
  assert.equal(music.track.loop, true);
  assert.equal(env.window.__chispaNarrativePreview.getStatus().state, 'running');
  assert.equal(env.document.body.appended.length, 1);

  for (let step = 0; step < 10; step += 1) {
    assert.equal(env.nextTimer(), true);
  }
  const status = env.window.__chispaNarrativePreview.getStatus();
  assert.equal(status.section, 'heavy');
  assert.equal(status.index, 0);
  assert.ok(status.typed > 0);
  assert.equal(status.speechSynthesis, false);
});

test('all 62 bubbles complete without manual interaction', () => {
  const env = makeEnvironment('?previewNarrative=1');
  runInNewContext(code, env.sandbox);
  const music = { track: { loop: false } };
  env.listeners.get('window:chispa:cosmic-idle')({
    detail: {
      lavender: {
        engine: {
          getActorScreenRect: () => ({
            left: 160, top: 380, right: 230, bottom: 450,
            width: 70, height: 70,
          }),
        },
        lookDown() {},
        lookAtWorldPoint() {},
      },
      music,
      audio: { context: null },
    },
  });
  let timerSteps = 0;
  while (env.nextTimer() && timerSteps < 22_000) timerSteps += 1;
  assert.ok(timerSteps < 22_000, 'the automatic narration should terminate');
  assert.equal(env.window.__chispaNarrativePreview.getStatus().state, 'completed');
  assert.equal(env.window.__chispaNarrativePreview.getStatus().index, 62);
  assert.equal(env.scheduled.size, 0);
  assert.equal(music.track.loop, true);
});

test('dialogue is written only: no TTS, independent UI or playback controls', () => {
  assert.doesNotMatch(code, /new\s+SpeechSynthesisUtterance|speechSynthesis\.speak|<button[^>]+data-action/);
  assert.match(code, /come on and haunt me/i);
  assert.match(code, /volviéramos a encontrarnos/);
  assert.doesNotMatch(code, /hay algo profundamente triste en pensar eso/i);
  assert.doesNotMatch(code, /hay otra canción que también me recuerda a ti/i);
  assert.match(code, /assets\/lavender\/sfx\/lavender_talking\.wav/);
});
