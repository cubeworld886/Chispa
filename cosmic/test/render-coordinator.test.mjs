import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const url = new URL('../render-coordinator.js', import.meta.url);
const scope = {};
runInNewContext(existsSync(url) ? readFileSync(url, 'utf8') : '', scope);

function harness({ diagnostics = false } = {}) {
  assert.equal(typeof scope.ChispaRenderCoordinator, 'function', 'the cooperative scheduler is installed');
  let clock = 0;
  let seq = 0;
  const frames = new Map();
  const timers = new Map();
  const listeners = new Map();
  const errors = [];
  const doc = { hidden: false, addEventListener: (n, f) => listeners.set(n, f), removeEventListener: n => listeners.delete(n) };
  const scheduler = new scope.ChispaRenderCoordinator({
    doc, diagnostics, now: () => clock,
    requestFrame: fn => { const id = ++seq; frames.set(id, fn); return id; },
    cancelFrame: id => frames.delete(id),
    setTimer: (fn, delay) => { const id = ++seq; timers.set(id, { fn, at: clock + delay }); return id; },
    clearTimer: id => timers.delete(id),
    onError: error => errors.push(error.message),
  });
  return { scheduler, frames, timers, errors, listeners,
    frame(time = clock + 16.667) {
      clock = time;
      const current = [...frames]; frames.clear();
      for (const [, fn] of current) fn(time);
    },
    advance(time) {
      clock = time;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
    },
    hidden(value, time = clock) { clock = time; doc.hidden = value; listeners.get('visibilitychange')?.(); },
  };
}

test('independent consumers share one native frame in priority order', () => {
  const h = harness(); const calls = [];
  h.scheduler.requestAnimationFrame(t => calls.push(['sky', t]), { priority: 20 });
  h.scheduler.requestAnimationFrame(t => calls.push(['actor', t]), { priority: 10 });
  h.scheduler.requestAnimationFrame(t => calls.push(['timeline', t]), { priority: 0 });
  assert.equal(h.frames.size, 1);
  h.frame(100);
  assert.deepEqual(calls, [['timeline', 100], ['actor', 100], ['sky', 100]]);
  assert.equal(h.frames.size, 0);
});

test('cancelling a later callback during dispatch prevents its execution', () => {
  const h = harness(); let calls = 0; let cancelled;
  h.scheduler.requestAnimationFrame(() => h.scheduler.cancelAnimationFrame(cancelled));
  cancelled = h.scheduler.requestAnimationFrame(() => calls++);
  h.frame(); assert.equal(calls, 0);
});

test('callbacks requeue for a subsequent frame, never recursively in the same frame', () => {
  const h = harness(); let calls = 0;
  const tick = () => { calls++; h.scheduler.requestAnimationFrame(tick); };
  const id = h.scheduler.requestAnimationFrame(tick);
  h.frame(); assert.equal(calls, 1); assert.equal(h.frames.size, 1);
  h.frame(); assert.equal(calls, 2);
  h.scheduler.cancelAnimationFrame(id); // An expired handle cannot cancel another subscriber.
  h.scheduler.destroy(); assert.equal(h.frames.size, 0);
});

test('low-frequency work sleeps until its deadline instead of polling native frames', () => {
  const h = harness(); let calls = 0;
  h.scheduler.requestAnimationFrame(() => calls++, { at: 250 });
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 1);
  h.advance(100); assert.equal(calls, 0); assert.equal(h.frames.size, 0);
  h.advance(250); h.frame(250);
  assert.equal(calls, 1); assert.equal(h.frames.size + h.timers.size, 0);
});

test('an immediate subscriber preempts a distant deadline without duplicate wakeups', () => {
  const h = harness(); const calls = [];
  const late = h.scheduler.requestAnimationFrame(() => calls.push('late'), { at: 1000 });
  h.scheduler.requestAnimationFrame(() => calls.push('now'));
  assert.equal(h.frames.size, 1); assert.equal(h.timers.size, 0);
  h.frame(20); assert.deepEqual(calls, ['now']);
  h.scheduler.cancelAnimationFrame(late);
  assert.equal(h.frames.size + h.timers.size, 0);
});

test('hidden documents suspend visual callbacks and pause visual timers', () => {
  const h = harness(); const calls = [];
  h.scheduler.requestAnimationFrame(t => calls.push(['frame', t]));
  h.scheduler.setTimeout(() => calls.push(['timer']), 1000);
  h.hidden(true, 100); assert.equal(h.frames.size + h.timers.size, 0);
  h.advance(5000); assert.equal(calls.length, 0);
  h.hidden(false, 5100); h.frame(5116);
  assert.deepEqual(calls, [['frame', 5116]]);
  h.advance(6000); h.frame(6016); assert.equal(calls.length, 2);
});

test('one failing consumer does not stop the remaining scene or future frames', () => {
  const h = harness(); let ok = 0;
  h.scheduler.requestAnimationFrame(() => { throw new Error('actor failed'); });
  h.scheduler.requestAnimationFrame(() => ok++);
  h.frame(); assert.equal(ok, 1); assert.deepEqual(h.errors, ['actor failed']);
  h.scheduler.requestAnimationFrame(() => ok++); h.frame(); assert.equal(ok, 2);
});

test('destroy clears native work, subscribers and visibility listeners', () => {
  const h = harness(); h.scheduler.setTimeout(() => assert.fail('disposed callback'), 500);
  h.scheduler.destroy(); h.scheduler.destroy(); h.advance(1000); h.frame(1000);
  assert.equal(h.frames.size + h.timers.size + h.listeners.size, 0);
  assert.equal(h.scheduler.requestAnimationFrame(() => {}), null);
});

test('diagnostics retain bounded samples and report actual callback work', () => {
  const h = harness({ diagnostics: true });
  for (let i = 1; i <= 300; i++) {
    h.scheduler.requestAnimationFrame(() => {}, { label: 'lavender' }); h.frame(i * 16.667);
  }
  const report = h.scheduler.getSnapshot();
  assert.equal(report.callbacks.lavender.calls, 300);
  assert.ok(report.sampleCount <= 120);
  assert.equal(report.pending, 0);
  assert.ok(report.frameP95Ms > 15 && report.frameP95Ms < 18);
});

test('raster quality uses sustained pressure, a lower bound and slower recovery', () => {
  assert.equal(typeof scope.ChispaAdaptiveBudget, 'function');
  const budget = new scope.ChispaAdaptiveBudget({ targetMs: 1000 / 60 });
  for (let i = 0; i < 30; i++) budget.sample(50);
  assert.equal(budget.scale, 1, 'one bad window does not lower quality');
  for (let i = 0; i < 30; i++) budget.sample(50);
  assert.equal(budget.scale, .85);
  for (let i = 0; i < 180; i++) budget.sample(50);
  assert.equal(budget.scale, .7);
  for (let i = 0; i < 60; i++) budget.sample(16.667);
  assert.equal(budget.scale, .7, 'recovery has stronger hysteresis');
  for (let i = 0; i < 300; i++) budget.sample(16.667);
  assert.equal(budget.scale, 1);
  for (let i = 0; i < 200; i++) budget.sample(1000);
  assert.equal(budget.scale, 1, 'background gaps are not performance samples');
});

test('a timer created while hidden waits only its own remaining delay after restore', () => {
  const h = harness(); let calls = 0;
  h.hidden(true, 100);
  h.advance(5000);
  h.scheduler.setTimeout(() => calls++, 1000);
  h.hidden(false, 5100);
  h.advance(6000); h.frame(6000); assert.equal(calls, 0);
  h.advance(6100); h.frame(6100); assert.equal(calls, 1);
});

test('suspension during a frame leaves remaining consumers queued for restoration', () => {
  const h = harness(); let calls = 0;
  h.scheduler.requestAnimationFrame(() => h.hidden(true));
  h.scheduler.requestAnimationFrame(() => calls++);
  h.frame(100); assert.equal(calls, 0);
  h.hidden(false, 1000); h.frame(1017); assert.equal(calls, 1);
});
