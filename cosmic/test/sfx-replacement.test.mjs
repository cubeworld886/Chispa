import test from 'node:test';
import assert from 'node:assert/strict';
import { CosmicAudioDirector } from '../cosmic-audio.js';
import { createCosmicSfxManifest } from '../sfx-manifest.js';
import { COSMIC_PHASES, LAVENDER_REVEAL_SECONDS, LAVENDER_SAD_CUE_SECONDS } from '../timeline.js';
import { lavenderActorSizeForViewport } from '../lavender-host.js';

test('the small SFX set uses real source recordings and one synchronized timeline', () => {
  const effects = createCosmicSfxManifest('https://chispa.test/');
  assert.deepEqual(effects.map(({ id }) => id), [
    'fracture-crack',
    'primary-explosion',
    'fragment-fall',
    'lavender-sad',
  ]);
  assert.deepEqual(effects.map(({ url }) => url.split('/').at(-1)), [
    'constellation-glass-shatter.mp3',
    'exploding-building-2.mp3',
    'rocks-gravel-slide.mp3',
    'lavender-sad.wav',
  ]);
  assert.equal(effects[0].at, COSMIC_PHASES.crackSeed.start);
  assert.equal(effects[1].at, COSMIC_PHASES.bigBang.start);
  assert.equal(effects[2].at, COSMIC_PHASES.debrisExpansion.start);
  assert.equal(effects[3].at, LAVENDER_SAD_CUE_SECONDS);
  assert.ok(LAVENDER_SAD_CUE_SECONDS > LAVENDER_REVEAL_SECONDS + 2.71);
  assert.ok(LAVENDER_SAD_CUE_SECONDS < LAVENDER_REVEAL_SECONDS + 3.25);
  assert.equal(effects[0].duration, undefined, 'the glass take should play through its recorded fragment tail');
  assert.equal(effects[0].fadeOut, undefined, 'do not fade the glass take before the debris tail');
  assert.deepEqual(effects.slice(1, 3).map(({ duration }) => duration), [4.2, 1.95]);
  assert.deepEqual(effects.map(({ gain }) => gain), [0.30, 0.38, 0.28, 0.40]);
  assert.ok(effects.slice(0, 3).reduce((sum, { gain }) => sum + gain, 0) < 1);
  assert.ok(effects.every(({ playbackRate, pitch }) => playbackRate == null && pitch == null));
});

test('Lavender has 15–25 percent more negative space than the previous viewport sizes', () => {
  assert.equal(lavenderActorSizeForViewport(1280, 720), 92);
  assert.equal(lavenderActorSizeForViewport(765, 688), 70);
  assert.equal(lavenderActorSizeForViewport(390, 844), 66);
});

test('every production effect, including Lavender’s original cue, is decoded before ready', async () => {
  const effects = createCosmicSfxManifest('https://chispa.test/');
  const requested = [];
  const context = {
    state: 'suspended',
    destination: {},
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; },
    async decodeAudioData() { return { duration: 1 }; },
  };
  const audio = new CosmicAudioDirector({
    audioContextFactory: () => context,
    soundEffects: effects,
    fetcher: async (url) => {
      requested.push(url);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(32) };
    },
  });

  assert.equal(await audio.preload(), true);
  assert.deepEqual(new Set(requested), new Set(effects.map(({ url }) => url)));
  assert.deepEqual(new Set(audio.buffers.keys()), new Set(effects.map(({ id }) => id)));
  await audio.destroy();
});
