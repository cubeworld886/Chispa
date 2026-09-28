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
  assert.deepEqual(effects[0].cues.map(({ at }) => at), [
    COSMIC_PHASES.shardWaveA.start,
    COSMIC_PHASES.shardWaveB.start,
    COSMIC_PHASES.shardWaveC.start,
  ]);
  assert.ok(effects[0].cues.every(({ at }) => at > COSMIC_PHASES.crackPropagation.start));
  assert.deepEqual(effects[0].cues.map(({ sourceOffset }) => sourceOffset), [0.008, 0.63, 1.49]);
  assert.ok(effects[0].cues.every((cue, index, cues) => index === 0 || cues[index - 1].at + cues[index - 1].duration < cue.at),
    'the recorded glass slices do not overlap');
  assert.equal(effects[1].at, COSMIC_PHASES.bigBang.start);
  assert.equal(effects[2].at, COSMIC_PHASES.debrisExpansion.start);
  assert.equal(effects[3].at, LAVENDER_SAD_CUE_SECONDS);
  assert.ok(LAVENDER_SAD_CUE_SECONDS > LAVENDER_REVEAL_SECONDS + 2.71);
  assert.ok(LAVENDER_SAD_CUE_SECONDS < LAVENDER_REVEAL_SECONDS + 3.25);
  assert.deepEqual(effects.slice(1, 3).map(({ duration }) => duration), [4.2, 1.95]);
  assert.deepEqual(effects[0].cues.map(({ gain }) => gain), [0.30, 0.22, 0.26]);
  assert.deepEqual(effects.slice(1).map(({ gain }) => gain), [0.38, 0.28, 0.40]);
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
