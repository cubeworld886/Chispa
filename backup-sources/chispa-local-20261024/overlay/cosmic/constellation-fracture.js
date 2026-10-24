import { COSMIC_PHASES, EXPLOSION_IMPACT_SECONDS } from './timeline.js?prepdiag=20260928l';

const NS = 'http://www.w3.org/2000/svg';
const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const round3 = (value) => Math.round(value * 1000) / 1000;
const EXPLOSION_START = EXPLOSION_IMPACT_SECONDS;
let fractureSequence = 0;
const setInlineStyleIfChanged = (style, property, value) => {
  if (style[property] !== value) style[property] = value;
};

const SHARD_BLUEPRINTS = Object.freeze([
  { id: 'glass-01', wave: 'A', centroid: [0.17, 0.16], clip: '0,0 .355,0 .338,.355 0,.325' },
  { id: 'glass-02', wave: 'B', centroid: [0.50, 0.15], impulseScale: 0.36, clip: '.345,0 .675,0 .642,.335 .332,.365' },
  { id: 'glass-03', wave: 'C', centroid: [0.83, 0.17], clip: '.665,0 1,0 1,.35 .632,.342' },
  { id: 'glass-04', wave: 'C', centroid: [0.17, 0.50], clip: '0,.315 .342,.35 .365,.675 0,.705' },
  { id: 'glass-05', wave: 'A', centroid: [0.50, 0.50], clip: '.332,.345 .648,.325 .688,.668 .355,.685' },
  { id: 'glass-06', wave: 'B', centroid: [0.83, 0.50], clip: '.638,.332 1,.34 1,.705 .678,.675' },
  { id: 'glass-07', wave: 'B', centroid: [0.17, 0.84], impulseScale: 0.38, clip: '0,.695 .365,.665 .342,1 0,1' },
  { id: 'glass-08', wave: 'C', centroid: [0.50, 0.84], impulseScale: 0.34, clip: '.355,.655 .688,.658 .672,1 .332,1' },
  { id: 'glass-09', wave: 'A', centroid: [0.83, 0.84], impulseScale: 0.42, clip: '.678,.655 1,.695 1,1 .662,1' },
]);

const CRACK_SEGMENTS = Object.freeze([
  [[0.50, 0.18], [0.48, 0.31], [0.52, 0.46]],
  [[0.52, 0.46], [0.37, 0.39], [0.31, 0.28]],
  [[0.52, 0.46], [0.67, 0.36], [0.76, 0.23]],
  [[0.52, 0.46], [0.42, 0.59], [0.34, 0.74], [0.26, 0.88]],
  [[0.52, 0.46], [0.65, 0.59], [0.73, 0.76], [0.82, 0.91]],
  [[0.42, 0.59], [0.24, 0.57], [0.10, 0.63]],
  [[0.65, 0.59], [0.82, 0.55], [0.94, 0.61]],
]);

function childByTag(parent, tagName) {
  return Array.from(parent.children ?? []).find((child) => String(child.tagName).toLowerCase() === tagName) ?? null;
}

function stripIds(node) {
  node.removeAttribute?.('id');
  for (const child of node.querySelectorAll?.('[id]') ?? []) child.removeAttribute?.('id');
}

function makeClip(doc, id, points) {
  const clip = doc.createElementNS(NS, 'clipPath');
  clip.setAttribute('id', id);
  clip.setAttribute('clipPathUnits', 'objectBoundingBox');
  const polygon = doc.createElementNS(NS, 'polygon');
  polygon.setAttribute('points', points);
  clip.append(polygon);
  return clip;
}

function makeGeometryClip(doc, id, sourceGroup) {
  const clip = doc.createElementNS(NS, 'clipPath');
  clip.setAttribute('id', id);
  clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
  const geometry = sourceGroup.cloneNode(true);
  stripIds(geometry);
  clip.append(geometry);
  return clip;
}

function seeded(index, salt = 0) {
  const value = Math.sin((index + 1) * 9283.173 + salt * 1931.417) * 43758.5453;
  return value - Math.floor(value);
}

function createShardMetadata(blueprint, index, motionScale = 1) {
  const [cx, cy] = blueprint.centroid;
  const centeredX = cx - 0.5;
  const centeredY = cy - 0.5;
  let angle = Math.atan2(centeredY, centeredX);
  if (Math.hypot(centeredX, centeredY) < 0.08) angle = -1.08;
  angle += (seeded(index, 1) - 0.5) * 0.24;
  const mass = 0.65 + seeded(index, 2) * 0.85;
  const preBreakPx = 4 + seeded(index, 3) * 16;
  const impulseScale = Number.isFinite(blueprint.impulseScale) ? blueprint.impulseScale : 1;
  const impulsePxPerSec = (70 + seeded(index, 4) * 170) * motionScale * impulseScale;
  const spinDegPerSec = -22 + seeded(index, 5) * 44;
  const dragPerSec = 0.18 + seeded(index, 6) * 0.24;
  const parallax = 0.72 + seeded(index, 7) * 0.52;
  const opacity = 0.62 + seeded(index, 8) * 0.30;
  const residualPxPerMinute = (2 + seeded(index, 9) * 5) * motionScale;
  const residualSpinDegPerSec = (-0.08 + seeded(index, 10) * 0.16) * motionScale;
  const preRotationDeg = (-2.2 + seeded(index, 11) * 4.4);
  return Object.freeze({
    id: blueprint.id,
    wave: blueprint.wave,
    centroid: Object.freeze({ x: cx, y: cy }),
    clip: blueprint.clip,
    mass,
    angle,
    preBreakPx,
    impulsePxPerSec,
    impulseScale,
    spinDegPerSec,
    dragPerSec,
    parallax,
    opacity,
    residualPxPerMinute,
    residualSpinDegPerSec,
    preRotationDeg,
  });
}

function makeCrackPath(doc, bbox, points, index) {
  const path = doc.createElementNS(NS, 'path');
  const coords = points.map(([nx, ny], pointIndex) => {
    const x = bbox.x + bbox.width * nx;
    const y = bbox.y + bbox.height * ny;
    return `${pointIndex ? 'L' : 'M'}${round3(x)},${round3(y)}`;
  }).join(' ');
  path.setAttribute('d', coords);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', index === 0 ? 'rgba(255,255,255,.95)' : 'rgba(229,216,255,.82)');
  path.setAttribute('stroke-width', index < 3 ? '1.65' : '1.15');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  path.style.opacity = '0';
  path.style.filter = 'drop-shadow(0 0 3px rgba(206,181,255,.72))';
  path.style.strokeDasharray = '1';
  path.style.strokeDashoffset = '1';
  return path;
}

function preBreakTransform(shard, progress = 1) {
  const p = clamp01(progress);
  const eased = 1 - Math.pow(1 - p, 3);
  const distance = shard.preBreakPx * eased;
  return {
    x: Math.cos(shard.angle) * distance,
    y: Math.sin(shard.angle) * distance,
    rotation: shard.preRotationDeg * eased,
    opacity: 1,
  };
}

export function sampleShardTransform(shard, cinematicSeconds) {
  if (!shard) return { x: 0, y: 0, rotation: 0, opacity: 1 };
  const base = preBreakTransform(shard, 1);
  const seconds = Number.isFinite(cinematicSeconds) ? cinematicSeconds : EXPLOSION_START;
  const dt = Math.max(0, seconds - EXPLOSION_START);
  if (dt <= 0) return base;

  const drag = Math.max(0.001, shard.dragPerSec);
  const velocity = shard.impulsePxPerSec / Math.max(0.45, shard.mass);
  const transient = velocity * (1 - Math.exp(-drag * dt)) / drag;
  const residual = (shard.residualPxPerMinute / 60) * dt;
  const distance = (shard.preBreakPx + transient + residual) * shard.parallax;
  const transientRotation = shard.spinDegPerSec * (1 - Math.exp(-drag * dt)) / drag;
  const residualRotation = shard.residualSpinDegPerSec * dt;

  return {
    x: Math.cos(shard.angle) * distance,
    y: Math.sin(shard.angle) * distance,
    rotation: shard.preRotationDeg + transientRotation + residualRotation,
    opacity: shard.opacity,
  };
}

function defaultResidualScheduler() {
  return {
    now: () => globalThis.performance?.now?.() ?? Date.now(),
    requestAnimationFrame: (fn) => globalThis.requestAnimationFrame(fn),
    cancelAnimationFrame: (id) => globalThis.cancelAnimationFrame(id),
  };
}

export class ConstellationFracture {
  constructor({ svg, group, motionScale = 1, scheduler = defaultResidualScheduler() }) {
    if (!svg || !group) throw new Error('ConstellationFracture requires the live SVG and lyra group');
    this.svg = svg;
    this.group = group;
    this.motionScale = Math.max(0.25, Number.isFinite(motionScale) ? motionScale : 1);
    this.scheduler = scheduler;
    this.uid = `cosmic-fracture-${++fractureSequence}`;
    this.clones = [];
    this.shards = [];
    this.labels = [];
    this.cloneHost = null;
    this.crackHost = null;
    this.crackPaths = [];
    this.clipNodes = [];
    this.prepared = false;
    this.origin = null;
    this.groupRect = null;
    this.waveProgress = new Map([['A', 0], ['B', 0], ['C', 0]]);
    this.currentTransforms = new Map();
    this.lastTensionProgress = Number.NaN;
    this.lastCrackSeedProgress = Number.NaN;
    this.lastCrackPropagationProgress = Number.NaN;
    this.residualRaf = null;
    this.residualStartedAt = 0;
    this.residualCinematicStart = 0;
  }

  refreshGeometry() {
    const rect = this.group.getBoundingClientRect();
    this.groupRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    this.origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    return this;
  }

  prepare() {
    if (this.prepared) return this;
    const doc = this.svg.ownerDocument || document;
    this.refreshGeometry();
    this.labels = Array.from(this.group.querySelectorAll?.('.label') ?? [], (label) => ({
      element: label,
      opacity: label.style.opacity,
    }));

    let defs = childByTag(this.svg, 'defs');
    if (!defs) {
      defs = doc.createElementNS(NS, 'defs');
      this.svg.prepend(defs);
    }

    const host = doc.createElementNS(NS, 'g');
    host.setAttribute('data-cosmic-fracture', 'glass-shards');
    host.style.pointerEvents = 'none';
    host.style.transformOrigin = 'center';
    host.style.opacity = '0';

    this.shards = SHARD_BLUEPRINTS.map((blueprint, index) => {
      const metadata = createShardMetadata(blueprint, index, this.motionScale);
      const clipId = `${this.uid}-${metadata.id}`;
      const clip = makeClip(doc, clipId, metadata.clip);
      defs.append(clip);
      this.clipNodes.push(clip);

      const wrapper = doc.createElementNS(NS, 'g');
      const canonical = this.group.cloneNode(true);
      stripIds(canonical);
      canonical.querySelectorAll?.('.label').forEach((label) => label.remove());
      wrapper.setAttribute('clip-path', `url(#${clipId})`);
      wrapper.setAttribute('data-cosmic-shard', metadata.id);
      wrapper.setAttribute('data-wave', metadata.wave);
      wrapper.style.transformBox = 'fill-box';
      wrapper.style.transformOrigin = `${metadata.centroid.x * 100}% ${metadata.centroid.y * 100}%`;
      wrapper.style.willChange = 'transform, opacity';
      wrapper.append(canonical);
      host.append(wrapper);
      this.clones.push(wrapper);
      this.currentTransforms.set(metadata.id, { x: 0, y: 0, rotation: 0, opacity: 1 });
      return Object.freeze({ ...metadata, wrapper });
    });

    const bbox = this.group.getBBox?.() ?? { x: 0, y: 0, width: 900, height: 700 };
    const crackClipId = this.uid + '-crack-constellation';
    const crackClip = makeGeometryClip(doc, crackClipId, this.group);
    defs.append(crackClip);
    this.clipNodes.push(crackClip);

    const crackHost = doc.createElementNS(NS, 'g');
    crackHost.setAttribute('data-cosmic-cracks', 'true');
    crackHost.style.pointerEvents = 'none';
    crackHost.setAttribute('clip-path', 'url(#' + crackClipId + ')');
    const sourceTransform = this.group.getAttribute?.('transform');
    if (sourceTransform) crackHost.setAttribute('transform', sourceTransform);
    this.crackPaths = CRACK_SEGMENTS.map((points, index) => {
      const path = makeCrackPath(doc, bbox, points, index);
      crackHost.append(path);
      return path;
    });

    this.svg.append(host, crackHost);
    this.cloneHost = host;
    this.crackHost = crackHost;
    this.prepared = true;
    return this;
  }

  tension(progress) {
    if (!this.prepared) this.prepare();
    const p = clamp01(progress);
    if (p === this.lastTensionProgress) return;
    this.lastTensionProgress = p;
    const brightness = round3(1 + p * 0.55);
    const saturation = round3(1 + p * 0.28);
    setInlineStyleIfChanged(this.group.style, 'filter', `brightness(${brightness}) saturate(${saturation})`);
  }

  crackSeed(progress) {
    if (!this.prepared) this.prepare();
    const p = clamp01(progress);
    if (p === this.lastCrackSeedProgress) return;
    this.lastCrackSeedProgress = p;
    const count = Math.min(2, this.crackPaths.length);
    for (let index = 0; index < this.crackPaths.length; index += 1) {
      const path = this.crackPaths[index];
      if (index < count) {
        const local = clamp01(p * count - index + 0.45);
        setInlineStyleIfChanged(path.style, 'opacity', `${round3(local)}`);
        setInlineStyleIfChanged(path.style, 'strokeDasharray', '1');
        setInlineStyleIfChanged(path.style, 'strokeDashoffset', `${round3(1 - local)}`);
      } else {
        setInlineStyleIfChanged(path.style, 'opacity', '0');
      }
    }
  }

  crackPropagation(progress) {
    if (!this.prepared) this.prepare();
    const p = clamp01(progress);
    if (p === this.lastCrackPropagationProgress) return;
    this.lastCrackPropagationProgress = p;
    for (let index = 0; index < this.crackPaths.length; index += 1) {
      const staggerStart = index / (this.crackPaths.length + 2);
      const local = clamp01((p - staggerStart) / Math.max(0.18, 1 - staggerStart));
      const path = this.crackPaths[index];
      setInlineStyleIfChanged(path.style, 'opacity', `${round3(local)}`);
      setInlineStyleIfChanged(path.style, 'strokeDasharray', '1');
      setInlineStyleIfChanged(path.style, 'strokeDashoffset', `${round3(1 - local)}`);
    }
    const fade = 1 - p * p * (3 - 2 * p);
    for (const { element } of this.labels) setInlineStyleIfChanged(element.style, 'opacity', `${round3(fade)}`);
  }

  #applyTransform(shard, transform) {
    const x = round3(transform.x);
    const y = round3(transform.y);
    const rotation = round3(transform.rotation);
    const opacity = round3(transform.opacity ?? 1);
    let stable = this.currentTransforms.get(shard.id);
    if (stable && stable.x === x && stable.y === y && stable.rotation === rotation && stable.opacity === opacity) return;
    if (stable) Object.assign(stable, { x, y, rotation, opacity });
    else {
      stable = { x, y, rotation, opacity };
      this.currentTransforms.set(shard.id, stable);
    }
    shard.wrapper.style.transform = `translate3d(${stable.x}px, ${stable.y}px, 0) rotate(${stable.rotation}deg)`;
    shard.wrapper.style.opacity = `${stable.opacity}`;
  }

  releaseWave(name, progress) {
    if (!this.prepared) this.prepare();
    const wave = String(name || '').toUpperCase();
    if (!this.waveProgress.has(wave)) return;
    const p = clamp01(progress);
    if (this.waveProgress.get(wave) === p) return;
    this.waveProgress.set(wave, p);
    if (p > 0) {
      this.cloneHost.style.opacity = '1';
      this.group.style.visibility = 'hidden';
    }
    for (const shard of this.shards) {
      if (shard.wave !== wave) continue;
      this.#applyTransform(shard, preBreakTransform(shard, p));
    }
  }

  applyExplosion(progress, cinematicSeconds) {
    if (!this.prepared) this.prepare();
    const p = clamp01(progress);
    if (p <= 0 && (!Number.isFinite(cinematicSeconds) || cinematicSeconds < EXPLOSION_START)) return;
    this.cloneHost.style.opacity = '1';
    this.group.style.visibility = 'hidden';
    const seconds = Number.isFinite(cinematicSeconds)
      ? cinematicSeconds
      : EXPLOSION_START + p * (COSMIC_PHASES.bigBang.end - EXPLOSION_START);
    for (const shard of this.shards) this.#applyTransform(shard, sampleShardTransform(shard, seconds));
  }

  sampleAt(cinematicSeconds) {
    if (!this.prepared) this.prepare();
    if (!Number.isFinite(cinematicSeconds)) return;
    if (cinematicSeconds >= EXPLOSION_START) {
      this.applyExplosion(1, cinematicSeconds);
      return;
    }
    for (const shard of this.shards) {
      const p = this.waveProgress.get(shard.wave) ?? 0;
      this.#applyTransform(shard, preBreakTransform(shard, p));
    }
  }

  getShardTransform(id) {
    return { ...(this.currentTransforms.get(id) ?? { x: 0, y: 0, rotation: 0, opacity: 1 }) };
  }

  getOriginScreenPoint() {
    if (!this.prepared) this.prepare();
    return { ...this.origin };
  }

  getResidualTargets() {
    if (!this.prepared) this.prepare();
    return this.shards.map((shard) => {
      const transform = this.currentTransforms.get(shard.id) ?? { x: 0, y: 0 };
      return {
        id: shard.id,
        x: this.groupRect.left + this.groupRect.width * shard.centroid.x + transform.x,
        y: this.groupRect.top + this.groupRect.height * shard.centroid.y + transform.y,
      };
    });
  }

  enterResidualDrift(startSeconds, scheduler = this.scheduler) {
    if (!this.prepared) this.prepare();
    if (this.residualRaf != null) scheduler.cancelAnimationFrame?.(this.residualRaf);
    this.residualCinematicStart = Number.isFinite(startSeconds) ? startSeconds : COSMIC_PHASES.melancholicIdle.start;
    this.residualStartedAt = scheduler.now?.() ?? 0;
    const tick = (now) => {
      const elapsed = Math.max(0, ((Number.isFinite(now) ? now : scheduler.now?.() ?? 0) - this.residualStartedAt) / 1000);
      this.sampleAt(this.residualCinematicStart + elapsed);
      this.residualRaf = scheduler.requestAnimationFrame?.(tick) ?? null;
    };
    this.residualRaf = scheduler.requestAnimationFrame?.(tick) ?? null;
  }

  stopResidualDrift(scheduler = this.scheduler) {
    if (this.residualRaf != null) scheduler.cancelAnimationFrame?.(this.residualRaf);
    this.residualRaf = null;
  }

  releaseHeavyPreparation() {
    this.crackHost?.remove?.();
    this.group.style.filter = '';
  }

  destroy({ restoreOriginal = true } = {}) {
    this.stopResidualDrift();
    this.cloneHost?.remove?.();
    this.crackHost?.remove?.();
    for (const clip of this.clipNodes) clip.remove?.();
    this.group.style.filter = '';
    this.group.style.opacity = '';
    this.group.style.visibility = restoreOriginal ? '' : 'hidden';
    for (const { element, opacity } of this.labels) element.style.opacity = opacity;
    this.labels = [];
    this.clones = [];
    this.shards = [];
    this.crackPaths = [];
    this.clipNodes = [];
    this.cloneHost = null;
    this.crackHost = null;
    this.currentTransforms.clear();
    this.prepared = false;
  }

  // Compatibility aliases retained while controller migration is in progress.
  warn(progress) {
    const p = clamp01(progress);
    this.crackSeed(Math.min(1, p * 1.6));
    this.crackPropagation(clamp01((p - 0.22) / 0.78));
  }

  fracture(progress) {
    const p = clamp01(progress);
    this.releaseWave('A', clamp01(p * 3));
    this.releaseWave('B', clamp01((p - 0.22) * 3));
    this.releaseWave('C', clamp01((p - 0.46) * 3));
    if (p > 0.7) this.applyExplosion((p - 0.7) / 0.3, EXPLOSION_START + ((p - 0.7) / 0.3));
  }

  fadeDebris(progress) {
    const p = clamp01(progress);
    this.applyExplosion(1, COSMIC_PHASES.debrisExpansion.start + p * (COSMIC_PHASES.debrisExpansion.end - COSMIC_PHASES.debrisExpansion.start));
  }

  cleanup({ keepOriginalHidden = true } = {}) {
    this.destroy({ restoreOriginal: !keepOriginalHidden });
  }
}
