import assert from 'node:assert/strict';
import test from 'node:test';
import { CosmicAudioDirector } from '../cosmic-audio.js';
import { CosmicEventController } from '../cosmic-event.js';
import { PageMusicDirector } from '../page-music.js';
import { MUSIC_CUE_SECONDS } from '../timeline.js';

test('coarse-pointer startup does not wait for media preload before offering the start gesture', async () => {
  let loadCount = 0;
  let playCount = 0;
  const track = {
    readyState: 0,
    paused: true,
    currentTime: 0,
    addEventListener() {},
    removeEventListener() {},
    load() { loadCount += 1; },
    play() { playCount += 1; this.paused = false; return Promise.resolve(); },
  };
  const context = {
    createMediaElementSource() { return { connect() {} }; },
    createGain() { return { gain: { value: 0 }, connect() {} }; },
  };
  const doc = {
    defaultView: { matchMedia: () => ({ matches: true }) },
    createElement: (name) => name === 'audio' ? track : null,
  };
  const music = new PageMusicDirector({ url: '/dandara.mp3', audioContext: context, output: {}, doc });

  const preload = music.preload();
  await Promise.resolve();
  assert.equal(music.preloaded, true);
  assert.equal(track.preload, 'none');
  assert.equal(loadCount, 0);
  assert.equal(await preload, true);

  await music.primeFromGesture();
  assert.equal(track.preload, 'auto');
  assert.equal(playCount, 1);
  assert.equal(music.primed, true);
});

test('the visual playhead keeps moving when the browser suspends its audio clock', async () => {
  let now = 0;
  let audioAvailable = true;
  let frameCallback = null;
  let audioStops = 0;
  let musicStops = 0;
  const frames = [];
  const scheduler = {
    now: () => now,
    requestAnimationFrame(callback) { frameCallback = callback; return 1; },
    cancelAnimationFrame() {},
  };
  const controller = new CosmicEventController({
    scheduler,
    fracture: { prepare() {}, refreshGeometry() {}, getOriginScreenPoint: () => ({ x: 200, y: 300 }) },
    renderer: { async prewarm() { return true; }, setOrigin() {}, sample() {} },
    audio: {
      async preload() { return true; },
      async start() { return 0.08; },
      currentTime: () => audioTime,
      isAuthoritative: () => audioAvailable,
      stop() { audioStops += 1; },
    },
    music: {
      async preload() { return true; },
      silenceLegacy() {},
      destroy() { musicStops += 1; },
    },
    lavender: { async mount() { return true; }, primeReveal() {}, forceVisibleFrame() {} },
    view: { setOrigin() {}, renderFrame(frame) { frames.push(frame); } },
  });

  await controller.preload();
  controller.arm();
  await controller.start();
  audioAvailable = false;
  now = 1000;
  frameCallback(now);

  assert.equal(frames.at(-1).elapsed, 1);
  assert.equal(audioStops, 1);
  assert.equal(musicStops, 1);
});

test('the visual sequence starts when a mobile browser rejects autoplay audio', async () => {
  let now = 0;
  let frameCallback = null;
  const frames = [];
  const scheduler = {
    now: () => now,
    requestAnimationFrame(callback) { frameCallback = callback; return 1; },
    cancelAnimationFrame() {},
  };
  const controller = new CosmicEventController({
    scheduler,
    fracture: { prepare() {}, refreshGeometry() {}, getOriginScreenPoint: () => ({ x: 120, y: 220 }) },
    renderer: { async prewarm() { return true; }, setOrigin() {}, sample() {} },
    audio: {
      async preload() { return true; },
      async start() { throw new DOMException('Audio playback is not allowed before activation', 'NotAllowedError'); },
      stop() {},
    },
    music: {
      async preload() { return true; },
      silenceLegacy() {},
      destroy() {},
    },
    lavender: { async mount() { return true; }, primeReveal() {}, forceVisibleFrame() {} },
    view: { setOrigin() {}, renderFrame(frame) { frames.push(frame); } },
  });

  await controller.preload();
  controller.arm();
  assert.equal(await controller.start(), true);
  assert.equal(controller.state, 'running');
  now = 1000;
  frameCallback(now);
  assert.equal(frames.at(-1).elapsed, 1);
});

test('a slow gesture-bound music stream cannot hold the visual T0', async () => {
  let resolveMusic;
  let now = 0;
  let audioStarts = 0;
  let musicDestroyed = 0;
  const musicBuffering = new Promise((resolve) => { resolveMusic = resolve; });
  const scheduler = {
    now: () => now,
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
  };
  const controller = new CosmicEventController({
    scheduler,
    fracture: { prepare() {}, refreshGeometry() {}, getOriginScreenPoint: () => ({ x: 120, y: 220 }) },
    renderer: { async prewarm() { return true; }, setOrigin() {}, sample() {} },
    audio: {
      async preload() { return true; },
      resumeFromGesture() { return Promise.resolve(); },
      async start({ beforeT0 }) { audioStarts += 1; await beforeT0; return 0.08; },
      currentTime: () => 0,
      isAuthoritative: () => true,
      stop() {},
    },
    music: {
      async preload() { return true; },
      silenceLegacy() {},
      primeFromGesture() { return musicBuffering; },
      startFromBeginning() { return false; },
      destroy() { musicDestroyed += 1; },
    },
    lavender: { async mount() { return true; }, primeReveal() {}, forceVisibleFrame() {} },
    view: { setOrigin() {}, renderFrame() {} },
  });

  await controller.preload();
  controller.arm();
  controller.primeStartGesture();
  const starting = controller.start();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(audioStarts, 1);
  assert.equal(controller.state, 'running');
  resolveMusic(true);
  assert.equal(await starting, true);
  assert.doesNotThrow(() => controller.sample(MUSIC_CUE_SECONDS));
  assert.equal(controller.state, 'running');
  assert.equal(musicDestroyed, 1);
});

test('a pending mobile AudioContext resume cannot hold the loader or the visual T0', async () => {
  let resolveAudioStart;
  let now = 0;
  let frameCallback = null;
  const frames = [];
  const scheduler = {
    now: () => now,
    requestAnimationFrame(callback) { frameCallback = callback; return 1; },
    cancelAnimationFrame() {},
  };
  const controller = new CosmicEventController({
    scheduler,
    fracture: { prepare() {}, refreshGeometry() {}, getOriginScreenPoint: () => ({ x: 120, y: 220 }) },
    renderer: { async prewarm() { return true; }, setOrigin() {}, sample() {} },
    audio: {
      async preload() { return true; },
      resumeFromGesture() { return new Promise(() => {}); },
      start() { return new Promise((resolve) => { resolveAudioStart = resolve; }); },
      currentTime: () => 0,
      isAuthoritative: () => true,
      stop() {},
    },
    music: {
      async preload() { return true; },
      silenceLegacy() {},
      primeFromGesture() { return Promise.resolve(true); },
      destroy() {},
    },
    lavender: { async mount() { return true; }, primeReveal() {}, forceVisibleFrame() {} },
    view: { setOrigin() {}, renderFrame(frame) { frames.push(frame); } },
  });

  await controller.preload();
  controller.arm();
  controller.primeStartGesture();
  const starting = controller.start();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(controller.state, 'running');
  assert.equal(await starting, true);
  now = 1000;
  frameCallback(now);
  assert.equal(frames.at(-1).elapsed, 1);
  resolveAudioStart(0.08);
});

test('a suspended Web Audio context stops claiming authority over the timeline', async () => {
  const context = {
    currentTime: 3,
    state: 'suspended',
    destination: {},
    async resume() { this.state = 'running'; },
    async decodeAudioData() { return { duration: 1 }; },
    createGain() {
      return {
        gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() {},
        disconnect() {},
      };
    },
    createBufferSource() {
      return { connect() {}, start() {}, stop() {}, disconnect() {} };
    },
  };
  const audio = new CosmicAudioDirector({
    audioContextFactory: () => context,
    stemUrl: '/scene.wav',
    soundEffects: [],
    fetcher: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
  });

  await audio.preload();
  await audio.start();
  assert.equal(audio.isAuthoritative(), true);
  context.state = 'suspended';
  assert.equal(audio.isAuthoritative(), false);
  audio.stop();
});
