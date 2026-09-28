import assert from 'node:assert/strict';
import test from 'node:test';
import { MelancholicIdleDirector } from '../melancholic-idle.js';
import { phaseAt } from '../timeline.js';

test('melancholic idle preserves the processing gaze before its first microgesture', () => {
  const timers = [];
  const gazeTargets = [];
  const eyeOverrides = [];
  const scheduler = {
    setTimeout(callback, delay) {
      const timer = { callback, delay };
      timers.push(timer);
      return timer;
    },
    clearTimeout() {},
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    now() { return 0; },
  };
  const actor = {
    setEyeOpenness(left, right) { eyeOverrides.push([left, right]); },
    lookAtWorldPoint(x, y, options) { gazeTargets.push({ x, y, options }); },
    lookDown() { gazeTargets.push('down'); },
    applyIdleDrift() {},
    inspectionOffsetForWorldPoint() { return { x: 0, y: 0 }; },
  };
  const director = new MelancholicIdleDirector({
    actor,
    scheduler,
    random: () => 0.5,
    targetProvider: () => [{ x: 270, y: 320 }],
  });

  director.start();

  assert.equal(gazeTargets.length, 0);
  assert.equal(eyeOverrides.length, 0);
  assert.ok(timers.some(({ delay }) => delay >= 800 && delay <= 1800));

  director.stop();
});

test('the realization phase leaves time for a second look before idle begins', () => {
  assert.equal(phaseAt(14.5).name, 'realization');
  assert.equal(phaseAt(15.2).name, 'melancholicIdle');
});
