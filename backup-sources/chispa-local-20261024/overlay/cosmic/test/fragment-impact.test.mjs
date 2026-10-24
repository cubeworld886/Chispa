import assert from 'node:assert/strict';
import test from 'node:test';
import { ConstellationFracture, sampleShardTransform } from '../constellation-fracture.js';
import { COSMIC_PHASES } from '../timeline.js';

test('shards begin their fast outward impulse at the main impact beat', () => {
  const shard = {
    angle: 0,
    dragPerSec: 0.3,
    impulsePxPerSec: 100,
    mass: 1,
    opacity: 0.8,
    parallax: 1,
    preBreakPx: 10,
    preRotationDeg: 0,
    residualPxPerMinute: 0,
    residualSpinDegPerSec: 0,
    spinDegPerSec: 0,
  };
  const bangStart = COSMIC_PHASES.bigBang.start;
  const atImpact = sampleShardTransform(shard, bangStart);
  const shortlyAfterImpact = sampleShardTransform(shard, bangStart + 0.05);
  const duringDecay = sampleShardTransform(shard, bangStart + 0.55);

  assert.equal(atImpact.x, shard.preBreakPx, 'the impulse starts at the impact event');
  assert.ok(shortlyAfterImpact.x - atImpact.x >= 4, 'the fragment begins moving immediately after impact');
  assert.ok(duringDecay.x > shortlyAfterImpact.x + 20, 'fragments keep traveling through the decay');
});

test('completed shard wave avoids repeating identical style writes on following frames', () => {
  let styleWrites = 0;
  const style = new Proxy({}, {
    set(target, key, value) { styleWrites += 1; target[key] = value; return true; },
  });
  const fracture = new ConstellationFracture({ svg: {}, group: {} });
  fracture.prepared = true;
  fracture.cloneHost = { style: new Proxy({}, { set(target, key, value) { styleWrites += 1; target[key] = value; return true; } }) };
  fracture.group.style = new Proxy({}, { set(target, key, value) { styleWrites += 1; target[key] = value; return true; } });
  fracture.shards = [{
    id: 'shard-a', wave: 'A', angle: 0, preBreakPx: 12, preRotationDeg: 3,
    wrapper: { style },
  }];
  fracture.currentTransforms.set('shard-a', { x: 0, y: 0, rotation: 0, opacity: 1 });

  fracture.releaseWave('A', 1);
  const writesAfterCompletion = styleWrites;
  fracture.releaseWave('A', 1);

  assert.ok(writesAfterCompletion > 0);
  assert.equal(styleWrites, writesAfterCompletion);
});
