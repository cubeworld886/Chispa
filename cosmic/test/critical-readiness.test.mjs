import test from 'node:test';
import assert from 'node:assert/strict';
import { installCosmicBootstrap, installProductionCosmicBootstrap } from '../bootstrap.js';
import { CosmicAudioDirector } from '../cosmic-audio.js';
import { PageMusicDirector } from '../page-music.js';
import { deriveVfxState } from '../vfx-state.js';
import { COSMIC_PHASES } from '../timeline.js';
import { samplePose } from '../../lavender-runtime/dist/core/motion.js';
import { lavenderActorSizeForViewport } from '../lavender-host.js';

test('the scene reaches ready after preload and waits for an explicit start', async () => {
  const events = [];
  const controller = {
    preload: async ({ onProgress }) => onProgress('visual'),
    arm: () => events.push('arm'),
    start: async () => { events.push('start'); return true; },
  };
  const bootstrap = installCosmicBootstrap({
    createController: async () => controller,
    onProgress: (stage) => events.push(stage),
  });

  await bootstrap.preload();
  assert.equal(bootstrap.status, 'ready');
  assert.deepEqual(events, ['boot', 'runtime', 'critical-assets', 'visual', 'ready']);
  assert.deepEqual(events.includes('start'), false);

  await bootstrap.start();
  assert.deepEqual(events.slice(-2), ['start', 'started']);
  assert.equal(bootstrap.status, 'started');
});

test('the start gesture is delivered to the prepared controller before bootstrap yields', async () => {
  const events = [];
  const controller = {
    preload: async () => true,
    primeStartGesture: () => events.push('gesture'),
    start: async () => { events.push('start'); return true; },
  };
  const bootstrap = installCosmicBootstrap({ createController: async () => controller });

  await bootstrap.preload();
  await bootstrap.start();

  assert.deepEqual(events, ['gesture', 'start']);
});

test('bootstrap includes the last preparation stage with the original failure', async () => {
  const events = [];
  const rootError = new Error('decoder rejected the asset');
  const bootstrap = installCosmicBootstrap({
    createController: async () => ({
      preload: async ({ onProgress }) => {
        onProgress('audio-prep');
        throw rootError;
      },
    }),
    onProgress: (stage, detail) => events.push({ stage, detail }),
  });

  await assert.rejects(bootstrap.preload(), rootError);
  const failure = events.find((event) => event.stage === 'error');
  assert.equal(failure.detail.stage, 'audio-prep');
  assert.equal(failure.detail.error, rootError);
});

test('the visible loader shows a concrete runtime-import diagnostic instead of a network claim', async () => {
  const status = { textContent: '' };
  const diagnostic = { hidden: true, textContent: '' };
  const action = { hidden: true, disabled: true, textContent: '', addEventListener() {} };
  const loader = {
    dataset: {},
    querySelector(selector) {
      if (selector === '[data-loader-status]') return status;
      if (selector === '[data-loader-diagnostic]') return diagnostic;
      if (selector === '[data-loader-action]') return action;
      return null;
    },
    setAttribute() {},
  };
  const element = {
    className: '',
    style: {},
    setAttribute() {},
    querySelector() { return null; },
  };
  const doc = {
    querySelector(selector) { return selector === '#cosmic-loader' ? loader : null; },
    createElement() { return { ...element }; },
    body: { append() {} },
  };
  const bootstrap = installProductionCosmicBootstrap({
    doc,
    win: {},
    runtimeLoader: async () => {
      const error = new Error('audio module failed to decode');
      error.name = 'EncodingError';
      throw error;
    },
    moduleUrl: 'https://scene.trycloudflare.com/cosmic/bootstrap.js',
  });

  await assert.rejects(bootstrap.preload());

  assert.match(status.textContent, /No se pudo preparar la escena/);
  assert.equal(diagnostic.hidden, false);
  assert.match(diagnostic.textContent, /stage: runtime-import/);
  assert.match(diagnostic.textContent, /production-runtime\.js/);
  assert.match(diagnostic.textContent, /EncodingError: audio module failed to decode/);
  assert.doesNotMatch(status.textContent, /conexión/);
});

test('the primary burst reaches full expansion during its short impact window', () => {
  assert.ok(COSMIC_PHASES.bigBang.end < 4.2, 'the event should release quickly');
  const vfx = deriveVfxState({
    phase: 'bigBang',
    progress: 1,
    windows: { bigBang: 1 },
  });
  assert.equal(vfx.explosion, 2.7);
});

test('Lavender enters while the debris tail is still present', () => {
  assert.ok(COSMIC_PHASES.lavenderReveal.start < COSMIC_PHASES.debrisExpansion.end);
});

test('the lament uses a smaller canonical rig with a restrained, changing eye expression', () => {
  const pose = samplePose({ state: 'lament', seconds: 4, stateAge: 1.6, gazeX: 0.04, gazeY: 0.18, reducedMotion: false });
  assert.ok(pose.leftEyeOpen < 0.65 && pose.rightEyeOpen < 0.70);
  assert.ok(pose.leftEyeSmile < -0.2 && pose.rightEyeSmile < -0.2);
  const inhale = samplePose({ state: 'lament', seconds: 0.5, stateAge: 0.5, gazeX: 0, gazeY: 0, reducedMotion: false });
  const exhale = samplePose({ state: 'lament', seconds: 3.1, stateAge: 3.1, gazeX: 0, gazeY: 0, reducedMotion: false });
  assert.notEqual(inhale.bodyPuff, exhale.bodyPuff);
  assert.equal(lavenderActorSizeForViewport(1280, 720), 92);
  assert.equal(lavenderActorSizeForViewport(390, 844), 66);
});

class FakeParam {
  constructor() { this.value = 0; this.events = []; }
  setValueAtTime(value, time) { this.events.push(['set', value, time]); this.value = value; }
  linearRampToValueAtTime(value, time) { this.events.push(['linear', value, time]); this.value = value; }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 9;
    this.state = 'suspended';
    this.destination = {};
    this.startedSources = [];
    this.gains = [];
    this.filters = [];
  }
  async decodeAudioData(bytes) { return { bytes, duration: 3 }; }
  async resume() { this.state = 'running'; }
  createBufferSource() {
    const source = {
      connect(target) { this.target = target; },
      start(time) { this.startedAt = time; },
      stop(time) { this.stoppedAt = time; },
      disconnect() {},
    };
    this.startedSources.push(source);
    return source;
  }
  createGain() {
    const gain = { gain: new FakeParam(), connect(target) { this.target = target; }, disconnect() {} };
    this.gains.push(gain);
    return gain;
  }
  createBiquadFilter() {
    const filter = { type: '', frequency: new FakeParam(), connect(target) { this.target = target; }, disconnect() {} };
    this.filters.push(filter);
    return filter;
  }
  createMediaElementSource(track) {
    return { mediaElement: track, connect(target) { this.target = target; }, disconnect() {} };
  }
}

test('a failed audio request retains its asset URL, HTTP status, and MIME type through preload', async () => {
  const url = 'https://scene.trycloudflare.com/assets/cosmic/sfx/fracture.mp3';
  const audio = new CosmicAudioDirector({
    audioContextFactory: () => new FakeAudioContext(),
    soundEffects: [{ id: 'fracture-crack', url }],
    fetcher: async () => ({
      ok: false,
      status: 404,
      headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null },
    }),
  });

  await assert.rejects(audio.preload(), (error) => {
    let cause = error;
    while (cause && cause.assetId !== 'fracture-crack') cause = cause.cause;
    assert.ok(cause, 'the original fetch-stage error should remain reachable');
    assert.equal(cause.assetId, 'fracture-crack');
    assert.equal(cause.url, url);
    assert.equal(cause.status, 404);
    assert.equal(cause.contentType, 'text/html; charset=utf-8');
    return true;
  });
});

test('the existing song is playable before start and enters on the central timeline cue', async () => {
  const context = new FakeAudioContext();
  const listeners = new Map();
  const track = {
    readyState: 0,
    paused: true,
    currentTime: 0,
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    load() {
      this.readyState = 3;
      for (const callback of listeners.get('canplay') ?? []) callback();
    },
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
    removeAttribute() {},
  };
  const doc = { createElement: (name) => name === 'audio' ? track : null };
  const music = new PageMusicDirector({ url: '/dandara.mp3', audioContext: context, output: {}, doc, gain: 0.68 });

  assert.equal(await music.preload(), true);
  assert.equal(music.gainNode.gain.value, 0);
  const unlock = music.primeFromGesture();
  assert.equal(track.paused, false);
  await unlock;
  assert.equal(music.scheduleAt(16.55), true);
  assert.equal(music.startFromBeginning(), true);
  assert.deepEqual(music.gainNode.gain.events.slice(-2), [['set', 0, 9], ['linear', 0.68, 10.35]]);
  music.destroy();
});

test('decoded effects map their audio times to the shared visual T0', async () => {
  const context = new FakeAudioContext();
  const audio = new CosmicAudioDirector({
    audioContextFactory: () => context,
    stemUrl: '/scene.wav',
    soundEffects: [
      { id: 'crack', url: '/crack.mp3', at: 1.25, gain: 0.15 },
      { id: 'impact', url: '/impact.mp3', at: 3.1, gain: 0.24, lowpassHz: 1400 },
    ],
    fetcher: async (url) => ({ ok: true, arrayBuffer: async () => new TextEncoder().encode(url).buffer }),
  });

  assert.equal(await audio.preload(), true);
  const t0 = await audio.start();
  assert.equal(t0, 9.08);
  assert.deepEqual(context.startedSources.map((source) => source.startedAt), [9.08, 10.25, 12.1]);
  assert.equal(context.filters.length, 1);
  assert.equal(context.filters[0].type, 'lowpass');
  context.currentTime = 12.58;
  assert.equal(audio.currentTime(), 3.5);
});

test('decoded SFX that already passed during mobile audio unlock are skipped, not replayed late', async () => {
  const context = new FakeAudioContext();
  const audio = new CosmicAudioDirector({
    audioContextFactory: () => context,
    soundEffects: [
      { id: 'past', url: '/past.mp3', at: 1, gain: 0.2 },
      { id: 'future', url: '/future.mp3', at: 3, gain: 0.2 },
    ],
    fetcher: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
  });
  await audio.preload();

  await audio.start({ getElapsedSeconds: () => 2 });

  assert.deepEqual(context.startedSources.map((source) => source.startedAt), [10]);
  await audio.destroy();
});

test('the audio director honors an explicit before-T0 readiness gate', async () => {
  const context = new FakeAudioContext();
  const audio = new CosmicAudioDirector({
    audioContextFactory: () => context,
    stemUrl: '/scene.wav',
    soundEffects: [],
    fetcher: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
  });
  await audio.preload();
  let finishMusicUnlock;
  const musicUnlock = new Promise((resolve) => { finishMusicUnlock = resolve; });
  const starting = audio.start({ beforeT0: musicUnlock });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(context.startedSources.length, 0);
  finishMusicUnlock(true);
  assert.equal(await starting, 9.08);
  assert.equal(context.startedSources.length, 1);
});

