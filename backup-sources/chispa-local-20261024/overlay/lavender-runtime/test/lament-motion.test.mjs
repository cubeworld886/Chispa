import assert from 'node:assert/strict';
import test from 'node:test';
import { samplePose } from '../dist/core/motion.js';
import { morphEyePoints, warpBodyPoint } from '../dist/geometry/morphGeometry.js';

const lamentPose = (stateAge, seconds = 0) => samplePose({
  state: 'lament',
  seconds,
  stateAge,
  reducedMotion: false,
  pressed: false,
  gazeX: 0,
  gazeY: 0.2,
  headTurn: 0,
});

test('lament posture releases its arrival tension into a lower resting stance', () => {
  const arrival = lamentPose(0);
  const settled = lamentPose(3.2);

  assert.ok(arrival.bodyRotation < -0.015);
  assert.ok(settled.bodyRotation > arrival.bodyRotation + 0.005);
  assert.ok(settled.bodyDy > arrival.bodyDy + 0.003);
});

test('lament holds a slow processing blink before reopening', () => {
  const before = lamentPose(1.1);
  const closed = lamentPose(1.8);
  const reopened = lamentPose(2.6);

  assert.ok(before.leftEyeOpen > 0.45);
  assert.ok(closed.leftEyeOpen < 0.15);
  assert.ok(reopened.leftEyeOpen > 0.4);
});

test('lament breath changes the body contour with a restrained horizontal counter-shift', () => {
  const inhale = lamentPose(1.5, 1.5);
  const exhale = lamentPose(4.5, 4.5);

  assert.ok(inhale.bodyScaleY > 1.006);
  assert.ok(exhale.bodyScaleY < 0.997);
  assert.ok(Math.abs(inhale.bodyScaleX - 1) < 0.008);
  assert.ok(inhale.bodyPuff > exhale.bodyPuff + 0.025);
  assert.notEqual(inhale.bodyWavePhase, exhale.bodyWavePhase);
  const bodyPoint = [0.70, 0.42];
  assert.notDeepEqual(warpBodyPoint(bodyPoint, inhale), warpBodyPoint(bodyPoint, exhale));
  assert.notDeepEqual(morphEyePoints(inhale, 'left'), morphEyePoints(exhale, 'left'));
});
