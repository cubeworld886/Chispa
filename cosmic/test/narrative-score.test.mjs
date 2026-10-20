import test from 'node:test';
import assert from 'node:assert/strict';
import { PageMusicDirector } from '../page-music.js';

function fakeAudioScene() {
  const tracks = [];
  const gains = [];
  const ctx = {
    currentTime: 10,
    createMediaElementSource(track) {
      return { track, connect() {}, disconnect() {} };
    },
    createGain() {
      const changes = [];
      const gain = {
        value: 0,
        changes,
        cancelScheduledValues(time) { changes.push(['cancel', time]); },
        setValueAtTime(value, time) { this.value = value; changes.push(['set', value, time]); },
        linearRampToValueAtTime(value, time) { this.value = value; changes.push(['ramp', value, time]); },
      };
      const node = { gain, connect() {}, disconnect() {} };
      gains.push(node);
      return node;
    },
  };
  const doc = {
    defaultView: { matchMedia: () => ({ matches: true }) },
    createElement(kind) {
      assert.equal(kind, 'audio');
      const track = {
        src: '', loop: false, paused: true, currentTime: 0,
        playCalls: 0, preload: 'none', muted: false,
        play() { this.playCalls += 1; this.paused = false; return Promise.resolve(); },
        pause() { this.paused = true; },
        removeAttribute() {}, load() {}, addEventListener() {}, removeEventListener() {},
      };
      tracks.push(track);
      return track;
    },
  };
  return { ctx, doc, tracks, gains };
}

test('the original soundtrack continues unchanged without a configured outro', async () => {
  const env = fakeAudioScene();
  const music = new PageMusicDirector({
    url: '/assets/music/dandara-legacy.mp3',
    audioContext: env.ctx, output: env.ctx.createGain(), doc: env.doc,
  });
  assert.equal(await music.preload(), true);
  assert.equal(env.tracks.length, 1);
  await music.primeFromGesture();
  assert.equal(music.primed, true);
  assert.equal(music.fadePrimaryForRemaining(11), false);
  assert.equal(music.startNarrativeOutro(), false);
  assert.equal(music.startFromBeginning(), true);
  music.destroy();
});

test('the second recording starts silent on Entrar and emerges on the seventh remaining bubble', async () => {
  const env = fakeAudioScene();
  const music = new PageMusicDirector({
    url: '/assets/music/viento-en-la-pradera.mp3',
    outroUrl: '/assets/music/yo-quisiera.mp3',
    audioContext: env.ctx, output: env.ctx.createGain(), doc: env.doc,
  });
  await music.preload();
  assert.equal(env.tracks.length, 2);
  assert.equal(music.outroGainNode.gain.value, 0);
  await music.primeFromGesture();
  await music.outroPrimingPromise;
  assert.equal(music.outroPrimed, true);
  assert.equal(env.tracks[1].playCalls, 1);
  assert.equal(env.tracks[1].loop, true);

  music.startFromBeginning(2.8);
  assert.equal(music.fadePrimaryForRemaining(12, 44), false);
  assert.equal(music.fadePrimaryForRemaining(11, 44), true);
  assert.equal(music.primaryFadeActive, true);
  assert.equal(music.fadePrimaryForRemaining(10, 44), true);
  assert.ok(music.gainNode.gain.changes.some(x => x[0] === 'ramp' && x[1] === 0 && x[2] === 54));

  assert.equal(music.startNarrativeOutro(), true);
  assert.equal(env.tracks[1].currentTime, 0);
  assert.equal(env.tracks[1].loop, false);
  assert.equal(music.outroStarted, true);
  assert.ok(music.outroGainNode.gain.changes.some(x => x[0] === 'ramp' && x[1] === music.outroGainValue));
  music.destroy();
});

test('musical passage counts and post-explosion timing remain explicit in source', async () => {
  const { readFileSync } = await import('node:fs');
  const script = readFileSync(new URL('../narrative-preview.js', import.meta.url), 'utf8');
  const event = readFileSync(new URL('../cosmic-event.js', import.meta.url), 'utf8');
  assert.match(script, /remaining === 11/);
  assert.match(script, /remaining === 7/);
  assert.match(script, /fadePrimaryForRemaining/);
  assert.match(script, /startNarrativeOutro/);
  assert.match(event, /EXPLOSION_IMPACT_SECONDS \+ 0\.72/);
});
