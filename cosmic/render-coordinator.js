/* Shared browser scheduler. Loaded before the classic sky/narrative scripts.
 * Never replaces native browser APIs. Consumers keep their injectable schedulers.
 */
(() => {
  'use strict';
  class ChispaAdaptiveBudget {
    constructor({ targetMs = 1000 / 60 } = {}) {
      this.targetMs = targetMs;
      this.level = 0;
      this.scale = 1;
      this.count = 0;
      this.total = 0;
      this.bad = 0;
      this.good = 0;
    }
    sample(ms) {
      if (!Number.isFinite(ms) || ms <= 0 || ms >= 250) return this.scale;
      this.total += ms;
      if (++this.count < 30) return this.scale;
      const mean = this.total / this.count;
      this.total = this.count = 0;
      if (mean > this.targetMs * 1.35) { this.bad++; this.good = 0; }
      else if (mean <= this.targetMs * 1.1) { this.good++; this.bad = 0; }
      else { this.good = this.bad = 0; }
      if (this.bad >= 2) { this.level = Math.min(2, this.level + 1); this.bad = 0; }
      if (this.good >= 6) { this.level = Math.max(0, this.level - 1); this.good = 0; }
      this.scale = [1, .85, .7][this.level];
      return this.scale;
    }
  }

  class ChispaRenderCoordinator {
    constructor({
      doc = globalThis.document, win = null,
      requestFrame = fn => globalThis.requestAnimationFrame(fn),
      cancelFrame = id => globalThis.cancelAnimationFrame(id),
      setTimer = (fn, ms) => globalThis.setTimeout(fn, ms),
      clearTimer = id => globalThis.clearTimeout(id),
      now = () => globalThis.performance.now(), diagnostics = false,
      targetMs = 1000 / 60,
      onError = error => globalThis.console?.error('[Chispa] Render task failed', error),
      onQuality = () => {},
    } = {}) {
      this.doc = doc; this.win = win;
      this.nativeRequest = requestFrame; this.nativeCancel = cancelFrame;
      this.nativeTimer = setTimer; this.nativeClearTimer = clearTimer;
      this.now = now; this.onError = onError; this.onQuality = onQuality;
      this.diagnostics = diagnostics;
      this.budget = new ChispaAdaptiveBudget({ targetMs });
      this.tasks = new Map(); this.sequence = 0;
      this.raf = this.timer = null; this.timerAt = null;
      this.hiddenAt = doc?.hidden ? now() : null;
      this.destroyed = false; this.flushing = false;
      this.samples = []; this.callbacks = Object.create(null);
      this.nativeFrames = 0; this.lastFrame = null;
      // Bound methods also work when passed as the existing scheduler interface.
      this.requestAnimationFrame = (fn, options = {}) => this.enqueue(fn, options, 'frame');
      this.cancelAnimationFrame = id => { this.tasks.delete(id); this.arm(); };
      this.setTimeout = (fn, ms = 0) => this.enqueue(fn, {
        at: this.now() + Math.max(0, Number(ms) || 0), label: 'visual-timer', priority: 0,
      }, 'timer');
      this.clearTimeout = this.cancelAnimationFrame;
      this.onVisibility = () => this.doc?.hidden ? this.suspend() : this.resume();
      this.onPageHide = event => event?.persisted ? this.suspend() : this.destroy();
      this.onPageShow = () => { if (!this.doc?.hidden) this.resume(); };
      doc?.addEventListener?.('visibilitychange', this.onVisibility);
      win?.addEventListener?.('pagehide', this.onPageHide);
      win?.addEventListener?.('pageshow', this.onPageShow);
    }
    get qualityScale() { return this.budget.scale; }
    enqueue(fn, options, kind) {
      if (this.destroyed) return null;
      if (typeof fn !== 'function') throw new TypeError('Render callback must be a function');
      const id = ++this.sequence;
      this.tasks.set(id, {
        fn, kind, at: Number.isFinite(options.at) ? options.at : this.now(),
        pausedAt: this.hiddenAt !== null ? this.now() : null,
        priority: Number.isFinite(options.priority) ? options.priority : 10,
        label: String(options.label || 'frame'),
      });
      this.arm();
      return id;
    }
    cancelNative() {
      if (this.raf !== null) this.nativeCancel(this.raf);
      if (this.timer !== null) this.nativeClearTimer(this.timer);
      this.raf = this.timer = this.timerAt = null;
    }
    arm() {
      if (this.destroyed || this.flushing) return;
      if (this.hiddenAt !== null || !this.tasks.size) { this.cancelNative(); return; }
      let next = Infinity;
      for (const task of this.tasks.values()) next = Math.min(next, task.at);
      const delay = next - this.now();
      if (delay <= 8) {
        if (this.timer !== null) this.nativeClearTimer(this.timer);
        this.timer = this.timerAt = null;
        if (this.raf === null) this.raf = this.nativeRequest(time => this.flush(time));
      } else {
        if (this.raf !== null) this.nativeCancel(this.raf);
        this.raf = null;
        if (this.timer !== null && this.timerAt === next) return;
        if (this.timer !== null) this.nativeClearTimer(this.timer);
        this.timerAt = next;
        this.timer = this.nativeTimer(() => {
          this.timer = this.timerAt = null;
          this.arm();
        }, Math.max(1, delay - 8));
      }
    }
    flush(timestamp) {
      this.raf = null;
      if (this.destroyed || this.hiddenAt !== null) return;
      const time = Number.isFinite(timestamp) ? timestamp : this.now();
      const due = [...this.tasks].filter(([, task]) => task.at <= time + .5)
        .sort((a, b) => a[1].priority - b[1].priority || a[0] - b[0]);
      const began = this.now();
      let lateness = 0;
      this.flushing = true;
      try {
        for (const [id, task] of due) {
          if (this.destroyed || this.hiddenAt !== null) break;
          if (!this.tasks.delete(id)) continue;
          lateness = Math.max(lateness, time - task.at);
          const start = this.diagnostics ? this.now() : 0;
          try { task.fn(time); } catch (error) { try { this.onError(error); } catch {} }
          if (this.diagnostics) {
            const label = this.callbacks[task.label] || Object.keys(this.callbacks).length < 64 ? task.label : 'other';
            const metric = this.callbacks[label] ||= { calls: 0, totalMs: 0, maxMs: 0 };
            const cost = Math.max(0, this.now() - start);
            metric.calls++; metric.totalMs += cost; metric.maxMs = Math.max(metric.maxMs, cost);
          }
        }
      } finally {
        this.flushing = false;
      }
      const previous = this.qualityScale;
      // Deadline lateness, not idle time between intentionally sparse frames.
      if (due.length) this.budget.sample(Math.max(this.budget.targetMs, lateness, this.now() - began));
      if (this.qualityScale !== previous) { try { this.onQuality(this.qualityScale); } catch (error) { this.onError(error); } }
      if (this.diagnostics) {
        this.nativeFrames++;
        if (this.lastFrame !== null && time - this.lastFrame < 250) {
          this.samples.push(time - this.lastFrame);
          if (this.samples.length > 120) this.samples.shift();
        }
        this.lastFrame = time;
      }
      this.arm();
    }
    suspend() {
      if (this.destroyed || this.hiddenAt !== null) return;
      this.hiddenAt = this.now(); this.cancelNative(); this.lastFrame = null;
    }
    resume() {
      if (this.destroyed || this.hiddenAt === null) return;
      const now = this.now();
      for (const task of this.tasks.values()) {
        if (task.kind === 'timer') task.at += Math.max(0, now - (task.pausedAt ?? this.hiddenAt));
        task.pausedAt = null;
      }
      this.hiddenAt = null; this.lastFrame = null; this.arm();
    }
    getSnapshot() {
      const sorted = [...this.samples].sort((a, b) => a - b);
      return {
        enabled: this.diagnostics, pending: this.tasks.size, hidden: this.hiddenAt !== null,
        nativeFrames: this.nativeFrames, qualityScale: this.qualityScale,
        sampleCount: sorted.length,
        frameP95Ms: sorted.length ? sorted[Math.ceil(sorted.length * .95) - 1] : 0,
        callbacks: JSON.parse(JSON.stringify(this.callbacks)),
        jsHeapBytes: this.diagnostics ? globalThis.performance?.memory?.usedJSHeapSize ?? null : null,
      };
    }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true; this.cancelNative(); this.tasks.clear();
      this.doc?.removeEventListener?.('visibilitychange', this.onVisibility);
      this.win?.removeEventListener?.('pagehide', this.onPageHide);
      this.win?.removeEventListener?.('pageshow', this.onPageShow);
    }
  }
  globalThis.ChispaAdaptiveBudget = ChispaAdaptiveBudget;
  globalThis.ChispaRenderCoordinator = ChispaRenderCoordinator;
  if (typeof window !== 'undefined' && globalThis.document && !globalThis.chispaFrames) {
    const diagnostics = new URLSearchParams(globalThis.location?.search || '').get('perf') === '1';
    globalThis.chispaFrames = new ChispaRenderCoordinator({
      win: window, diagnostics,
      targetMs: globalThis.matchMedia?.('(pointer: coarse)').matches ? 1000 / 30 : 1000 / 60,
      onQuality: scale => window.dispatchEvent(new CustomEvent('chispa:quality-change', { detail: { scale } })),
    });
    if (diagnostics) globalThis.__chispaPerf = { snapshot: () => globalThis.chispaFrames.getSnapshot() };
  }
})();
