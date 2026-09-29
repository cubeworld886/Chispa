import assert from 'node:assert/strict';
import test from 'node:test';
import { CosmicEventController, deriveCinematicViewState } from '../cosmic-event.js';
import { ConstellationFracture } from '../constellation-fracture.js';
import { COSMIC_PHASES, EXPLOSION_IMPACT_SECONDS } from '../timeline.js';
import { createCosmicSfxManifest } from '../sfx-manifest.js';

test('Lavender pre-flash leads into one main impact beat', () => {
  const { lavenderFlash, primaryFlash, bigBang } = COSMIC_PHASES;
  const primaryFlashPeak = (primaryFlash.start + primaryFlash.end) / 2;
  const impactAudio = createCosmicSfxManifest('https://chispa.test/')
    .find(({ id }) => id === 'primary-explosion');

  assert.ok(lavenderFlash.end < primaryFlash.start, 'the Lavender flash must finish before the main flash begins');
  assert.equal(primaryFlashPeak, EXPLOSION_IMPACT_SECONDS);
  assert.equal(bigBang.start, EXPLOSION_IMPACT_SECONDS, 'the main shockwave starts at the flash peak');
  assert.equal(impactAudio.at, EXPLOSION_IMPACT_SECONDS, 'the impact SFX shares the same event time');
});

test('constellation launch is held through the Lavender flash and starts at the impact event', () => {
  const launches = [];
  const frames = [];
  const controller = new CosmicEventController({
    fracture: { applyExplosion(progress, seconds) { launches.push({ progress, seconds }); } },
    renderer: { sample() {} },
    audio: {},
    music: {},
    lavender: {},
    view: { renderFrame(frame) { frames.push(frame); } },
  });
  controller.state = 'running';

  controller.sample(COSMIC_PHASES.lavenderFlash.start + 0.05);
  assert.equal(launches.length, 0, 'the Lavender flash must not launch the constellation');

  controller.sample(EXPLOSION_IMPACT_SECONDS - 0.001);
  assert.equal(launches.length, 0, 'the fractured constellation remains held until impact');

  controller.sample(EXPLOSION_IMPACT_SECONDS);
  assert.deepEqual(launches[0], { progress: 0, seconds: EXPLOSION_IMPACT_SECONDS });
  assert.equal(deriveCinematicViewState(frames.at(-1)).flashOpacity, 1, 'the launch coincides with the main flash peak');
  assert.equal(frames.at(-1).windows.bigBang, 0, 'the shockwave window begins at this same instant');
});

test('completed shard wave avoids repeating identical style writes on following frames', () => {
  let styleWrites = 0;
  const wrapperStyle = new Proxy({}, {
    set(target, key, value) { styleWrites += 1; target[key] = value; return true; },
  });
  const hostStyle = new Proxy({}, {
    set(target, key, value) { styleWrites += 1; target[key] = value; return true; },
  });
  const groupStyle = new Proxy({}, {
    set(target, key, value) { styleWrites += 1; target[key] = value; return true; },
  });
  const fracture = new ConstellationFracture({ svg: {}, group: {} });
  fracture.prepared = true;
  fracture.cloneHost = { style: hostStyle };
  fracture.group.style = groupStyle;
  fracture.shards = [{
    id: 'shard-a', wave: 'A', angle: 0, preBreakPx: 12, preRotationDeg: 3,
    wrapper: { style: wrapperStyle },
  }];
  fracture.currentTransforms.set('shard-a', { x: 0, y: 0, rotation: 0, opacity: 1 });

  fracture.releaseWave('A', 1);
  const writesAfterCompletion = styleWrites;
  fracture.releaseWave('A', 1);

  assert.ok(writesAfterCompletion > 0);
  assert.equal(styleWrites, writesAfterCompletion);
});
