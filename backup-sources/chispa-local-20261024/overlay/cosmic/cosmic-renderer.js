import { deriveVfxState } from './vfx-state.js';

function noopBackend() {
  return {
    async prewarm() { return false; },
    setOrigin() {},
    sample() {},
    dispose() {},
  };
}

function createCanvasElement(container) {
  const doc = container?.ownerDocument ?? globalThis.document;
  if (!doc?.createElement) return null;
  const canvas = doc.createElement('canvas');
  canvas.className = 'cosmic-fallback-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.append?.(canvas);
  return canvas;
}

export function createCanvasFallbackBackend({ container, quality }) {
  const canvas = createCanvasElement(container);
  const context = canvas?.getContext?.('2d', { alpha: true }) ?? null;
  let origin = { x: 0, y: 0 };
  let disposed = false;
  const particles = [];
  const count = Math.min(900, Math.max(180, Math.round((quality?.particleCount ?? 1800) * 0.18)));

  const resize = () => {
    if (!canvas || !context) return;
    const width = Math.max(1, container.clientWidth || globalThis.innerWidth || 1);
    const height = Math.max(1, container.clientHeight || globalThis.innerHeight || 1);
    const dpr = Math.min(quality?.dpr ?? 1, 1.25);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const seed = () => {
    particles.length = 0;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.sin(i * 9.17) * 0.18;
      const speed = 42 + ((i * 37) % 150);
      particles.push({ angle, speed, size: 0.6 + ((i * 13) % 12) / 8, life: 0.45 + ((i * 17) % 55) / 100 });
    }
  };

  return {
    particleSystemCount: 1,
    async prewarm() {
      resize();
      seed();
      if (!canvas || !context) return false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      return true;
    },
    setOrigin(point) { origin = { ...point }; },
    sample(payload = {}) {
      if (!context || !canvas || disposed) return;
      const { phase = 'hold', elapsed = 0 } = payload;
      const vfx = deriveVfxState(payload);
      const width = parseFloat(canvas.style.width) || canvas.width;
      const height = parseFloat(canvas.style.height) || canvas.height;
      context.clearRect(0, 0, width, height);
      const explosionVisible = vfx.explosion > 0 && vfx.fade > 0;
      if (vfx.singularityEnergy > 0 || explosionVisible) {
        const radius = vfx.explosion > 0
          ? 25 + vfx.explosion * Math.min(width, height) * 0.34
          : 10 + vfx.singularityEnergy * 24;
        const gradient = context.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, radius);
        gradient.addColorStop(0, 'rgba(255,255,255,.98)');
        gradient.addColorStop(.18, 'rgba(218,196,255,.9)');
        gradient.addColorStop(.55, 'rgba(124,87,255,.34)');
        gradient.addColorStop(1, 'rgba(62,34,145,0)');
        context.fillStyle = gradient;
        context.beginPath(); context.arc(origin.x, origin.y, radius, 0, Math.PI * 2); context.fill();
      }
      if (explosionVisible) {
        const explosion = vfx.explosion;
        const fade = vfx.fade;
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const distance = p.speed * explosion * (0.7 + p.life);
          const x = origin.x + Math.cos(p.angle) * distance;
          const y = origin.y + Math.sin(p.angle) * distance;
          const alpha = Math.max(0, Math.min(1, p.life * fade));
          context.fillStyle = `rgba(${180 + (i % 75)},${170 + (i % 60)},255,${alpha})`;
          context.beginPath(); context.arc(x, y, p.size, 0, Math.PI * 2); context.fill();
        }
        if (vfx.shockwave > 0 && vfx.shockwave < 0.96) {
          context.strokeStyle = `rgba(213,198,255,${Math.max(0, 0.8 - vfx.shockwave * .45)})`;
          context.lineWidth = 1.5;
          context.beginPath(); context.arc(origin.x, origin.y, vfx.shockwave * Math.min(width, height) * 0.55, 0, Math.PI * 2); context.stroke();
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      context?.clearRect?.(0, 0, canvas?.width ?? 0, canvas?.height ?? 0);
      canvas?.remove?.();
    },
  };
}

export class CosmicRenderer {
  constructor({ container, quality, webglAdapter = null, fallbackFactory = createCanvasFallbackBackend, now = () => globalThis.performance?.now?.() ?? Date.now() }) {
    if (!container) throw new Error('CosmicRenderer requires a container');
    this.container = container;
    this.quality = quality;
    this.webglAdapter = webglAdapter;
    this.fallbackFactory = fallbackFactory;
    this.backend = null;
    this.mode = 'cold';
    this.origin = null;
    this.stablePromise = Promise.resolve();
    this.disposed = false;
    this.now = now;
    this.lastSampleAt = Number.NEGATIVE_INFINITY;
  }

  async prewarm() {
    if (this.disposed || this.mode === 'disposed') return;
    if (this.mode === 'webgl' || this.mode === 'fallback') return true;
    try {
      if (!this.webglAdapter?.createBackend) throw new Error('No WebGL adapter available');
      const backend = await this.webglAdapter.createBackend({
        container: this.container,
        quality: this.quality,
        onContextLost: () => this.#switchToFallback(),
      });
      this.backend = backend;
      const ready = await backend.prewarm();
      if (ready === false) throw new Error('WebGL backend did not prewarm');
      this.mode = 'webgl';
      if (this.origin) backend.setOrigin?.(this.origin);
      backend.sample?.({ phase: 'hold', progress: 0, elapsed: 0, windows: {} });
      return true;
    } catch (error) {
      try { this.backend?.dispose?.(); } catch {}
      this.backend = null;
      await this.#switchToFallback();
      if (this.mode !== 'fallback' || !this.backend) throw error;
      this.backend.sample?.({ phase: 'hold', progress: 0, elapsed: 0, windows: {} });
      return true;
    }
  }

  async #switchToFallback() {
    if (this.disposed || this.mode === 'disposed') return;
    const transition = (async () => {
      const old = this.backend;
      this.backend = null;
      try { old?.dispose?.(); } catch {}
      const fallback = this.fallbackFactory?.({ container: this.container, quality: this.quality }) ?? noopBackend();
      const ready = await fallback.prewarm?.();
      if (ready === false) throw new Error('Canvas fallback is not available');
      this.backend = fallback;
      this.mode = 'fallback';
      if (this.origin) fallback.setOrigin?.(this.origin);
    })();
    this.stablePromise = transition;
    await transition;
  }

  whenStable() { return this.stablePromise; }

  setOrigin(point) {
    this.origin = { x: point.x, y: point.y };
    this.backend?.setOrigin?.(this.origin);
  }

  sample(frame) {
    if (this.disposed || !this.backend) return false;
    const fps = Number.isFinite(this.quality?.targetFps) && this.quality.targetFps > 0
      ? this.quality.targetFps
      : 60;
    const now = this.now();
    const interval = 1000 / fps;
    if (Number.isFinite(now) && now - this.lastSampleAt + 0.5 < interval) return false;
    this.lastSampleAt = Number.isFinite(now) ? now : Date.now();
    this.backend?.sample?.(frame);
    return true;
  }

  getResidualTargets() {
    return this.backend?.getResidualTargets?.() ?? [];
  }

  disposeHeavyVfx() {
    if (this.disposed) return;
    this.disposed = true;
    try { this.backend?.dispose?.(); } catch {}
    this.backend = null;
    this.mode = 'disposed';
  }
}
