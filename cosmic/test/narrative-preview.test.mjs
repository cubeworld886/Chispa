import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../narrative-preview.js', import.meta.url), 'utf8');
const style = readFileSync(new URL('../narrative-preview.css', import.meta.url), 'utf8');

function node(tag = 'div') {
  const children = [];
  const selectors = new Map();
  const classes = new Set();
  const self = {
    tag, children, selectors, tagName: tag,
    id: '', className: '', dataset: {}, hidden: false, textContent: '',
    style: { width: '230px', setProperty(key, value) { this[key] = value; } },
    classList: {
      add(...values) { values.forEach((value) => classes.add(value)); },
      remove(...values) { values.forEach((value) => classes.delete(value)); },
      contains(value) { return classes.has(value); },
    },
    setAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild(child) { children.push(child); return child; },
    append(child) { return self.appendChild(child); },
    replaceChildren(...next) { children.splice(0, children.length, ...next); },
    remove() { self.removed = true; },
    querySelector(selector) {
      if (!selectors.has(selector)) selectors.set(selector, node(selector));
      return selectors.get(selector);
    },
  };
  Object.defineProperty(self, 'offsetHeight', {
    get() {
      if (self.id !== 'chispa-lavender-dialogue') return 70;
      const written = self.querySelector('.lnv-written');
      let count = 0;
      for (const fragment of written.children) {
        for (const word of fragment.children) {
          count += word.children?.length || word.textContent?.length || 0;
        }
      }
      const width = parseInt(self.style.width, 10) || 230;
      return 35 + Math.max(1, Math.ceil(count / Math.max(12, (width - 32) / 7))) * 21;
    },
  });
  return self;
}

function createScene(query = '?previewNarrative=1', { width = 390, audioEnabled = false } = {}) {
  const timers = new Map();
  const frameCallbacks = new Map();
  const listeners = new Map();
  const soundsPlayed = [];
  let seq = 0;
  let clock = 0;

  const setTimeout = (fn, delay = 0) => {
    const key = ++seq;
    timers.set(key, { due: clock + delay, fn });
    return key;
  };
  const clearTimeout = (id) => timers.delete(id);
  const requestAnimationFrame = (callback) => {
    const key = ++seq;
    frameCallbacks.set(key, callback);
    return key;
  };
  const cancelAnimationFrame = (id) => frameCallbacks.delete(id);

  const body = node('body');
  const head = node('head');
  const document = {
    baseURI: 'https://example.test/index.html',
    head, body, hidden: false,
    createElement: node,
    createDocumentFragment: () => node('fragment'),
    createTextNode(value) { const text = node('#text'); text.textContent = value; return text; },
    addEventListener(name, fn) { listeners.set('doc:' + name, fn); },
    removeEventListener(name) { listeners.delete('doc:' + name); },
  };
  const context = {
    state: 'running',
    get currentTime() { return clock / 1000; },
    createBufferSource() {
      return {
        buffer: null, connect() {}, disconnect() {}, stop() {},
        start() { soundsPlayed.push(this.buffer?.key); },
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() {}, linearRampToValueAtTime() {},
          cancelScheduledValues() {},
        },
        connect() {}, disconnect() {},
      };
    },
    async decodeAudioData(buffer) {
      return { duration: 1.1, key: buffer.key };
    },
  };
  const audio = audioEnabled ? {
    context,
    getMixOutput: () => context.createGain(),
  } : { context: null };
  const music = {
    destroyed: false, primed: true,
    gainValue: 0.68,
    gainNode: { gain: {
      cancelScheduledValues() {}, setValueAtTime() {},
      linearRampToValueAtTime() {},
    } },
    track: { loop: false },
  };
  const lavender = {
    baseSceneView: { centerX: 0.5 },
    idle: { stopped: false, stop() { this.stopped = true; } },
    engine: {
      state: 'lament',
      setState(value) { this.state = value; },
      setSceneMotion() {}, setHeadTurn() {}, resumeAnimation() {},
      getActorScreenRect() {
        const center = lavender.baseSceneView.centerX * width;
        return {
          left: center - 35, right: center + 35,
          top: 386, bottom: 456, width: 70, height: 70,
        };
      },
    },
    applyIdleDrift() {}, lookDown() {}, lookAtWorldPoint() {},
    startMelancholicIdle() {},
  };
  const window = {
    innerWidth: width, innerHeight: 844, setTimeout,
    matchMedia: () => ({ matches: false }),
    addEventListener(name, fn) { listeners.set('win:' + name, fn); },
    removeEventListener(name) { listeners.delete('win:' + name); },
  };
  const fakeConsole = { info() {}, warn() {} };
  const fakeUrl = class {
    constructor(path, base = 'https://example.test/') {
      this.href = String(base).replace(/[^/]*$/, '') + path;
    }
  };
  const fakeParams = class {
    constructor(input) { this.input = input || ''; }
    get(key) { return this.input.includes(key + '=1') ? '1' : null; }
  };
  const sandbox = {
    window, document, console: fakeConsole, Intl,
    URL: fakeUrl, URLSearchParams: fakeParams,
    location: { search: query }, clearTimeout,
    requestAnimationFrame, cancelAnimationFrame,
    fetch: async (url) => ({
      ok: true,
      arrayBuffer: async () => ({
        key: /(lavender_\w+|lavender-sad)/.exec(url)?.[1] || 'unknown',
      }),
    }),
  };
  runInNewContext(script, sandbox);
  const frame = (timestamp) => {
    clock = timestamp;
    const current = [...frameCallbacks];
    frameCallbacks.clear();
    for (const [, callback] of current) callback(clock);
  };
  const next = () => {
    if (!timers.size) return false;
    const [id, task] = [...timers].sort((a, b) => a[1].due - b[1].due)[0];
    timers.delete(id);
    frame(task.due);
    task.fn();
    return true;
  };
  const enterIdle = () => {
    const listener = listeners.get('win:chispa:cosmic-idle');
    assert.equal(typeof listener, 'function');
    listener({
      detail: { lavender, audio, music, getResidualTargets: () => [] },
    });
  };
  return {
    window, document, lavender, audio, music, soundsPlayed,
    timers, listeners, frame, next, enterIdle,
  };
}

test('ordinary Chispa visits are unaffected by the opt-in dialogue', () => {
  const scene = createScene('');
  assert.equal(scene.document.body.children.length, 0);
  assert.equal(scene.document.head.children.length, 0);
  assert.equal(scene.window.__chispaNarrativePreview, undefined);
});

test('the narrative waits for the original constellation finale and starts without interaction', () => {
  const scene = createScene();
  assert.equal(scene.window.__chispaNarrativePreview.getStatus().state, 'waiting-for-cosmic-idle');
  assert.equal(scene.window.__chispaNarrativePreview.getStatus().total, 62);
  assert.equal(scene.document.body.children.length, 0);
  scene.enterIdle();
  assert.equal(scene.document.body.children.length, 1);
  assert.equal(scene.lavender.idle.stopped, true);
  assert.equal(scene.music.track.loop, true);
});

test('the full text occupies stable positions while letters are revealed', () => {
  const scene = createScene();
  scene.enterIdle();
  for (const time of [10, 400, 850, 1200, 1600, 2200]) scene.frame(time);
  assert.equal(scene.next(), true);
  assert.equal(scene.next(), true);
  const bubble = scene.document.body.children[0];
  const preTypingHeight = bubble.offsetHeight;
  const preTypingNodes = bubble.querySelector('.lnv-written').children.length;
  for (let i = 0; i < 14; i += 1) scene.next();
  assert.equal(bubble.offsetHeight, preTypingHeight);
  assert.equal(bubble.querySelector('.lnv-written').children.length, preTypingNodes);
  assert.ok(scene.window.__chispaNarrativePreview.getStatus().typed > 0);
  assert.match(style, /lnv-letter\.is-revealed/);
  assert.match(style, /position:\s*relative/);
});

test('on small screens Lavender moves right and speech stays on her left', () => {
  const scene = createScene();
  scene.enterIdle();
  for (const time of [10, 400, 850, 1200, 1600, 2200]) scene.frame(time);
  scene.next();
  scene.next();
  const status = scene.window.__chispaNarrativePreview.getStatus();
  assert.equal(status.bubbleSide, 'left');
  assert.ok(scene.lavender.baseSceneView.centerX > 0.78);
});

test('all bubbles finish; original music plays and canonical sounds vary', async () => {
  const scene = createScene('?previewNarrative=1', { audioEnabled: true });
  scene.enterIdle();
  for (let i = 0; i < 14; i += 1) await Promise.resolve();
  for (const time of [10, 400, 850, 1200, 1600, 2200]) scene.frame(time);
  let count = 0;
  while (scene.next() && count < 24_000) count += 1;
  const status = scene.window.__chispaNarrativePreview.getStatus();
  assert.ok(count < 24_000);
  assert.equal(status.state, 'completed');
  assert.equal(status.index, 62);
  assert.equal(status.speechSynthesis, false);
  assert.equal(status.originalMusicLoop, true);
  assert.ok(status.vocalCuesPlayed >= 5, 'more than the opening hello should play');
  assert.ok(new Set(scene.soundsPlayed).size >= 4, 'different approved sound files should play');
});

test('dialogue retains the agreed wording with no synthetic voice', () => {
  assert.doesNotMatch(script, /new\s+SpeechSynthesisUtterance|speechSynthesis\.speak/);
  assert.match(script, /come on and haunt me/i);
  assert.match(script, /volviéramos a encontrarnos/);
  assert.doesNotMatch(script, /hay algo profundamente triste en pensar eso/i);
  assert.doesNotMatch(script, /hay otra canción que también me recuerda a ti/i);
  assert.match(script, /setState\?\.\(state\)/);
});
