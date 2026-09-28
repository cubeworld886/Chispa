function browserScheduler() {
  return {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
    requestAnimationFrame: (fn) => globalThis.requestAnimationFrame(fn),
    cancelAnimationFrame: (id) => globalThis.cancelAnimationFrame(id),
    now: () => globalThis.performance?.now?.() ?? Date.now(),
  };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;

export class MelancholicIdleDirector {
  constructor({ actor, scheduler = browserScheduler(), random = Math.random, targetProvider = () => [] }) {
    this.actor = actor;
    this.scheduler = scheduler;
    this.random = random;
    this.targetProvider = targetProvider;
    this.running = false;
    this.timeoutIds = new Set();
    this.rafId = null;
    this.startedAt = 0;
    this.targetIndex = 0;
    this.travel = { x: 0, y: 0.012 };
    this.travelTarget = { x: 0, y: 0.012 };
    this.hasInspectionTarget = false;
    this.lastFrameAt = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.startedAt = this.scheduler.now();
    this.lastFrameAt = this.startedAt;
    this.#schedule(() => this.#observeNextTarget(), this.#between(900, 1400));
    this.#scheduleMicrogesture(this.#between(5200, 7000));
    this.#scheduleUserAwareness(this.#between(8500, 10_500));
    this.rafId = this.scheduler.requestAnimationFrame((time) => this.#drift(time));
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    for (const id of this.timeoutIds) this.scheduler.clearTimeout(id);
    this.timeoutIds.clear();
    if (this.rafId != null) this.scheduler.cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.actor.applyIdleDrift?.(0, 0);
  }

  #between(min, max) {
    return Math.round(lerp(min, max, clamp(this.random(), 0, 1)));
  }

  #schedule(fn, ms) {
    const id = this.scheduler.setTimeout(() => {
      this.timeoutIds.delete(id);
      if (this.running) fn();
    }, ms);
    this.timeoutIds.add(id);
    return id;
  }

  #observeNextTarget() {
    const targets = this.targetProvider?.() ?? [];
    if (targets.length) {
      const target = targets[this.targetIndex % targets.length];
      this.targetIndex += 1;
      this.actor.lookAtWorldPoint?.(target.x, target.y);
      const offset = this.actor.inspectionOffsetForWorldPoint?.(target.x, target.y);
      if (offset && Number.isFinite(offset.x) && Number.isFinite(offset.y)) {
        this.travelTarget = { x: offset.x, y: offset.y + 0.012 };
        this.hasInspectionTarget = true;
      }
    } else {
      this.hasInspectionTarget = false;
      this.travelTarget = { x: 0, y: 0.012 };
      this.actor.lookDown?.();
    }
  }

  #scheduleMicrogesture(delay) {
    this.#schedule(() => {
      this.#observeNextTarget();
      this.#schedule(() => this.actor.lookDown?.(), this.#between(1100, 1900));
      this.#scheduleMicrogesture(this.#between(6500, 9600));
    }, delay);
  }

  #scheduleUserAwareness(delay) {
    this.#schedule(() => {
      this.actor.lookAtWorldPoint?.(0.5, 0.51, { normalized: true });
      this.#schedule(() => this.#observeNextTarget(), this.#between(700, 1150));
      this.#scheduleUserAwareness(this.#between(13_000, 19_000));
    }, delay);
  }

  #drift(time) {
    if (!this.running) return;
    const now = Number.isFinite(time) ? time : this.scheduler.now();
    const dt = Math.max(0, Math.min(0.25, (now - this.lastFrameAt) / 1000));
    this.lastFrameAt = now;
    const target = this.hasInspectionTarget ? this.travelTarget : { x: 0, y: 0.012 };
    const alpha = 1 - Math.exp(-dt / 3.8);
    this.travel.x += (target.x - this.travel.x) * alpha;
    this.travel.y += (target.y - this.travel.y) * alpha;
    this.actor.applyIdleDrift?.(this.travel.x, this.travel.y);
    this.rafId = this.scheduler.requestAnimationFrame((nextTime) => this.#drift(nextTime));
  }
}
