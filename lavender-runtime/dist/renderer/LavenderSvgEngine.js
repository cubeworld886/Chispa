import { crescentPath, orbitCenter, orbitRotationDeg, orbitRx, orbitRy, star0Center, star0Inner, star0Outer, star1Center, star1Inner, star1Outer, star2Center, star2Inner, star2Outer } from '../geometry/lavenderGeometry.js';
import { POS_FRONT_BODY, POS_TAKEOFF_BODY, POS_ANTICIPATION_BODY, POS_BRAKE_BODY, POS_LAND_BODY, POS_SQUASH_BODY, POS_BOUNCE_BODY, POS_SETTLE_BODY, POS_FRONT_EYES, POS_TAKEOFF_EYES, POS_ANTICIPATION_EYES, POS_BRAKE_EYES, POS_LAND_EYES, POS_SQUASH_EYES, POS_BOUNCE_EYES, POS_SETTLE_EYES, POS_FRONT_SEAM, POS_FRONT_PETAL, POS_BRAKE_SEAM, POS_BRAKE_PETAL, POS_LAND_SEAM, POS_LAND_PETAL, POS_SQUASH_SEAM, POS_SQUASH_PETAL, POS_BOUNCE_SEAM, POS_BOUNCE_PETAL, POS_SETTLE_SEAM, POS_SETTLE_PETAL, POS_IDENTITY_MATRIX, POS_TAKEOFF_MATRIX, POS_ANTICIPATION_MATRIX, POS_BRAKE_MATRIX, POS_LAND_MATRIX, POS_SQUASH_MATRIX, POS_BOUNCE_MATRIX, POS_SETTLE_MATRIX, WEB_PROFILE_BODY, WEB_PROFILE_ACCEL_BODY, WEB_ARC_BODY, WEB_HERO_APPROACH_BODY, WEB_PROFILE_EYE, WEB_PROFILE_ACCEL_EYE, WEB_ARC_EYE, WEB_HERO_APPROACH_EYE } from '../geometry/posWebIdentity.js';
import { lavenderMaterialManifest } from '../materials/materialManifest.js';
import { materialMorphPoints, morphEyePoints, morphRidgePoints, morphInfluence, resampleClosed, resampleOpen, warpBodyPoint } from '../geometry/morphGeometry.js';
import { basePose, lerpPose, samplePose } from '../core/motion.js?prepdiag=20260928n';
import { defaultLavenderSceneMotion } from '../core/types.js';
import { resolveLavenderPerformance } from '../performance/LavenderPerformanceGovernor.js';
import { C11_FRONT_SEAM, C11_FRONT_PETAL, C11_FRONT_HIGHLIGHT, C11_TAKEOFF_HIGHLIGHT, C11_ANTICIPATION_SEAM, C11_ANTICIPATION_PETAL, C11_ANTICIPATION_HIGHLIGHT, C11_PROFILE_RIM, C11_PROFILE_UNDER_RIM, C11_PROFILE_HIGHLIGHT, C11_PROFILE_ACCEL_RIM, C11_PROFILE_ACCEL_UNDER_RIM, C11_PROFILE_ACCEL_HIGHLIGHT, C11_ARC_RIM, C11_ARC_UNDER_RIM, C11_ARC_HIGHLIGHT, C11_HERO_APPROACH_RIM, C11_HERO_APPROACH_UNDER_RIM, C11_HERO_APPROACH_HIGHLIGHT, C11_BRAKE_HIGHLIGHT, C11_LAND_HIGHLIGHT, C11_SQUASH_HIGHLIGHT, C11_BOUNCE_HIGHLIGHT, C11_SETTLE_HIGHLIGHT, C11_FRONT_SHADOW, C11_TAKEOFF_SHADOW, C11_ANTICIPATION_SHADOW, C11_PROFILE_ACCEL_SHADOW, C11_ARC_SHADOW, C11_HERO_APPROACH_SHADOW, C11_BRAKE_SHADOW, C11_LAND_SHADOW, C11_SQUASH_SHADOW, C11_BOUNCE_SHADOW, C11_SETTLE_SHADOW, C11_FRONT_MATERIAL, C11_TAKEOFF_MATERIAL, C11_ANTICIPATION_MATERIAL, C11_PROFILE_MATERIAL, C11_PROFILE_ACCEL_MATERIAL, C11_ARC_MATERIAL, C11_HERO_APPROACH_MATERIAL, C11_BRAKE_MATERIAL, C11_LAND_MATERIAL, C11_SQUASH_MATERIAL, C11_BOUNCE_MATERIAL, C11_SETTLE_MATERIAL, } from '../svg/keyframeGeometry.js';
import { C11_ORNAMENT_KEYFRAMES } from '../svg/ornamentKeyframes.js';
import { C11_TRAIL_KEYFRAMES } from '../svg/trailKeyframes.js';
const NS = 'http://www.w3.org/2000/svg';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (v) => { const x = clamp(v); return x * x * (3 - 2 * x); };
const wrapYaw = (yaw) => { let v = yaw % (Math.PI * 2); if (v > Math.PI)
    v -= Math.PI * 2; if (v <= -Math.PI)
    v += Math.PI * 2; return v; };
const shortestYawDelta = (from, to) => wrapYaw(to - from);
const pts = (p) => p.map(([x, y]) => [x, y]);
const shiftEye = (points, dx, dy) => points.map(([x, y]) => [x + dx, y + dy]);
const c18 = (p) => p.map(([x, y]) => [x * 1000, y * 1000]);
const deformCinematicContour = (points, pose) => points.map(([x, y]) => {
    const [nextX, nextY] = warpBodyPoint([x / 1000, y / 1000], pose);
    return [nextX * 1000, nextY * 1000];
});
const mixPoints = (a, b, t) => { const u = clamp(t), n = Math.min(a.length, b.length), out = []; for (let i = 0; i < n; i++) {
    const p = a[i], q = b[i];
    out.push([lerp(p[0], q[0], u), lerp(p[1], q[1], u)]);
} return out; };
const mixMaterial = (a, b, t, mirror = false) => { const u = clamp(t), n = Math.min(a.length, b.length), out = []; for (let i = 0; i < n; i++) {
    const p = a[i], q = b[i], x = lerp(p[0], q[0], u);
    out.push([mirror ? 1000 - x : x, lerp(p[1], q[1], u), lerp(p[2], q[2], u), Math.round(lerp(p[3], q[3], u)), Math.round(lerp(p[4], q[4], u)), Math.round(lerp(p[5], q[5], u))]);
} return out; };
const mirrorClosed = (p) => { const q = p.map(([x, y]) => [1000 - x, y]).reverse(); let idx = 0, best = Infinity; for (let i = 0; i < q.length; i++) {
    const score = q[i][1] * 2 + q[i][0] * .0001;
    if (score < best) {
        best = score;
        idx = i;
    }
} return [...q.slice(idx), ...q.slice(0, idx)]; };
const mirrorOpen = (p) => p.map(([x, y]) => [1000 - x, y]);
const closedPath = (p) => { if (!p.length)
    return ''; const first = p[0], last = p[p.length - 1]; let d = `M ${(last[0] + first[0]) / 2} ${(last[1] + first[1]) / 2}`; for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    d += ` Q ${a[0]} ${a[1]} ${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2}`;
} return d + ' Z'; };
const openPath = (p) => { if (!p.length)
    return ''; let d = `M ${p[0][0]} ${p[0][1]}`; for (let i = 1; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1];
    d += ` Q ${a[0]} ${a[1]} ${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2}`;
} const z = p[p.length - 1]; return d + ` L ${z[0]} ${z[1]}`; };
const centroid = (p) => { let x = 0, y = 0; for (const a of p) {
    x += a[0];
    y += a[1];
} return [x / Math.max(1, p.length), y / Math.max(1, p.length)]; };
const retreatEyeAtOwnEdge = (p, amount) => { const q = clamp(amount), [cx, cy] = centroid(p), edge = cx < 500 ? -1 : 1, sx = lerp(1, .72, q), sy = lerp(1, .90, q), dx = edge * 12 * q; return p.map(([x, y]) => [cx + (x - cx) * sx + dx, cy + (y - cy) * sy]); };
const pointBounds = (p) => { const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const applyPosAffine = (p, m) => p.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
const aperture = (p, open) => { const [, cy] = centroid(p), o = smooth(clamp(open)); return p.map(([x, y]) => [x, cy + (y - cy) * o]); };
const color = (n) => `#${Math.max(0, n | 0).toString(16).padStart(6, '0')}`;
const mixHex = (a, b, t) => { const u = clamp(t), pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), ch = (shift) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, u)); return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`; };
function el(name, attrs = {}) { const node = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs))
    node.setAttribute(k, String(v)); return node; }
const mixTuple = (a, b, t) => a.map((v, i) => lerp(v, b[i] ?? v, t));
const mixTrail = (a, b, t) => { if (!a.length)
    return b; if (!b.length)
    return a; const n = Math.min(a.length, b.length), out = []; for (let i = 0; i < n; i++)
    out.push([lerp(a[i][0], b[i][0], t), lerp(a[i][1], b[i][1], t)]); return out; };
const mirrorAngle = (deg) => 180 - deg;
const mirrorTrail = (p) => p.map(([x, y]) => [1000 - x, y]);
const ellipsePoint = (o, t) => { const [cx, cy, rx, ry, deg] = o, a = deg * Math.PI / 180, ct = Math.cos(t), st = Math.sin(t); return [cx + rx * ct * Math.cos(a) - ry * st * Math.sin(a), cy + rx * ct * Math.sin(a) + ry * st * Math.cos(a)]; };
const ellipseFrontArc = (o) => { const half = (start) => Array.from({ length: 33 }, (_, i) => ellipsePoint(o, start + Math.PI * i / 32)), a = half(0), b = half(Math.PI), avg = (p) => p.reduce((n, q) => n + q[1], 0) / p.length; return avg(a) > avg(b) ? a : b; };
function starD(cx, cy, outer, inner) { return `M ${cx} ${cy - outer} C ${cx + inner * .22} ${cy - outer * .52},${cx + inner * .72} ${cy - inner * .72},${cx + inner} ${cy - inner} C ${cx + inner * .72} ${cy - inner * .28},${cx + outer * .52} ${cy - inner * .18},${cx + outer} ${cy} C ${cx + outer * .52} ${cy + inner * .18},${cx + inner * .72} ${cy + inner * .28},${cx + inner} ${cy + inner} C ${cx + inner * .28} ${cy + inner * .72},${cx + inner * .18} ${cy + outer * .52},${cx} ${cy + outer} C ${cx - inner * .18} ${cy + outer * .52},${cx - inner * .28} ${cy + inner * .72},${cx - inner} ${cy + inner} C ${cx - inner * .72} ${cy + inner * .28},${cx - outer * .52} ${cy + inner * .18},${cx - outer} ${cy} C ${cx - outer * .52} ${cy - inner * .18},${cx - inner * .72} ${cy - inner * .28},${cx - inner} ${cy - inner} C ${cx - inner * .72} ${cy - inner * .72},${cx - inner * .22} ${cy - outer * .52},${cx} ${cy - outer} Z`; }
/**
 * C11 keeps the historic class name so the site API stays stable, but the renderer is now
 * a pure persistent SVG actor. Production geometry comes from approved SVG keyframes,
 * never from a runtime formula that invents a profile from the front.
 */
export class LavenderSvgEngine {
    host;
    svg;
    actor;
    bodyGroup;
    eyeRoot;
    ornaments;
    trailGroup;
    materialCloud;
    materialBlobs = [];
    materialGradients = [];
    materialStops = [];
    bodyClipPath;
    bodyOuterGlowA;
    bodyOuterGlowB;
    bodyOuterGlowC;
    bodyGlow;
    bodyRimGlow;
    bodyPath;
    morphTint;
    posBodyImage;
    bodyProfileTone;
    referenceShadow;
    referenceHighlight;
    bodyHighlight;
    bodyMidGlow;
    bodyShadow;
    bodyEdge;
    petal;
    seam;
    rim;
    underRim;
    leftEyeGroup;
    rightEyeGroup;
    posLeftEyeImage;
    posRightEyeImage;
    posLeftEyeClipPath;
    posRightEyeClipPath;
    leftEyeDark;
    rightEyeDark;
    leftEyeGlow;
    rightEyeGlow;
    leftEyeDepth;
    rightEyeDepth;
    leftEyeSheen;
    rightEyeSheen;
    leftEyeSocketGlow;
    rightEyeSocketGlow;
    leftEyeSocket;
    rightEyeSocket;
    leftEye;
    rightEye;
    leftEyeTint;
    rightEyeTint;
    leftMaskPath;
    rightMaskPath;
    orbitBack;
    orbitFront;
    posCrescentImage;
    crescent;
    stars = [];
    sparkleNodes = [];
    trails = [];
    trailGlows = [];
    energyTrailOuter = [];
    energyTrailMid = [];
    energyTrailCore = [];
    landingBeamOuter;
    landingBeamMid;
    landingBeamCore;
    state = 'idle';
    started = performance.now();
    stateStarted = performance.now();
    lastPose = basePose('idle');
    transitionFrom = basePose('idle');
    transitionStarted = performance.now();
    sceneView = { scale: 1, centerX: .5, centerY: .5, anchorX: .5, anchorY: .515, alpha: 1 };
    sceneMotion = { ...defaultLavenderSceneMotion };
    gazeX = 0;
    gazeY = 0;
    targetGazeX = 0;
    targetGazeY = 0;
    headTurn = 0;
    headTurnVelocity = 0;
    cinematicPerformance = false;
    cinematicEyeReveal = 1;
    lastFacePose = null;
    pressed = false;
    cinematicLock = false;
    cinematicLeft = 1;
    cinematicRight = 1;
    cinematicFocus = 0;
    cinematicEyeIsolation = null;
    bodyReveal = 1;
    yaw = 0;
    targetYaw = 0;
    yawVelocity = 0;
    storyboardMotion = null;
    storyboardDirection = 1;
    travel = { stretch: 0, squash: 0, lift: 0, roll: 0, energy: 0 };
    targetTravel = { stretch: 0, squash: 0, lift: 0, roll: 0, energy: 0 };
    raf = 0;
    destroyed = false;
    hostResizeObserver;
    cachedShape;
    cachedShapePaths;
    lastShapeMode = '';
    lastShapeDriver = Number.NaN;
    lastCloseUp = false;
    lastMaterialMode = '';
    lastMaterialDriver = Number.NaN;
    lastLayoutW = -1;
    lastLayoutH = -1;
    lastLayoutScale = Number.NaN;
    lastLayoutCenterX = Number.NaN;
    lastLayoutCenterY = Number.NaN;
    lastLayoutAnchorX = Number.NaN;
    lastLayoutAnchorY = Number.NaN;
    lastLayoutAlpha = Number.NaN;
    lastLeftMaskOpen = Number.NaN;
    lastRightMaskOpen = Number.NaN;
    uid = `lav-${Math.random().toString(36).slice(2)}`;
    reduced;
    quality;
    performance;
    lastRenderedAt = 0;
    lastStoryboardVfxAt = 0;
    constructor(host, options = {}) {
        this.host = host;
        this.reduced = options.reducedMotion ?? matchMedia('(prefers-reduced-motion:reduce)').matches;
        this.performance = resolveLavenderPerformance(options.quality ?? 'auto');
        this.quality = this.performance.quality;
    }
    async init() { this.build(); this.syncHostSize(); if ('ResizeObserver' in window) {
        this.hostResizeObserver = new ResizeObserver(() => this.syncHostSize());
        this.hostResizeObserver.observe(this.host);
    } this.forceVisibleFrame(); this.raf = requestAnimationFrame(this.tick); }
    pauseAnimation() { if (this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
    } }
    resumeAnimation() { if (this.destroyed || this.raf)
        return;
        this.raf = requestAnimationFrame(this.tick);
    }
    getState() { return this.state; }
    getQuality() { return this.quality; }
    setCinematicLock(v) { this.cinematicLock = v; if (v) {
        this.targetYaw = this.yaw;
        this.yawVelocity = 0;
    } }
    setCinematicPerformance(v) { this.cinematicPerformance = Boolean(v); this.lastFacePose = null; if (!this.cinematicPerformance) {
        this.headTurn = 0;
        this.headTurnVelocity = 0;
    } }
    primeCinematicBoot() { this.cinematicLock = true; this.cinematicPerformance = false; this.cinematicEyeIsolation = 'left'; this.cinematicLeft = 0; this.cinematicRight = 0; this.cinematicEyeReveal = 0; this.bodyReveal = 0; this.cinematicFocus = 0; this.gazeX = 0; this.gazeY = 0; this.targetGazeX = 0; this.targetGazeY = 0; this.headTurn = 0; this.headTurnVelocity = 0; this.yaw = 0; this.targetYaw = 0; this.yawVelocity = 0; this.storyboardMotion = null; this.sceneMotion = { ...defaultLavenderSceneMotion, orbitOpacity: 0, crescentOpacity: 0, star0Opacity: 0, star1Opacity: 0, star2Opacity: 0 }; }
    setCinematicEyes(left, right) { this.cinematicLeft = clamp(left); this.cinematicRight = clamp(right); }
    setCinematicFocus(v) { this.cinematicFocus = clamp(v); }
    setCinematicEyeIsolation(side) { this.cinematicEyeIsolation = side; }
    setCinematicEyeReveal(v) { this.cinematicEyeReveal = clamp(v); }
    setCinematicBodyReveal(v) { this.bodyReveal = clamp(v); }
    setCinematicGaze(x, y) { this.targetGazeX = clamp(x, -1, 1); this.targetGazeY = clamp(y, -1, 1); }
    setPressed(v) { this.pressed = v; }
    setGaze(x, y) { this.targetGazeX = clamp(x, -1, 1); this.targetGazeY = clamp(y, -1, 1); }
    setHeadTurn(v) { this.headTurn = clamp(v, -.16, .16); }
    getOrientationYaw() { return this.yaw; }
    setOrientationYaw(v, immediate = false) { this.targetYaw = clamp(wrapYaw(v), -Math.PI / 2, Math.PI / 2); if (immediate) {
        this.yaw = this.targetYaw;
        this.yawVelocity = 0;
    } }
    setStoryboardMotion(progress, direction = 1) { const entering = this.storyboardMotion === null && progress !== null; this.storyboardMotion = progress === null ? null : clamp(progress); this.storyboardDirection = (direction >= 0 ? 1 : -1); if (entering || progress === null)
        this.lastStoryboardVfxAt = 0; }
    forceVisibleFrame() { this.svg.style.opacity = '1'; this.svg.style.visibility = 'visible'; this.host.style.background = 'transparent'; this.render(performance.now()); }
    setTravelDynamics(next) { this.targetTravel = { ...this.targetTravel, ...next }; }
    snapMotion() { this.gazeX = this.targetGazeX; this.gazeY = this.targetGazeY; this.yaw = this.targetYaw; this.yawVelocity = 0; this.travel = { ...this.targetTravel }; }
    getSceneView() { return { ...this.sceneView }; }
    getViewportSize() { return { width: Math.max(1, this.host.clientWidth), height: Math.max(1, this.host.clientHeight) }; }
    sceneForScreenRect(left, top, size) { const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight), side = Math.max(1, Math.min(w, h)); return { scale: Math.max(.01, size / side), centerX: (left + size * .5) / w, centerY: (top + size * .515) / h, anchorX: .5, anchorY: .515, alpha: 1 }; }
    getActorScreenRect() { const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight), side = Math.max(1, Math.min(w, h)), size = side * this.sceneView.scale, left = w * this.sceneView.centerX - this.sceneView.anchorX * size, top = h * this.sceneView.centerY - this.sceneView.anchorY * size; return { left, top, width: size, height: size, right: left + size, bottom: top + size }; }
    // WIP41: setters only mutate state. layout() commits exactly once from render/sizing.
    setSceneView(next) { this.sceneView = { ...this.sceneView, ...next }; if (!this.cinematicLock)
        this.keepActorSafe(); }
    resetSceneView() { this.sceneView = { scale: 1, centerX: .5, centerY: .5, anchorX: .5, anchorY: .515, alpha: 1 }; }
    getSceneMotion() { return { ...this.sceneMotion }; }
    setSceneMotion(next) { this.sceneMotion = { ...this.sceneMotion, ...next }; }
    resetSceneMotion() { this.sceneMotion = { ...defaultLavenderSceneMotion }; }
    setState(next) { if (next === this.state)
        return; this.transitionFrom = this.lastPose; this.transitionStarted = performance.now(); this.state = next; this.stateStarted = performance.now(); }
    syncHostSize = () => { if (this.destroyed)
        return; const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight); this.svg?.setAttribute('viewBox', `0 0 ${w} ${h}`); this.svg?.setAttribute('width', String(w)); this.svg?.setAttribute('height', String(h)); this.layout(); };
    destroy() { this.destroyed = true; if (this.raf)
        cancelAnimationFrame(this.raf); this.hostResizeObserver?.disconnect(); this.hostResizeObserver = undefined; removeEventListener('resize', this.syncHostSize); this.svg?.remove(); }
    build() {
        this.host.replaceChildren();
        this.host.style.background = 'transparent';
        this.host.dataset.lavenderQuality = this.quality;
        this.svg = el('svg', { class: 'lavender-svg-runtime', 'aria-hidden': 'true', preserveAspectRatio: 'none', 'shape-rendering': 'geometricPrecision' });
        this.svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;background:transparent;pointer-events:none;';
        const blurScale = this.quality === 'optimized' ? .42 : .62, outerBlur = (55 * blurScale).toFixed(2), bodyBlur = (18 * blurScale).toFixed(2), eyeBlur = (7.2 * blurScale).toFixed(2), softBlur = (7 * blurScale).toFixed(2), referenceBlur = (12 * blurScale).toFixed(2), trailBlur = (12 * blurScale).toFixed(2), energyBlur = (34 * blurScale).toFixed(2), cinematicEyeBlur = this.quality === 'optimized' ? '1.05' : '1.35';
        const defs = el('defs');
        defs.innerHTML = `
      <linearGradient id="${this.uid}-body" x1="18%" y1="2%" x2="58%" y2="100%"><stop offset="0" stop-color="#cf91ff"/><stop offset=".16" stop-color="#b766ff"/><stop offset=".43" stop-color="#9550f6"/><stop offset=".70" stop-color="#7432e8"/><stop offset="1" stop-color="#4510aa"/></linearGradient>
      <radialGradient id="${this.uid}-shine" cx="42%" cy="20%" r="56%"><stop offset="0" stop-color="#d59cff" stop-opacity=".88"/><stop offset=".22" stop-color="#c884ff" stop-opacity=".48"/><stop offset=".55" stop-color="#b970ff" stop-opacity=".18"/><stop offset="1" stop-color="#ad79f9" stop-opacity="0"/></radialGradient>
      <radialGradient id="${this.uid}-midglow" cx="74%" cy="34%" r="52%"><stop offset="0" stop-color="#be74ff" stop-opacity=".76"/><stop offset=".44" stop-color="#b982fb" stop-opacity=".17"/><stop offset="1" stop-color="#8d59f8" stop-opacity="0"/></radialGradient>
      <radialGradient id="${this.uid}-shadow" cx="49%" cy="78%" r="59%"><stop offset="0" stop-color="#23056e" stop-opacity=".88"/><stop offset=".34" stop-color="#3711a2" stop-opacity=".52"/><stop offset=".72" stop-color="#5525c4" stop-opacity=".12"/><stop offset="1" stop-color="#4f25cc" stop-opacity="0"/></radialGradient>
      <radialGradient id="${this.uid}-edge" cx="50%" cy="44%" r="70%"><stop offset="0" stop-color="#351462" stop-opacity="0"/><stop offset=".66" stop-color="#441dc0" stop-opacity=".03"/><stop offset=".88" stop-color="#351462" stop-opacity=".20"/><stop offset="1" stop-color="#26075f" stop-opacity=".42"/></radialGradient>
      <linearGradient id="${this.uid}-petal" x1="22%" y1="4%" x2="80%" y2="94%"><stop offset="0" stop-color="#f0d7ff" stop-opacity=".84"/><stop offset=".28" stop-color="#d5aef9" stop-opacity=".66"/><stop offset=".68" stop-color="#9f6af8" stop-opacity=".38"/><stop offset="1" stop-color="#6232e2" stop-opacity=".16"/></linearGradient>
      <radialGradient id="${this.uid}-eye" cx="43%" cy="37%" r="76%"><stop offset="0" stop-color="#ffffff"/><stop offset=".30" stop-color="#fffefe"/><stop offset=".61" stop-color="#fffaff"/><stop offset=".84" stop-color="#f5e8ff"/><stop offset="1" stop-color="#cba4ff"/></radialGradient>
      <radialGradient id="${this.uid}-eyeCinematic" cx="40%" cy="34%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".24" stop-color="#ffffff"/><stop offset=".52" stop-color="#fff9ff"/><stop offset=".76" stop-color="#f2ddff"/><stop offset=".92" stop-color="#d8b6ff"/><stop offset="1" stop-color="#b982ff"/></radialGradient>
      <linearGradient id="${this.uid}-eyeDepth" x1="18%" y1="10%" x2="78%" y2="92%"><stop offset="0" stop-color="#ffffff" stop-opacity=".30"/><stop offset=".46" stop-color="#ffffff" stop-opacity="0"/><stop offset=".78" stop-color="#a36cff" stop-opacity=".12"/><stop offset="1" stop-color="#7240d8" stop-opacity=".32"/></linearGradient>
      <radialGradient id="${this.uid}-eyeSheen" cx="31%" cy="24%" r="58%"><stop offset="0" stop-color="#ffffff" stop-opacity=".72"/><stop offset=".27" stop-color="#ffffff" stop-opacity=".24"/><stop offset=".58" stop-color="#ffffff" stop-opacity=".055"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${this.uid}-profileTone" x1="16%" y1="10%" x2="82%" y2="94%"><stop offset="0" stop-color="#d6a4ff"/><stop offset=".24" stop-color="#9558f3"/><stop offset=".50" stop-color="#611fd4"/><stop offset=".75" stop-color="#340888"/><stop offset="1" stop-color="#16002f"/></linearGradient>
      <linearGradient id="${this.uid}-orbit" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0" stop-color="#5f3bd0"/><stop offset=".45" stop-color="#9d69ff"/><stop offset=".72" stop-color="#dab7ff"/><stop offset="1" stop-color="#8755ef"/></linearGradient>
      <filter id="${this.uid}-outerGlow" x="-74%" y="-74%" width="248%" height="248%"><feGaussianBlur stdDeviation="${outerBlur}"/></filter>
      <filter id="${this.uid}-bodyGlow" x="-48%" y="-48%" width="196%" height="196%"><feGaussianBlur stdDeviation="${bodyBlur}"/></filter>
      <filter id="${this.uid}-eyeGlow" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${eyeBlur}"/></filter>
      <filter id="${this.uid}-eyeGlowCinematic" x="-34%" y="-34%" width="168%" height="168%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${cinematicEyeBlur}"/></filter>
      <filter id="${this.uid}-softGlow" x="-58%" y="-58%" width="216%" height="216%"><feGaussianBlur stdDeviation="${softBlur}"/></filter>
      <filter id="${this.uid}-referenceZoneBlur" x="-48%" y="-48%" width="196%" height="196%"><feGaussianBlur stdDeviation="${referenceBlur}"/></filter>
      <filter id="${this.uid}-trailGlow" x="-72%" y="-72%" width="244%" height="244%"><feGaussianBlur stdDeviation="${trailBlur}"/></filter>
      <filter id="${this.uid}-energyTrailBlur" x="-82%" y="-82%" width="264%" height="264%"><feGaussianBlur stdDeviation="${energyBlur}"/></filter>
      <linearGradient id="${this.uid}-trailBloomRight" gradientUnits="userSpaceOnUse" x1="-540" y1="0" x2="310" y2="0"><stop offset="0" stop-color="#4410b8" stop-opacity="0"/><stop offset=".30" stop-color="#5118cc" stop-opacity=".20"/><stop offset=".70" stop-color="#6d2ce8" stop-opacity=".76"/><stop offset="1" stop-color="#8740fa" stop-opacity="1"/></linearGradient>
      <linearGradient id="${this.uid}-trailCoreRight" gradientUnits="userSpaceOnUse" x1="-540" y1="0" x2="310" y2="0"><stop offset="0" stop-color="#591dcf" stop-opacity="0"/><stop offset=".35" stop-color="#6722df" stop-opacity=".30"/><stop offset=".72" stop-color="#7b30ef" stop-opacity=".80"/><stop offset="1" stop-color="#9646ff" stop-opacity="1"/></linearGradient>
      <linearGradient id="${this.uid}-trailBloomLeft" gradientUnits="userSpaceOnUse" x1="1540" y1="0" x2="690" y2="0"><stop offset="0" stop-color="#4410b8" stop-opacity="0"/><stop offset=".30" stop-color="#5118cc" stop-opacity=".20"/><stop offset=".70" stop-color="#6d2ce8" stop-opacity=".76"/><stop offset="1" stop-color="#8740fa" stop-opacity="1"/></linearGradient>
      <linearGradient id="${this.uid}-trailCoreLeft" gradientUnits="userSpaceOnUse" x1="1540" y1="0" x2="690" y2="0"><stop offset="0" stop-color="#591dcf" stop-opacity="0"/><stop offset=".35" stop-color="#6722df" stop-opacity=".30"/><stop offset=".72" stop-color="#7b30ef" stop-opacity=".80"/><stop offset="1" stop-color="#9646ff" stop-opacity="1"/></linearGradient>
      <clipPath id="${this.uid}-bodyClip"><path id="${this.uid}-bodyClipPath"/></clipPath>
      <clipPath id="${this.uid}-posLeftEyeClip"><path id="${this.uid}-posLeftEyeClipPath"/></clipPath>
      <clipPath id="${this.uid}-posRightEyeClip"><path id="${this.uid}-posRightEyeClipPath"/></clipPath>
      <clipPath id="${this.uid}-posCrescentClip"><path d="${closedPath(c18(crescentPath))}"/></clipPath>
      <mask id="${this.uid}-leftMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000" maskContentUnits="userSpaceOnUse"><rect width="1000" height="1000" fill="black"/><path id="${this.uid}-leftMaskPath" fill="white"/></mask>
      <mask id="${this.uid}-rightMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000" maskContentUnits="userSpaceOnUse"><rect width="1000" height="1000" fill="black"/><path id="${this.uid}-rightMaskPath" fill="white"/></mask>`;
        this.svg.append(defs);
        this.actor = el('g');
        this.svg.append(this.actor);
        this.trailGroup = el('g');
        this.actor.append(this.trailGroup);
        for (let i = 0; i < 4; i++) {
            const outer = el('path', { fill: 'none', 'stroke-linecap': 'round', opacity: 0, filter: `url(#${this.uid}-energyTrailBlur)` }), mid = el('path', { fill: 'none', 'stroke-linecap': 'round', opacity: 0, filter: `url(#${this.uid}-trailGlow)` }), core = el('path', { fill: 'none', 'stroke-linecap': 'round', opacity: 0 });
            this.trailGroup.append(outer, mid, core);
            this.energyTrailOuter.push(outer);
            this.energyTrailMid.push(mid);
            this.energyTrailCore.push(core);
        }
        for (let i = 0; i < 4; i++) {
            const glow = el('path', { fill: 'none', 'stroke-linecap': 'round', filter: `url(#${this.uid}-trailGlow)` }), core = el('path', { fill: 'none', 'stroke-linecap': 'round' });
            this.trailGroup.append(glow, core);
            this.trailGlows.push(glow);
            this.trails.push(core);
        }
        this.landingBeamOuter = el('path', { fill: 'none', stroke: '#8952ff', 'stroke-linecap': 'round', opacity: 0, filter: `url(#${this.uid}-energyTrailBlur)` });
        this.landingBeamMid = el('path', { fill: 'none', stroke: '#b77dff', 'stroke-linecap': 'round', opacity: 0, filter: `url(#${this.uid}-trailGlow)` });
        this.landingBeamCore = el('path', { fill: 'none', stroke: '#f1ddff', 'stroke-linecap': 'round', opacity: 0 });
        this.trailGroup.append(this.landingBeamOuter, this.landingBeamMid, this.landingBeamCore);
        this.ornaments = el('g');
        this.actor.append(this.ornaments);
        this.orbitBack = el('ellipse', { cx: orbitCenter[0] * 1000, cy: orbitCenter[1] * 1000, rx: orbitRx * 1000, ry: orbitRy * 1000, fill: 'none', stroke: `url(#${this.uid}-orbit)`, 'stroke-width': 3.6, opacity: .72, filter: `url(#${this.uid}-softGlow)`, transform: `rotate(${orbitRotationDeg} ${orbitCenter[0] * 1000} ${orbitCenter[1] * 1000})` });
        this.ornaments.append(this.orbitBack);
        const posCrescent = lavenderMaterialManifest.crescent, posCrescentBounds = posCrescent.bounds;
        this.posCrescentImage = el('image', { href: posCrescent.file, x: posCrescentBounds[0] * 1000, y: posCrescentBounds[1] * 1000, width: (posCrescentBounds[2] - posCrescentBounds[0]) * 1000, height: (posCrescentBounds[3] - posCrescentBounds[1]) * 1000, preserveAspectRatio: 'none', opacity: 0, 'clip-path': `url(#${this.uid}-posCrescentClip)` });
        this.ornaments.append(this.posCrescentImage);
        this.crescent = el('path', { d: closedPath(c18(crescentPath)), fill: '#e3baff', opacity: .96, filter: `url(#${this.uid}-softGlow)` });
        this.ornaments.append(this.crescent);
        const starsData = [[star0Center, star0Outer, star0Inner], [star1Center, star1Outer, star1Inner], [star2Center, star2Outer, star2Inner]];
        for (const [s, o, i] of starsData) {
            const st = el('path', { d: starD(s[0] * 1000, s[1] * 1000, o * 1000, i * 1000), fill: '#f5e6ff', opacity: .94, filter: `url(#${this.uid}-softGlow)` });
            this.ornaments.append(st);
            this.stars.push(st);
        }
        // Storyboard-only micro sparkles. They are reference-backed, not a procedural particle system.
        for (let i = 0; i < 12; i++) {
            const sp = el('path', { fill: '#fbf2ff', opacity: 0, filter: `url(#${this.uid}-softGlow)` });
            this.ornaments.append(sp);
            this.sparkleNodes.push(sp);
        }
        this.bodyGroup = el('g');
        this.actor.append(this.bodyGroup);
        this.bodyOuterGlowA = el('path', { fill: '#9b62ff', opacity: 0, filter: `url(#${this.uid}-outerGlow)` });
        this.bodyOuterGlowB = el('path', { fill: '#9b62ff', opacity: 0, filter: `url(#${this.uid}-outerGlow)` });
        this.bodyOuterGlowC = el('path', { fill: '#9b62ff', opacity: 0, filter: `url(#${this.uid}-outerGlow)` });
        this.bodyOuterGlowC.style.display = 'none';
        this.bodyGlow = el('path', { fill: '#7540ea', opacity: .78, filter: `url(#${this.uid}-bodyGlow)` });
        this.bodyRimGlow = el('path', { fill: 'none', stroke: '#d0a4ff', 'stroke-width': 13, opacity: .82, filter: `url(#${this.uid}-softGlow)` });
        this.bodyPath = el('path', { fill: `url(#${this.uid}-body)`, stroke: '#d8baff', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
        this.morphTint = el('path', { fill: '#8a5cff', opacity: 0, 'clip-path': `url(#${this.uid}-bodyClip)` });
        const posBody = lavenderMaterialManifest.body, posBodyBounds = posBody.bounds;
        this.posBodyImage = el('image', { href: posBody.file, x: posBodyBounds[0] * 1000, y: posBodyBounds[1] * 1000, width: (posBodyBounds[2] - posBodyBounds[0]) * 1000, height: (posBodyBounds[3] - posBodyBounds[1]) * 1000, preserveAspectRatio: 'none', opacity: 0, 'clip-path': `url(#${this.uid}-bodyClip)` });
        this.bodyProfileTone = el('path', { fill: `url(#${this.uid}-profileTone)`, opacity: 0 });
        this.materialCloud = el('g', { 'clip-path': `url(#${this.uid}-bodyClip)`, opacity: .98 });
        for (let i = 0; i < C11_FRONT_MATERIAL.length; i++) {
            const g = el('radialGradient', { id: `${this.uid}-mat-${i}`, gradientUnits: 'userSpaceOnUse', cx: 500, cy: 500, r: 160 });
            const center = el('stop', { offset: '0%', 'stop-color': '#8d59f8', style: 'stop-opacity:var(--lav-mat-center,.76)' }), mid = el('stop', { offset: '52%', 'stop-color': '#8d59f8', style: 'stop-opacity:var(--lav-mat-mid,.34)' }), edge = el('stop', { offset: '100%', 'stop-color': '#8d59f8', 'stop-opacity': 0 });
            g.append(center, mid, edge);
            defs.append(g);
            this.materialGradients.push(g);
            this.materialStops.push(center, mid);
            const c = el('circle', { cx: 500, cy: 500, r: 160, fill: `url(#${this.uid}-mat-${i})` });
            this.materialCloud.append(c);
            this.materialBlobs.push(c);
        }
        this.referenceShadow = el('path', { fill: '#21045f', opacity: 0, filter: `url(#${this.uid}-referenceZoneBlur)`, 'clip-path': `url(#${this.uid}-bodyClip)` });
        this.referenceHighlight = el('path', { fill: '#d69bff', opacity: .32, filter: `url(#${this.uid}-softGlow)`, 'clip-path': `url(#${this.uid}-bodyClip)` });
        this.bodyHighlight = el('path', { fill: `url(#${this.uid}-shine)`, opacity: .70 });
        this.bodyMidGlow = el('path', { fill: `url(#${this.uid}-midglow)`, opacity: .58 });
        this.bodyShadow = el('path', { fill: `url(#${this.uid}-shadow)`, opacity: .72 });
        this.bodyEdge = el('path', { fill: `url(#${this.uid}-edge)`, opacity: .76 });
        this.petal = el('path', { fill: `url(#${this.uid}-petal)`, stroke: '#e4c9ff', 'stroke-width': 2.2, opacity: .0, 'clip-path': `url(#${this.uid}-bodyClip)` });
        this.seam = el('path', { fill: 'none', stroke: '#f0d7ff', 'stroke-width': 3.4, 'stroke-linecap': 'round', opacity: .72, filter: `url(#${this.uid}-softGlow)` });
        this.rim = el('path', { fill: 'none', stroke: '#e9d1ff', 'stroke-width': 3.8, 'stroke-linecap': 'round', opacity: 0, filter: `url(#${this.uid}-softGlow)` });
        this.underRim = el('path', { fill: 'none', stroke: '#7e46ff', 'stroke-width': 8.5, 'stroke-linecap': 'round', opacity: 0, filter: `url(#${this.uid}-softGlow)` });
        for (const n of [this.bodyOuterGlowA, this.bodyOuterGlowB, this.bodyOuterGlowC, this.bodyGlow, this.bodyRimGlow, this.bodyPath, this.morphTint, this.posBodyImage, this.bodyProfileTone, this.materialCloud, this.referenceShadow, this.referenceHighlight, this.bodyHighlight, this.bodyMidGlow, this.bodyShadow, this.bodyEdge, this.petal, this.seam, this.rim, this.underRim])
            this.bodyGroup.append(n);
        this.eyeRoot = el('g', { 'clip-path': `url(#${this.uid}-bodyClip)` });
        this.leftEyeGroup = el('g');
        this.rightEyeGroup = el('g');
        const posLeft = lavenderMaterialManifest['eye-left'], posLeftBounds = posLeft.bounds, posRight = lavenderMaterialManifest['eye-right'], posRightBounds = posRight.bounds;
        this.posLeftEyeImage = el('image', { href: posLeft.file, x: posLeftBounds[0] * 1000, y: posLeftBounds[1] * 1000, width: (posLeftBounds[2] - posLeftBounds[0]) * 1000, height: (posLeftBounds[3] - posLeftBounds[1]) * 1000, preserveAspectRatio: 'none', opacity: 0, 'clip-path': `url(#${this.uid}-posLeftEyeClip)` });
        this.posRightEyeImage = el('image', { href: posRight.file, x: posRightBounds[0] * 1000, y: posRightBounds[1] * 1000, width: (posRightBounds[2] - posRightBounds[0]) * 1000, height: (posRightBounds[3] - posRightBounds[1]) * 1000, preserveAspectRatio: 'none', opacity: 0, 'clip-path': `url(#${this.uid}-posRightEyeClip)` });
        this.leftEyeDark = el('path', { fill: '#16052d', opacity: .10 });
        this.rightEyeDark = el('path', { fill: '#16052d', opacity: .10 });
        this.leftEyeGlow = el('path', { fill: '#c897ff', opacity: .72, filter: `url(#${this.uid}-eyeGlow)` });
        this.rightEyeGlow = el('path', { fill: '#c897ff', opacity: .72, filter: `url(#${this.uid}-eyeGlow)` });
        this.leftEyeDepth = el('path', { fill: `url(#${this.uid}-eyeDepth)`, opacity: .52 });
        this.rightEyeDepth = el('path', { fill: `url(#${this.uid}-eyeDepth)`, opacity: .52 });
        this.leftEyeSheen = el('path', { fill: `url(#${this.uid}-eyeSheen)`, opacity: .54 });
        this.rightEyeSheen = el('path', { fill: `url(#${this.uid}-eyeSheen)`, opacity: .54 });
        this.leftEyeSocketGlow = el('path', { fill: 'none', stroke: '#b680ff', 'stroke-width': 5.8, opacity: .20, filter: `url(#${this.uid}-eyeGlowCinematic)`, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
        this.rightEyeSocketGlow = el('path', { fill: 'none', stroke: '#b680ff', 'stroke-width': 5.8, opacity: .20, filter: `url(#${this.uid}-eyeGlowCinematic)`, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
        this.leftEyeSocket = el('path', { fill: 'none', stroke: '#7150da', 'stroke-width': 2.25, opacity: .92, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
        this.rightEyeSocket = el('path', { fill: 'none', stroke: '#7150da', 'stroke-width': 2.25, opacity: .92, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
        this.leftEye = el('path', { fill: `url(#${this.uid}-eye)`, stroke: '#f4e8ff', 'stroke-width': .72, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
        this.rightEye = el('path', { fill: `url(#${this.uid}-eye)`, stroke: '#f4e8ff', 'stroke-width': .72, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
        this.leftEyeTint = el('path', { fill: '#c58cff', opacity: 0 });
        this.rightEyeTint = el('path', { fill: '#c58cff', opacity: 0 });
        for (const node of [this.leftEyeDark, this.leftEyeGlow, this.posLeftEyeImage, this.leftEye, this.leftEyeDepth, this.leftEyeSheen, this.leftEyeTint])
            node.setAttribute('mask', `url(#${this.uid}-leftMask)`);
        for (const node of [this.rightEyeDark, this.rightEyeGlow, this.posRightEyeImage, this.rightEye, this.rightEyeDepth, this.rightEyeSheen, this.rightEyeTint])
            node.setAttribute('mask', `url(#${this.uid}-rightMask)`);
        this.leftEyeGroup.append(this.leftEyeDark, this.leftEyeGlow, this.posLeftEyeImage, this.leftEye, this.leftEyeDepth, this.leftEyeSheen, this.leftEyeTint, this.leftEyeSocketGlow, this.leftEyeSocket);
        this.rightEyeGroup.append(this.rightEyeDark, this.rightEyeGlow, this.posRightEyeImage, this.rightEye, this.rightEyeDepth, this.rightEyeSheen, this.rightEyeTint, this.rightEyeSocketGlow, this.rightEyeSocket);
        this.eyeRoot.append(this.leftEyeGroup, this.rightEyeGroup);
        this.actor.append(this.eyeRoot);
        this.leftMaskPath = defs.querySelector(`#${this.uid}-leftMaskPath`);
        this.rightMaskPath = defs.querySelector(`#${this.uid}-rightMaskPath`);
        this.bodyClipPath = defs.querySelector(`#${this.uid}-bodyClipPath`);
        this.posLeftEyeClipPath = defs.querySelector(`#${this.uid}-posLeftEyeClipPath`);
        this.posRightEyeClipPath = defs.querySelector(`#${this.uid}-posRightEyeClipPath`);
        this.orbitFront = el('path', { fill: 'none', stroke: `url(#${this.uid}-orbit)`, 'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: .90, filter: `url(#${this.uid}-softGlow)` });
        this.actor.append(this.orbitFront);
        this.host.append(this.svg);
        addEventListener('resize', this.syncHostSize, { passive: true });
    }
    keepActorSafe() { const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight), side = Math.min(w, h), size = side * Math.max(.01, this.sceneView.scale), pad = Math.min(size * .16, 34), minCx = (pad + size * this.sceneView.anchorX) / w, maxCx = (w - pad - size * (1 - this.sceneView.anchorX)) / w, minCy = (70 + size * this.sceneView.anchorY * .78) / h, maxCy = (h - pad - size * (1 - this.sceneView.anchorY) * .70) / h; this.sceneView.centerX = clamp(this.sceneView.centerX, Math.min(.5, minCx), Math.max(.5, maxCx)); this.sceneView.centerY = clamp(this.sceneView.centerY, Math.min(.5, minCy), Math.max(.5, maxCy)); }
    layout() {
        if (!this.actor)
            return;
        const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight), v = this.sceneView, layoutDirty = w !== this.lastLayoutW || h !== this.lastLayoutH || v.scale !== this.lastLayoutScale || v.centerX !== this.lastLayoutCenterX || v.centerY !== this.lastLayoutCenterY || v.anchorX !== this.lastLayoutAnchorX || v.anchorY !== this.lastLayoutAnchorY || v.alpha !== this.lastLayoutAlpha;
        if (!layoutDirty)
            return;
        this.lastLayoutW = w;
        this.lastLayoutH = h;
        this.lastLayoutScale = v.scale;
        this.lastLayoutCenterX = v.centerX;
        this.lastLayoutCenterY = v.centerY;
        this.lastLayoutAnchorX = v.anchorX;
        this.lastLayoutAnchorY = v.anchorY;
        this.lastLayoutAlpha = v.alpha;
        const side = Math.min(w, h), size = side * Math.max(.01, v.scale), left = w * v.centerX - v.anchorX * size, top = h * v.centerY - v.anchorY * size;
        this.actor.setAttribute('transform', `translate(${left} ${top}) scale(${size / 1000})`);
        this.actor.setAttribute('opacity', String(clamp(v.alpha)));
        const companion = this.host.closest('.lavender-companion');
        if (companion) {
            const hit = Math.max(76, size * .58), cx = left + size * .5, cy = top + size * .52;
            companion.style.setProperty('--lav-actor-left', `${left}px`);
            companion.style.setProperty('--lav-actor-top', `${top}px`);
            companion.style.setProperty('--lav-actor-size', `${size}px`);
            companion.style.setProperty('--lav-hit-left', `${clamp(cx - hit * .5, 4, w - hit - 4)}px`);
            companion.style.setProperty('--lav-hit-top', `${clamp(cy - hit * .48, 60, h - hit - 4)}px`);
            companion.style.setProperty('--lav-hit-size', `${hit}px`);
            companion.style.setProperty('--lav-speech-left', `${clamp(cx + hit * .38, 12, w - 352)}px`);
            companion.style.setProperty('--lav-speech-top', `${clamp(cy - hit * .50, 78, h - 250)}px`);
        }
    }
    resolveStoryboardShape(tRaw, direction) {
        const t = clamp(tRaw), flip = direction < 0;
        const frames = [
            { at: 0, eyeSocketColor: '#5420b2', eyeTintColor: '#c58cff', eyeLight: 1, eyeSocketWidth: 16, eyeTint: 0, eyeCoreScaleX: 1, eyeCoreScaleY: 1, outerGlowStrength: 0, body: POS_FRONT_BODY, highlight: C11_FRONT_HIGHLIGHT, highlightAlpha: .32, shadow: C11_FRONT_SHADOW, shadowAlpha: .15, materialRadiusScale: 1, materialCenter: .96, materialMid: .52, depthGrade: .12, eyes: [POS_FRONT_EYES.left, POS_FRONT_EYES.right], material: C11_FRONT_MATERIAL, profile: 0, seam: 1, petal: .72, rim: 0, posBlend: 1, posMatrix: POS_IDENTITY_MATRIX, seamPts: POS_FRONT_SEAM, petalPts: POS_FRONT_PETAL },
            { at: .10, eyeSocketColor: '#8040ff', eyeTintColor: '#c58cff', eyeLight: 1, eyeSocketWidth: 32, eyeTint: .15, eyeCoreScaleX: .967, eyeCoreScaleY: 1, outerGlowStrength: 1.52, body: POS_TAKEOFF_BODY, highlight: C11_TAKEOFF_HIGHLIGHT, highlightAlpha: .48, shadow: C11_TAKEOFF_SHADOW, shadowAlpha: 0, materialRadiusScale: 1.2, materialCenter: .96, materialMid: .52, depthGrade: .02, eyes: [POS_TAKEOFF_EYES.left, POS_TAKEOFF_EYES.right], material: C11_TAKEOFF_MATERIAL, profile: .18, seam: .94, petal: .68, rim: .08, posBlend: .88, posMatrix: POS_TAKEOFF_MATRIX, seamPts: POS_FRONT_SEAM, petalPts: POS_FRONT_PETAL },
            { at: .22, eyeSocketColor: '#5420b2', eyeTintColor: '#c58cff', eyeLight: 1, eyeSocketWidth: 7.2, eyeTint: 0, eyeCoreScaleX: 1, eyeCoreScaleY: 1, outerGlowStrength: .20, body: POS_ANTICIPATION_BODY, highlight: C11_ANTICIPATION_HIGHLIGHT, highlightAlpha: .40, shadow: C11_ANTICIPATION_SHADOW, shadowAlpha: .18, materialRadiusScale: 1.2, materialCenter: .96, materialMid: .52, depthGrade: .18, eyes: [POS_ANTICIPATION_EYES.left, POS_ANTICIPATION_EYES.right], material: C11_ANTICIPATION_MATERIAL, profile: .52, seam: .86, petal: .72, rim: .18, posBlend: .50, posMatrix: POS_ANTICIPATION_MATRIX, seamPts: POS_FRONT_SEAM, petalPts: POS_FRONT_PETAL },
            { at: .34, eyeSocketColor: '#5420b2', eyeTintColor: '#c58cff', eyeLight: .92, eyeSocketWidth: 24, eyeTint: .30, eyeCoreScaleX: .917, eyeCoreScaleY: .90, outerGlowStrength: 1.10, body: WEB_PROFILE_ACCEL_BODY, highlight: C11_PROFILE_ACCEL_HIGHLIGHT, highlightAlpha: .74, shadow: C11_PROFILE_ACCEL_SHADOW, shadowAlpha: .95, materialRadiusScale: 1.6, materialCenter: .96, materialMid: .52, depthGrade: .40, eyes: [WEB_PROFILE_ACCEL_EYE], material: C11_PROFILE_ACCEL_MATERIAL, profile: 1, seam: .24, posBlend: 0, posMatrix: POS_IDENTITY_MATRIX, petal: .30, rim: 1, oneEye: true, seamPts: C11_PROFILE_ACCEL_RIM, petalPts: C11_PROFILE_ACCEL_HIGHLIGHT, rimPts: C11_PROFILE_ACCEL_RIM, underRimPts: C11_PROFILE_ACCEL_UNDER_RIM, underRimAlpha: 1 },
            { at: .48, eyeSocketColor: '#5420b2', eyeTintColor: '#7f20ff', eyeLight: .36, eyeSocketWidth: 24, eyeTint: 1, eyeCoreScaleX: .86, eyeCoreScaleY: .90, outerGlowStrength: 1.45, body: WEB_ARC_BODY, highlight: C11_ARC_HIGHLIGHT, highlightAlpha: .54, shadow: C11_ARC_SHADOW, shadowAlpha: .18, materialRadiusScale: 1.6, materialCenter: .80, materialMid: .38, depthGrade: .38, eyes: [WEB_ARC_EYE], material: C11_ARC_MATERIAL, profile: 1, seam: .20, posBlend: 0, posMatrix: POS_IDENTITY_MATRIX, petal: .26, rim: 1, oneEye: true, seamPts: C11_ARC_RIM, petalPts: C11_ARC_HIGHLIGHT, rimPts: C11_ARC_RIM, underRimPts: C11_ARC_UNDER_RIM, underRimAlpha: 1 },
            { at: .62, eyeSocketColor: '#5420b2', eyeTintColor: '#7f20ff', eyeLight: .38, eyeSocketWidth: 24, eyeTint: 1, eyeCoreScaleX: .70, eyeCoreScaleY: .86, outerGlowStrength: 1.65, body: WEB_HERO_APPROACH_BODY, highlight: C11_HERO_APPROACH_HIGHLIGHT, highlightAlpha: .58, shadow: C11_HERO_APPROACH_SHADOW, shadowAlpha: .10, materialRadiusScale: 1.6, materialCenter: .82, materialMid: .40, depthGrade: .28, eyes: [WEB_HERO_APPROACH_EYE], material: C11_HERO_APPROACH_MATERIAL, profile: .96, seam: .16, posBlend: 0, posMatrix: POS_IDENTITY_MATRIX, petal: .22, rim: .94, oneEye: true, seamPts: C11_HERO_APPROACH_RIM, petalPts: C11_HERO_APPROACH_HIGHLIGHT, rimPts: C11_HERO_APPROACH_RIM, underRimPts: C11_HERO_APPROACH_UNDER_RIM, underRimAlpha: .94 },
            { at: .76, eyeSocketColor: '#8040ff', eyeTintColor: '#c58cff', eyeLight: 1, eyeSocketWidth: 24, eyeTint: .15, eyeCoreScaleX: 1, eyeCoreScaleY: 1, outerGlowStrength: 1.57, body: POS_BRAKE_BODY, highlight: C11_BRAKE_HIGHLIGHT, highlightAlpha: .48, shadow: C11_BRAKE_SHADOW, shadowAlpha: 0, materialRadiusScale: 1, materialCenter: .96, materialMid: .52, depthGrade: .02, eyes: [POS_BRAKE_EYES.left, POS_BRAKE_EYES.right], material: C11_BRAKE_MATERIAL, profile: .30, seam: .78, petal: .60, rim: .28, posBlend: .45, posMatrix: POS_BRAKE_MATRIX, seamPts: POS_BRAKE_SEAM, petalPts: POS_BRAKE_PETAL },
            { at: .84, eyeSocketColor: '#8040ff', eyeTintColor: '#c58cff', eyeLight: 1, eyeSocketWidth: 28, eyeTint: 0, eyeCoreScaleX: 1, eyeCoreScaleY: 1, outerGlowStrength: 1.52, body: POS_LAND_BODY, highlight: C11_LAND_HIGHLIGHT, highlightAlpha: .50, shadow: C11_LAND_SHADOW, shadowAlpha: 0, materialRadiusScale: 1.2, materialCenter: .96, materialMid: .52, depthGrade: .02, eyes: [POS_LAND_EYES.left, POS_LAND_EYES.right], material: C11_LAND_MATERIAL, profile: .12, seam: .94, petal: .70, rim: .10, posBlend: .82, posMatrix: POS_LAND_MATRIX, seamPts: POS_LAND_SEAM, petalPts: POS_LAND_PETAL },
            { at: .90, eyeSocketColor: '#711eff', eyeTintColor: '#c58cff', eyeLight: 1, eyeSocketWidth: 28, eyeTint: 0, eyeCoreScaleX: 1, eyeCoreScaleY: 1, outerGlowStrength: 2.50, body: POS_SQUASH_BODY, highlight: C11_SQUASH_HIGHLIGHT, highlightAlpha: .58, shadow: C11_SQUASH_SHADOW, shadowAlpha: 0, materialRadiusScale: 1.6, materialCenter: .96, materialMid: .52, depthGrade: 0, eyes: [POS_SQUASH_EYES.left, POS_SQUASH_EYES.right], material: C11_SQUASH_MATERIAL, profile: .08, seam: .95, petal: .70, rim: .06, posBlend: .90, posMatrix: POS_SQUASH_MATRIX, seamPts: POS_SQUASH_SEAM, petalPts: POS_SQUASH_PETAL },
            { at: .95, eyeSocketColor: '#8040ff', eyeTintColor: '#c58cff', eyeLight: 1, eyeSocketWidth: 28, eyeTint: .10, eyeCoreScaleX: 1, eyeCoreScaleY: 1, outerGlowStrength: 1.53, body: POS_BOUNCE_BODY, highlight: C11_BOUNCE_HIGHLIGHT, highlightAlpha: .46, shadow: C11_BOUNCE_SHADOW, shadowAlpha: 0, materialRadiusScale: 1.0, materialCenter: .96, materialMid: .52, depthGrade: .02, eyes: [POS_BOUNCE_EYES.left, POS_BOUNCE_EYES.right], material: C11_BOUNCE_MATERIAL, profile: .04, seam: .98, petal: .72, rim: .03, posBlend: .94, posMatrix: POS_BOUNCE_MATRIX, seamPts: POS_BOUNCE_SEAM, petalPts: POS_BOUNCE_PETAL },
            { at: 1, eyeSocketColor: '#8040ff', eyeTintColor: '#c58cff', eyeLight: 1, eyeSocketWidth: 28, eyeTint: 0, eyeCoreScaleX: .971, eyeCoreScaleY: .971, outerGlowStrength: 1.03, body: POS_SETTLE_BODY, highlight: C11_SETTLE_HIGHLIGHT, highlightAlpha: .44, shadow: C11_SETTLE_SHADOW, shadowAlpha: 0, materialRadiusScale: 1.2, materialCenter: .96, materialMid: .52, depthGrade: .03, eyes: [POS_SETTLE_EYES.left, POS_SETTLE_EYES.right], material: C11_SETTLE_MATERIAL, profile: 0, seam: 1, petal: .72, rim: 0, posBlend: 1, posMatrix: POS_SETTLE_MATRIX, seamPts: POS_SETTLE_SEAM, petalPts: POS_SETTLE_PETAL },
        ];
        let a = frames[0], b = frames[frames.length - 1];
        for (let i = 0; i < frames.length - 1; i++) {
            if (t >= frames[i].at && t <= frames[i + 1].at) {
                a = frames[i];
                b = frames[i + 1];
                break;
            }
        }
        const span = Math.max(.0001, b.at - a.at), u = smooth((t - a.at) / span), mirror = (p, open = false) => flip ? (open ? mirrorOpen(p) : mirrorClosed(p)) : pts(p), blend = (x, y) => mixPoints(mirror(x), mirror(y), u);
        const bodyP = blend(a.body, b.body), material = mixMaterial(a.material, b.material, u, flip), highlight = mixPoints(mirror(a.highlight), mirror(b.highlight), u), highlightAlpha = lerp(a.highlightAlpha, b.highlightAlpha, u), shadow = mixPoints(mirror(a.shadow), mirror(b.shadow), u), shadowAlpha = lerp(a.shadowAlpha, b.shadowAlpha, u), materialRadiusScale = lerp(a.materialRadiusScale, b.materialRadiusScale, u), materialCenter = lerp(a.materialCenter, b.materialCenter, u), materialMid = lerp(a.materialMid, b.materialMid, u), profile = lerp(a.profile, b.profile, u), depthGrade = lerp(a.depthGrade, b.depthGrade, u), outerGlowStrength = lerp(a.outerGlowStrength, b.outerGlowStrength, u), seamAlpha = lerp(a.seam, b.seam, u), petalAlpha = lerp(a.petal, b.petal, u), rimAlpha = lerp(a.rim, b.rim, u), eyeLight = lerp(a.eyeLight, b.eyeLight, u), eyeSocketWidth = lerp(a.eyeSocketWidth, b.eyeSocketWidth, u), eyeSocketColor = mixHex(a.eyeSocketColor, b.eyeSocketColor, u), eyeTint = lerp(a.eyeTint, b.eyeTint, u), eyeTintColor = mixHex(a.eyeTintColor, b.eyeTintColor, u), eyeCoreScaleX = lerp(a.eyeCoreScaleX, b.eyeCoreScaleX, u), eyeCoreScaleY = lerp(a.eyeCoreScaleY, b.eyeCoreScaleY, u), posBlend = lerp(a.posBlend, b.posBlend, u), posMatrix = mixTuple(a.posMatrix, b.posMatrix, u);
        const fallbackSeam = (f) => f.profile > .74 ? C11_ANTICIPATION_SEAM : C11_FRONT_SEAM;
        const fallbackPetal = (f) => f.profile > .74 ? C11_ANTICIPATION_PETAL : C11_FRONT_PETAL;
        const seamA = a.seamPts ?? fallbackSeam(a), seamB = b.seamPts ?? fallbackSeam(b), petalA = a.petalPts ?? fallbackPetal(a), petalB = b.petalPts ?? fallbackPetal(b);
        const seamP = mixPoints(mirror(seamA, true), mirror(seamB, true), u);
        const petalP = mixPoints(mirror(petalA), mirror(petalB), u);
        const rimA = a.rimPts ?? C11_PROFILE_RIM, rimB = b.rimPts ?? C11_PROFILE_RIM;
        const rimP = mixPoints(mirror(rimA, true), mirror(rimB, true), u);
        const underA = a.underRimPts ?? b.underRimPts ?? C11_PROFILE_UNDER_RIM, underB = b.underRimPts ?? a.underRimPts ?? C11_PROFILE_UNDER_RIM, underRim = mixPoints(mirror(underA, true), mirror(underB, true), u), underRimAlpha = lerp(a.underRimAlpha ?? 0, b.underRimAlpha ?? 0, u);
        // WIP35.4 eye ownership contract (user-validated against the real mascot):
        // after orientation/mirroring, the WIP35.3 ownership was reversed in BOTH turn directions.
        // Slot 0 is the eye that survives into the profile master; slot 1 is the eye that retreats
        // toward its own edge and becomes occluded. Keep identity assignment after orientation so
        // the mirrored turn remains a true chirality mirror instead of reusing screen-side labels.
        const survivor = (f) => mirror(f.eyes[0]);
        const occluded = (f) => f.oneEye ? survivor(f) : mirror(f.eyes[1]);
        const aOne = Boolean(a.oneEye), bOne = Boolean(b.oneEye);
        let survivorEye, occludedEye, survivorVisibility = 1, occludedVisibility = lerp(aOne ? 0 : 1, bOne ? 0 : 1, u);
        // A profile eye never morphs through the cheek into a frontal eye. During the approved
        // approach -> brake turn it becomes occluded, then the two frontal sockets reappear.
        if (!aOne && bOne) {
            // Two-eye -> profile: NEVER make both sockets travel toward the profile position together.
            // The occluded eye retreats at its own edge and is almost gone before the survivor starts
            // migrating to the one-eye master. This prevents the 'eyes colliding' artifact at 65–75deg.
            const farFade = smooth(clamp(u / .48)), retreatT = smooth(clamp(u / .46)), survivorT = smooth(clamp((u - .44) / .56));
            survivorEye = mixPoints(survivor(a), survivor(b), survivorT);
            occludedEye = retreatEyeAtOwnEdge(occluded(a), retreatT);
            survivorVisibility = 1;
            occludedVisibility = 1 - farFade;
        }
        else if (aOne && !bOne) {
            if (u < .25) {
                survivorEye = survivor(a);
                occludedEye = occluded(b);
                survivorVisibility = 1 - smooth(u / .25);
                occludedVisibility = 0;
            }
            else if (u < .60) {
                survivorEye = survivor(a);
                occludedEye = occluded(b);
                survivorVisibility = 0;
                occludedVisibility = 0;
            }
            else {
                const reveal = smooth((u - .60) / .40);
                survivorEye = survivor(b);
                occludedEye = occluded(b);
                survivorVisibility = reveal;
                occludedVisibility = reveal;
            }
        }
        else {
            survivorEye = mixPoints(survivor(a), survivor(b), u);
            occludedEye = mixPoints(occluded(a), occluded(b), u);
        }
        let l, r, leftAlpha = survivorVisibility, rightAlpha = occludedVisibility;
        l = survivorEye;
        r = occludedEye;
        return { body: bodyP, left: l, right: r, leftAlpha, rightAlpha, seam: seamP, seamAlpha, petal: petalP, petalAlpha, rim: rimP, rimAlpha, underRim, underRimAlpha, highlight, highlightAlpha, shadow, shadowAlpha, material, materialRadiusScale, materialCenter, materialMid, profile, depthGrade, outerGlowStrength, side: direction, eyeLight, eyeSocketWidth, eyeSocketColor, eyeTint, eyeTintColor, eyeCoreScaleX, eyeCoreScaleY, posBlend, posMatrix };
    }
    resolveStoryboardOrnaments(tRaw, direction) { const t = clamp(tRaw); let a = C11_ORNAMENT_KEYFRAMES[0], b = C11_ORNAMENT_KEYFRAMES[C11_ORNAMENT_KEYFRAMES.length - 1]; for (let i = 0; i < C11_ORNAMENT_KEYFRAMES.length - 1; i++) {
        if (t >= C11_ORNAMENT_KEYFRAMES[i].at && t <= C11_ORNAMENT_KEYFRAMES[i + 1].at) {
            a = C11_ORNAMENT_KEYFRAMES[i];
            b = C11_ORNAMENT_KEYFRAMES[i + 1];
            break;
        }
    } const u = smooth((t - a.at) / Math.max(.0001, b.at - a.at)), mixO = mixTuple(a.orbit, b.orbit, u), mixC = mixTuple(a.crescent, b.crescent, u), orbit = (direction > 0 ? mixO : [1000 - mixO[0], mixO[1], mixO[2], mixO[3], mirrorAngle(mixO[4]), mixO[5]]), crescent = (direction > 0 ? mixC : [1000 - mixC[0], mixC[1], mixC[2], -mixC[3], mixC[4]]); const stars = []; for (let i = 0; i < 3; i++) {
        const sa = a.stars[i] ?? [500, 500, 0, 0, 0], sb = b.stars[i] ?? sa, m = mixTuple(sa, sb, u);
        stars.push((direction > 0 ? m : [1000 - m[0], m[1], m[2], -m[3], m[4]]));
    } const sparkle = (q, fade) => direction > 0 ? [q[0], q[1], q[2], q[3] * fade] : [1000 - q[0], q[1], q[2], q[3] * fade]; const sparkles = []; for (const q of a.sparkles.slice(0, 6))
        sparkles.push(sparkle(q, 1 - u)); for (const q of b.sparkles.slice(0, 6))
        sparkles.push(sparkle(q, u)); const trails = []; for (let i = 0; i < 4; i++) {
        const ta = a.trails[i] ?? [], tb = b.trails[i] ?? ta, p = mixTrail(ta, tb, u);
        trails.push(direction > 0 ? p : mirrorTrail(p));
    } const bm = mixTuple(a.beam, b.beam, u), beam = (direction > 0 ? bm : [1000 - bm[0], bm[1], 1000 - bm[2], bm[3], bm[4], bm[5]]); return { orbit, crescent, stars, sparkles, trails, trailOpacity: lerp(a.trailOpacity, b.trailOpacity, u), trailWidthScale: lerp(a.trailWidthScale, b.trailWidthScale, u), trailIntensityScale: lerp(a.trailIntensityScale, b.trailIntensityScale, u), beam }; }
    resolveStoryboardTrails(tRaw, direction) { const t = clamp(tRaw); let a = C11_TRAIL_KEYFRAMES[0], b = C11_TRAIL_KEYFRAMES[C11_TRAIL_KEYFRAMES.length - 1]; for (let i = 0; i < C11_TRAIL_KEYFRAMES.length - 1; i++) {
        if (t >= C11_TRAIL_KEYFRAMES[i].at && t <= C11_TRAIL_KEYFRAMES[i + 1].at) {
            a = C11_TRAIL_KEYFRAMES[i];
            b = C11_TRAIL_KEYFRAMES[i + 1];
            break;
        }
    } const u = smooth((t - a.at) / Math.max(.0001, b.at - a.at)), orient = (q) => direction > 0 ? q : mirrorTrail(q); if (a.paths.length && b.paths.length) {
        const paths = [];
        for (let i = 0; i < Math.max(a.paths.length, b.paths.length); i++) {
            const pa = a.paths[i] ?? a.paths[a.paths.length - 1], pb = b.paths[i] ?? b.paths[b.paths.length - 1];
            paths.push(orient(mixTrail(pa, pb, u)));
        }
        return { paths, opacity: lerp(a.opacity, b.opacity, u) };
    } if (a.paths.length)
        return { paths: a.paths.map(orient), opacity: a.opacity * (1 - u) }; if (b.paths.length)
        return { paths: b.paths.map(orient), opacity: b.opacity * u }; return { paths: [], opacity: 0 }; }
    resolveShape() {
        // WIP38 contract retained: storyboardMotion is WORLD MOTION/VFX authority only.
        // WIP40 pure-anatomy turn rig: yaw may reveal a validated profile, but motion silhouettes are
        // forbidden as orientation masters. Lavender remains the same character while turning.
        const side = (this.yaw >= 0 ? 1 : -1), u = clamp(Math.abs(this.yaw) / (Math.PI / 2)), mirror = (p, open = false) => side < 0 ? (open ? mirrorOpen(p) : mirrorClosed(p)) : pts(p);
        const profileT = smooth(clamp((u - .46) / .54)), farFade = smooth(clamp((u - .66) / .14)), survivorT = smooth(clamp((u - .62) / .38)), retreatT = smooth(clamp((u - .58) / .22));
        const frontBody = mirror(POS_FRONT_BODY), profileBody = mirror(WEB_PROFILE_BODY), bodyP = mixPoints(frontBody, profileBody, profileT);
        const frontLeft = mirror(POS_FRONT_EYES.left), frontRight = mirror(POS_FRONT_EYES.right), profileEye = mirror(WEB_PROFILE_EYE);
        const survivor = mixPoints(frontLeft, profileEye, survivorT), occluded = retreatEyeAtOwnEdge(frontRight, retreatT);
        const seamP = mixPoints(mirror(POS_FRONT_SEAM, true), mirror(C11_PROFILE_RIM, true), profileT), petalP = mixPoints(mirror(POS_FRONT_PETAL), mirror(C11_PROFILE_HIGHLIGHT), profileT);
        const material = mixMaterial(C11_FRONT_MATERIAL, C11_PROFILE_MATERIAL, profileT, side < 0), highlight = mixPoints(mirror(C11_FRONT_HIGHLIGHT), mirror(C11_PROFILE_HIGHLIGHT), profileT), rimP = mirror(C11_PROFILE_RIM, true), underRim = mirror(C11_PROFILE_UNDER_RIM, true);
        const posBlend = 1 - profileT;
        return { body: bodyP, left: survivor, right: occluded, leftAlpha: 1, rightAlpha: 1 - farFade, seam: seamP, seamAlpha: lerp(1, .26, profileT), petal: petalP, petalAlpha: lerp(.72, .34, profileT), rim: rimP, rimAlpha: profileT, underRim, underRimAlpha: profileT, highlight, highlightAlpha: lerp(.30, .66, profileT), shadow: mirror(C11_PROFILE_ACCEL_SHADOW), shadowAlpha: lerp(0, .32, profileT), material, materialRadiusScale: lerp(1, 1.45, profileT), materialCenter: lerp(.96, .90, profileT), materialMid: lerp(.52, .46, profileT), profile: u, depthGrade: 0, outerGlowStrength: profileT * 1.20, side, eyeLight: 1, eyeSocketWidth: lerp(12, 20, profileT), eyeSocketColor: profileT < .5 ? '#7150da' : '#5420b2', eyeTint: lerp(0, .22, profileT), eyeTintColor: '#c58cff', eyeCoreScaleX: 1, eyeCoreScaleY: 1, posBlend, posMatrix: POS_IDENTITY_MATRIX };
    }
    resolveCachedShape() { const mode = `identity-yaw:${this.yaw >= 0 ? 1 : -1}`, driver = this.yaw, dirty = !this.cachedShape || !this.cachedShapePaths || this.lastShapeMode !== mode || !Number.isFinite(this.lastShapeDriver) || Math.abs(driver - this.lastShapeDriver) > .00035; if (dirty) {
        const shape = this.resolveShape(), paths = { bodyD: closedPath(shape.body), petalD: closedPath(shape.petal), seamD: openPath(shape.seam), rimD: openPath(shape.rim), underRimD: openPath(shape.underRim), highlightD: closedPath(shape.highlight), shadowD: closedPath(shape.shadow), leftD: closedPath(shape.left), rightD: closedPath(shape.right), leftCenter: centroid(shape.left), rightCenter: centroid(shape.right) };
        this.cachedShape = shape;
        this.cachedShapePaths = paths;
        this.lastShapeMode = mode;
        this.lastShapeDriver = driver;
        return { shape, paths, dirty: true };
    } return { shape: this.cachedShape, paths: this.cachedShapePaths, dirty: false }; }
    tick = (now) => { if (this.destroyed)
        return; const frameBudget = 1000 / Math.max(1, this.performance.maxFps); if (this.lastRenderedAt && now - this.lastRenderedAt < frameBudget * .90) {
        this.raf = requestAnimationFrame(this.tick);
        return;
    } const dt = Math.min(.05, Math.max(.001, (now - (this._lastTick ?? now - frameBudget)) / 1000)); this._lastTick = now; this.lastRenderedAt = now; if (this.reduced) {
        this.gazeX = this.targetGazeX;
        this.gazeY = this.targetGazeY;
        this.yaw = this.targetYaw;
        this.travel = { ...this.targetTravel };
    }
    else {
        const grieving = this.cinematicPerformance && this.state === 'lament';
        const g = 1 - Math.exp(-dt * (grieving ? 4.8 : this.cinematicPerformance ? 12 : 11));
        this.gazeX += (this.targetGazeX - this.gazeX) * g;
        this.gazeY += (this.targetGazeY - this.gazeY) * g;
        if (this.cinematicPerformance) {
            const targetHeadTurn = clamp((grieving ? this.gazeX : this.targetGazeX) * .125, -.125, .125);
            this.headTurnVelocity += (targetHeadTurn - this.headTurn) * 46 * dt;
            this.headTurnVelocity *= Math.exp(-10.8 * dt);
            this.headTurn = clamp(this.headTurn + this.headTurnVelocity * dt, -.14, .14);
        } else {
            this.headTurnVelocity = 0;
        }
        const delta = shortestYawDelta(this.yaw, this.targetYaw);
        this.yawVelocity += delta * (this.cinematicLock ? 17 : 21) * dt;
        this.yawVelocity *= Math.exp(-(this.cinematicLock ? 6.5 : 7.8) * dt);
        this.yaw = clamp(this.yaw + this.yawVelocity * dt, -Math.PI / 2, Math.PI / 2);
        const f = 1 - Math.exp(-dt * 11);
        for (const k of Object.keys(this.travel))
            this.travel[k] += (this.targetTravel[k] - this.travel[k]) * f;
    } this.render(now); this.raf = requestAnimationFrame(this.tick); };
    render(now) {
        if (!this.svg)
            return;
        const seconds = (now - this.started) / 1000, stateAge = (now - this.stateStarted) / 1000;
        let target = samplePose({ state: this.state, seconds, stateAge, gazeX: this.gazeX, gazeY: this.gazeY, reducedMotion: this.reduced, pressed: this.pressed, headTurn: this.headTurn });
        if (this.cinematicLock && !this.cinematicPerformance) {
            target = { ...target, leftEyeOpen: 1, rightEyeOpen: 1, gazeX: this.gazeX, gazeY: this.gazeY };
        }
        const tr = clamp((now - this.transitionStarted) / 260);
        this.lastPose = lerpPose(this.transitionFrom, target, smooth(tr));
        const p = this.lastPose, cached = this.resolveCachedShape(), storyboardLocked = this.storyboardMotion !== null, closeUp = this.cinematicLock && this.cinematicEyeIsolation !== null;
        let shape = cached.shape, shapePaths = cached.paths, shapeDirty = cached.dirty;
        const posMorph = storyboardLocked || this.cinematicLock ? 0 : morphInfluence(p);
        if (posMorph > .001 && shape.posBlend > .001) {
            const orientClosed = (q) => shape.side > 0 ? pts(q) : mirrorClosed(q), orientOpen = (q) => shape.side > 0 ? pts(q) : mirrorOpen(q), morphBody = orientClosed(applyPosAffine(c18(materialMorphPoints(p, seconds)), shape.posMatrix)), neutralEyePose = { ...p, gazeX: 0, gazeY: 0, leftEyeScaleX: 1, rightEyeScaleX: 1, leftEyeRotation: 0, rightEyeRotation: 0, leftEyeDx: 0, leftEyeDy: 0, rightEyeDx: 0, rightEyeDy: 0 }, morphLeft = orientClosed(applyPosAffine(c18(resampleClosed(morphEyePoints(neutralEyePose, 'left', false, seconds, this.reduced), 64)), shape.posMatrix)), morphRight = orientClosed(applyPosAffine(c18(resampleClosed(morphEyePoints(neutralEyePose, 'right', false, seconds, this.reduced), 64)), shape.posMatrix)), morphSeam = orientOpen(applyPosAffine(c18(resampleOpen(morphRidgePoints(p), shape.seam.length)), shape.posMatrix)), authority = clamp(shape.posBlend);
            shape = { ...shape, body: mixPoints(shape.body, morphBody, authority), left: mixPoints(shape.left, morphLeft, authority), right: mixPoints(shape.right, morphRight, authority), seam: mixPoints(shape.seam, morphSeam, authority), petalAlpha: shape.petalAlpha * (1 - posMorph), seamAlpha: shape.seamAlpha * (1 - posMorph * .72) };
            shapePaths = { bodyD: closedPath(shape.body), petalD: closedPath(shape.petal), seamD: openPath(shape.seam), rimD: openPath(shape.rim), underRimD: openPath(shape.underRim), highlightD: closedPath(shape.highlight), shadowD: closedPath(shape.shadow), leftD: closedPath(shape.left), rightD: closedPath(shape.right), leftCenter: centroid(shape.left), rightCenter: centroid(shape.right) };
            shapeDirty = true;
        }
        let left = shape.left, right = shape.right;
        const expressiveEyes = this.cinematicPerformance && !storyboardLocked;
        if (closeUp && !expressiveEyes) {
            left = pts(POS_FRONT_EYES.left);
            right = pts(POS_FRONT_EYES.right);
        } else if (expressiveEyes) {
            const orient = (q) => shape.side > 0 ? pts(q) : mirrorClosed(q);
            left = orient(applyPosAffine(c18(morphEyePoints(p, 'left', false, seconds, this.reduced)), shape.posMatrix));
            right = orient(applyPosAffine(c18(morphEyePoints(p, 'right', false, seconds, this.reduced)), shape.posMatrix));
        }
        const expressiveContour = this.cinematicPerformance && this.state === 'lament' && !storyboardLocked;
        const framePaths = expressiveContour ? {
            bodyD: closedPath(deformCinematicContour(shape.body, p)),
            petalD: closedPath(deformCinematicContour(shape.petal, p)),
            seamD: openPath(deformCinematicContour(shape.seam, p)),
            rimD: openPath(deformCinematicContour(shape.rim, p)),
            underRimD: openPath(deformCinematicContour(shape.underRim, p)),
            highlightD: closedPath(deformCinematicContour(shape.highlight, p)),
            shadowD: closedPath(deformCinematicContour(shape.shadow, p)),
        } : shapePaths;
        const bd = framePaths.bodyD, pd = framePaths.petalD, sd = framePaths.seamD, rd = framePaths.rimD, urd = framePaths.underRimD, hd = framePaths.highlightD, shd = framePaths.shadowD;
        const materialMode = `yaw:${shape.side}`, materialDriver = this.yaw, materialStep = this.quality === 'optimized' ? .050 : .024, materialDirty = this.lastMaterialMode !== materialMode || !Number.isFinite(this.lastMaterialDriver) || Math.abs(materialDriver - this.lastMaterialDriver) > materialStep;
        if (materialDirty) {
            this.lastMaterialMode = materialMode;
            this.lastMaterialDriver = materialDriver;
            this.svg.style.setProperty('--lav-mat-center', String(shape.materialCenter));
            this.svg.style.setProperty('--lav-mat-mid', String(shape.materialMid));
            this.materialBlobs.forEach((c, i) => { const m = shape.material[i]; if (!m)
                return; const g = this.materialGradients[i]; c.setAttribute('cx', String(m[0])); c.setAttribute('cy', String(m[1])); const mr = m[2] * shape.materialRadiusScale; c.setAttribute('r', String(mr)); if (g) {
                g.setAttribute('cx', String(m[0]));
                g.setAttribute('cy', String(m[1]));
                g.setAttribute('r', String(mr));
            } const col = `rgb(${m[3]} ${m[4]} ${m[5]})`; this.materialStops[i * 2]?.setAttribute('stop-color', col); this.materialStops[i * 2 + 1]?.setAttribute('stop-color', col); });
        }
        if (shapeDirty || expressiveContour) {
            for (const e of [this.bodyOuterGlowA, this.bodyOuterGlowB, this.bodyOuterGlowC, this.bodyGlow, this.bodyRimGlow, this.bodyPath, this.morphTint, this.bodyProfileTone, this.bodyHighlight, this.bodyMidGlow, this.bodyShadow, this.bodyEdge])
                e.setAttribute('d', bd);
            this.bodyOuterGlowA.setAttribute('opacity', String(clamp(shape.outerGlowStrength)));
            this.bodyOuterGlowB.setAttribute('opacity', String(clamp(shape.outerGlowStrength - 1)));
            const outerC = clamp(shape.outerGlowStrength - 2);
            this.bodyOuterGlowC.setAttribute('opacity', String(outerC));
            this.bodyOuterGlowC.style.display = outerC > .001 ? '' : 'none';
            this.bodyClipPath.setAttribute('d', bd);
            const pm = shape.posMatrix, bodyMaterialMatrix = shape.side > 0 ? pm : [-pm[0], pm[1], -pm[2], pm[3], 1000 - pm[4], pm[5]];
            this.posBodyImage.setAttribute('transform', `matrix(${bodyMaterialMatrix.join(' ')})`);
            this.referenceShadow.setAttribute('d', shd);
            this.referenceShadow.setAttribute('opacity', String(clamp(shape.shadowAlpha * (1 - shape.posBlend))));
            this.referenceHighlight.setAttribute('d', hd);
            this.referenceHighlight.setAttribute('opacity', String(clamp(shape.highlightAlpha * (1 - shape.posBlend))));
            this.petal.setAttribute('d', pd);
            this.seam.setAttribute('d', sd);
            this.rim.setAttribute('d', rd);
            this.underRim.setAttribute('d', urd);
        }
        const bodyAlpha = this.cinematicLock ? this.bodyReveal : 1, posBlend = clamp(shape.posBlend), webBlend = 1 - posBlend, morphVisual = clamp(posMorph * posBlend);
        this.bodyGroup.setAttribute('opacity', String(clamp(bodyAlpha)));
        this.posBodyImage.setAttribute('opacity', String(clamp(posBlend * (1 - morphVisual) * bodyAlpha)));
        this.morphTint.setAttribute('fill', mixHex('#7d48ed', color(p.accentColor), .82));
        this.morphTint.setAttribute('opacity', String(clamp(morphVisual * .78 * bodyAlpha)));
        this.materialCloud.setAttribute('opacity', String(clamp(.98 * webBlend)));
        this.petal.setAttribute('opacity', String(clamp(shape.petalAlpha * bodyAlpha * .72 * webBlend)));
        this.seam.setAttribute('opacity', String(clamp(shape.seamAlpha * bodyAlpha * .82 * webBlend)));
        this.rim.setAttribute('opacity', String(clamp(shape.rimAlpha * bodyAlpha * .82)));
        this.underRim.setAttribute('opacity', String(clamp(shape.underRimAlpha * bodyAlpha * .72)));
        // Keep the approved silhouette as authority. Lament breathing affects only the body contour;
        // the registered eyes follow a small fraction of that expansion to stay seated in the face.
        const cinematicStatic = this.cinematicLock && !this.cinematicPerformance && !storyboardLocked, breathing = this.cinematicPerformance && this.state === 'lament', bodyScaleX = breathing ? clamp(p.bodyScaleX, .982, 1.018) : 1, bodyScaleY = breathing ? clamp(p.bodyScaleY, .976, 1.020) : 1, eyeScaleX = 1 + (bodyScaleX - 1) * .28, eyeScaleY = 1 + (bodyScaleY - 1) * .32, roll = storyboardLocked || cinematicStatic ? 0 : clamp(p.bodyRotation + this.travel.roll + (this.cinematicPerformance ? this.headTurn * .14 : 0), -.060, .060), dx = storyboardLocked || cinematicStatic ? 0 : clamp((p.bodyDx + this.gazeX * .002) * 1000, -7, 7), dy = storyboardLocked || cinematicStatic ? 0 : clamp((p.bodyDy - this.travel.lift * .055) * 1000, -11, 11);
        const bodyTransform = `translate(${500 + dx} ${515 + dy}) rotate(${roll * 57.2958}) scale(${bodyScaleX} ${bodyScaleY}) translate(-500 -515)`;
        const faceTransform = `translate(${500 + dx} ${515 + dy}) rotate(${roll * 57.2958}) scale(${eyeScaleX} ${eyeScaleY}) translate(-500 -515)`;
        this.bodyGroup.setAttribute('transform', bodyTransform);
        this.eyeRoot.setAttribute('transform', faceTransform);
        const cinematicPoseLock = this.cinematicLock && !this.cinematicPerformance, revealEyes = this.cinematicLock ? this.cinematicEyeReveal : 1;
        const leftOpen = clamp((cinematicPoseLock ? this.cinematicLeft : p.leftEyeOpen) * shape.leftAlpha * revealEyes), rightOpen = clamp((cinematicPoseLock ? this.cinematicRight : p.rightEyeOpen) * shape.rightAlpha * revealEyes);
        const facePose = this.cinematicPerformance && !storyboardLocked ? [p.gazeX, p.gazeY, p.bodyTurn, p.bodyBend, p.bodyPuff, p.leftEyeScaleX, p.rightEyeScaleX, p.leftEyeRotation, p.rightEyeRotation, p.leftEyeSmile, p.rightEyeSmile, p.leftEyeDx, p.leftEyeDy, p.rightEyeDx, p.rightEyeDy] : null;
        const facePoseChanged = Boolean(facePose && (!this.lastFacePose || facePose.some((value, index) => Math.abs(value - this.lastFacePose[index]) > .00025)));
        if (facePoseChanged) this.lastFacePose = facePose;
        const eyeGeometryDirty = shapeDirty || closeUp || this.lastCloseUp !== closeUp || facePoseChanged;
        let leftD = shapePaths.leftD, rightD = shapePaths.rightD, lc = shapePaths.leftCenter, rc = shapePaths.rightCenter;
        if (closeUp || facePose) {
            leftD = closedPath(left);
            rightD = closedPath(right);
            lc = centroid(left);
            rc = centroid(right);
        }
        if (eyeGeometryDirty) {
            for (const e of [this.leftEyeDark, this.leftEyeGlow, this.leftEye, this.leftEyeDepth, this.leftEyeSheen, this.leftEyeTint, this.leftEyeSocketGlow, this.leftEyeSocket])
                e.setAttribute('d', leftD);
            for (const e of [this.rightEyeDark, this.rightEyeGlow, this.rightEye, this.rightEyeDepth, this.rightEyeSheen, this.rightEyeTint, this.rightEyeSocketGlow, this.rightEyeSocket])
                e.setAttribute('d', rightD);
            this.posLeftEyeClipPath.setAttribute('d', leftD);
            this.posRightEyeClipPath.setAttribute('d', rightD); /* Legacy eye rasters remain deliberately dormant: vector eye geometry/material is the only live eye renderer. */
        }
        this.lastCloseUp = closeUp;
        const leftMaskDirty = eyeGeometryDirty || !Number.isFinite(this.lastLeftMaskOpen) || leftOpen !== this.lastLeftMaskOpen, rightMaskDirty = eyeGeometryDirty || !Number.isFinite(this.lastRightMaskOpen) || rightOpen !== this.lastRightMaskOpen;
        if (leftMaskDirty) {
            const d = closedPath(aperture(left, leftOpen));
            this.leftMaskPath.setAttribute('d', d);
            this.leftEyeSocket.setAttribute('d', d);
            this.leftEyeSocketGlow.setAttribute('d', d);
            this.lastLeftMaskOpen = leftOpen;
        }
        if (rightMaskDirty) {
            const d = closedPath(aperture(right, rightOpen));
            this.rightMaskPath.setAttribute('d', d);
            this.rightEyeSocket.setAttribute('d', d);
            this.rightEyeSocketGlow.setAttribute('d', d);
            this.lastRightMaskOpen = rightOpen;
        }
        // The eyelid, socket, and light stay registered to one contour. Cinematic gaze offsets move
        // that contour slightly inside the face; no eye layer drifts independently.
        this.leftEyeGroup.removeAttribute('transform');
        this.rightEyeGroup.removeAttribute('transform');
        const leftGroupVisibility = cinematicPoseLock ? (this.cinematicEyeIsolation === 'right' ? 0 : smooth(clamp(leftOpen / .10))) : 1, rightGroupVisibility = cinematicPoseLock ? (this.cinematicEyeIsolation === 'left' ? 0 : smooth(clamp(rightOpen / .10))) : 1;
        this.leftEyeGroup.setAttribute('opacity', String(leftGroupVisibility));
        this.rightEyeGroup.setAttribute('opacity', String(rightGroupVisibility));
        const eyeLight = storyboardLocked ? shape.eyeLight : 1, eyeWhite = clamp(eyeLight), eyeDark = clamp(1 - eyeLight * .85), eyeGlow = clamp((.76 + p.eyeGlow * .22) * eyeLight), eyeSocket = clamp(.30 + .18 * eyeLight), coreSx = 1, coreSy = 1, leftCore = `translate(${lc[0]} ${lc[1]}) scale(${coreSx} ${coreSy}) translate(${-lc[0]} ${-lc[1]})`, rightCore = `translate(${rc[0]} ${rc[1]}) scale(${coreSx} ${coreSy}) translate(${-rc[0]} ${-rc[1]})`;
        this.leftEye.setAttribute('transform', leftCore);
        this.rightEye.setAttribute('transform', rightCore);
        this.leftEyeTint.setAttribute('transform', leftCore);
        this.rightEyeTint.setAttribute('transform', rightCore);
        this.posLeftEyeImage.setAttribute('opacity', '0');
        this.posRightEyeImage.setAttribute('opacity', '0');
        this.leftEye.setAttribute('fill', `url(#${this.uid}-${closeUp ? 'eyeCinematic' : 'eye'})`);
        this.rightEye.setAttribute('fill', `url(#${this.uid}-${closeUp ? 'eyeCinematic' : 'eye'})`);
        this.leftEyeGlow.setAttribute('filter', `url(#${this.uid}-${closeUp ? 'eyeGlowCinematic' : 'eyeGlow'})`);
        this.rightEyeGlow.setAttribute('filter', `url(#${this.uid}-${closeUp ? 'eyeGlowCinematic' : 'eyeGlow'})`);
        this.leftEye.setAttribute('opacity', String(eyeWhite));
        this.rightEye.setAttribute('opacity', String(eyeWhite));
        const focus = closeUp ? this.cinematicFocus : 0, thisDepth = clamp((closeUp ? .34 : .48) + focus * .12), thisSheen = clamp((closeUp ? .38 : .50) + focus * .22);
        this.leftEyeDepth.setAttribute('opacity', String(thisDepth * eyeWhite));
        this.rightEyeDepth.setAttribute('opacity', String(thisDepth * eyeWhite));
        this.leftEyeSheen.setAttribute('opacity', String(thisSheen * eyeWhite));
        this.rightEyeSheen.setAttribute('opacity', String(thisSheen * eyeWhite));
        this.leftEyeTint.setAttribute('fill', shape.eyeTintColor);
        this.rightEyeTint.setAttribute('fill', shape.eyeTintColor);
        this.leftEyeTint.setAttribute('opacity', String(clamp(shape.eyeTint * eyeLight * webBlend * .62)));
        this.rightEyeTint.setAttribute('opacity', String(clamp(shape.eyeTint * eyeLight * webBlend * .62)));
        this.leftEyeDark.setAttribute('opacity', String(eyeDark * .62));
        this.rightEyeDark.setAttribute('opacity', String(eyeDark * .62));
        const glowStrength = clamp(eyeGlow * (closeUp ? (.44 + focus * .14) : .58));
        this.leftEyeGlow.setAttribute('opacity', String(glowStrength));
        this.rightEyeGlow.setAttribute('opacity', String(glowStrength));
        const socketColor = mixHex('#7652df', shape.eyeSocketColor, webBlend), socketAlpha = clamp(eyeSocket * (.24 + .76 * Math.sqrt(leftOpen))), rightSocketAlpha = clamp(eyeSocket * (.24 + .76 * Math.sqrt(rightOpen))), socketWidth = closeUp ? 2.65 : lerp(2.05, 2.75, shape.profile), socketGlowWidth = closeUp ? 6.2 : lerp(4.8, 6.2, shape.profile);
        this.leftEyeSocket.setAttribute('stroke', socketColor);
        this.rightEyeSocket.setAttribute('stroke', socketColor);
        this.leftEyeSocketGlow.setAttribute('stroke', mixHex('#b88bff', socketColor, .36));
        this.rightEyeSocketGlow.setAttribute('stroke', mixHex('#b88bff', socketColor, .36));
        this.leftEyeSocket.setAttribute('stroke-width', String(socketWidth));
        this.rightEyeSocket.setAttribute('stroke-width', String(socketWidth));
        this.leftEyeSocketGlow.setAttribute('stroke-width', String(socketGlowWidth));
        this.rightEyeSocketGlow.setAttribute('stroke-width', String(socketGlowWidth));
        this.leftEyeSocket.setAttribute('opacity', String(socketAlpha));
        this.rightEyeSocket.setAttribute('opacity', String(rightSocketAlpha));
        this.leftEyeSocketGlow.setAttribute('opacity', String(socketAlpha * (closeUp ? .18 : .22)));
        this.rightEyeSocketGlow.setAttribute('opacity', String(rightSocketAlpha * (closeUp ? .18 : .22)));
        const accent = storyboardLocked ? '#caa4ff' : p.accentStrength > 0 ? color(p.accentColor) : '#caa4ff';
        this.bodyPath.setAttribute('stroke', mixHex('#d8d0ff', accent, webBlend));
        this.bodyGlow.setAttribute('fill', shape.profile > .72 ? '#5728c8' : '#7d48ed');
        const depth = storyboardLocked ? shape.depthGrade : smooth(clamp((shape.profile - .52) / .48)) * .78;
        this.bodyProfileTone.setAttribute('opacity', String(clamp(depth * webBlend)));
        this.bodyShadow.setAttribute('opacity', String(clamp((.10 + depth * .82) * webBlend)));
        this.bodyEdge.setAttribute('opacity', String(clamp((.12 + depth * .56) * webBlend)));
        this.bodyHighlight.setAttribute('opacity', String(clamp((.70 - depth * .04) * webBlend)));
        this.bodyMidGlow.setAttribute('opacity', String(clamp(.58 * webBlend)));
        const sm = this.sceneMotion;
        if (storyboardLocked) {
            const vfxFrameBudget = 1000 / (this.quality === 'optimized' ? 24 : 30), vfxDirty = !this.lastStoryboardVfxAt || now - this.lastStoryboardVfxAt >= vfxFrameBudget || (this.storyboardMotion ?? 0) <= .001 || (this.storyboardMotion ?? 0) >= .999;
            if (vfxDirty) {
                this.lastStoryboardVfxAt = now;
                const orn = this.resolveStoryboardOrnaments(this.storyboardMotion, shape.side), fineTrails = this.resolveStoryboardTrails(this.storyboardMotion, shape.side), posOrbit = (shape.side > 0 ? [orbitCenter[0] * 1000, orbitCenter[1] * 1000, orbitRx * 1000, orbitRy * 1000, orbitRotationDeg, 1] : [1000 - orbitCenter[0] * 1000, orbitCenter[1] * 1000, orbitRx * 1000, orbitRy * 1000, mirrorAngle(orbitRotationDeg), 1]), rawOrbit = orn.orbit, o = mixTuple(posOrbit, rawOrbit, webBlend), orbitOpacity = clamp(o[5] * sm.orbitOpacity), sceneOrbit = [o[0] + sm.orbitOffsetX * 1000, o[1] + sm.orbitOffsetY * 1000, o[2] * sm.orbitScaleX, o[3] * sm.orbitScaleY, o[4] + sm.orbitRotation * 57.2958, orbitOpacity];
                this.orbitBack.setAttribute('cx', String(sceneOrbit[0]));
                this.orbitBack.setAttribute('cy', String(sceneOrbit[1]));
                this.orbitBack.setAttribute('rx', String(sceneOrbit[2]));
                this.orbitBack.setAttribute('ry', String(sceneOrbit[3]));
                this.orbitBack.setAttribute('transform', `rotate(${sceneOrbit[4]} ${sceneOrbit[0]} ${sceneOrbit[1]})`);
                this.orbitBack.setAttribute('opacity', String(orbitOpacity * .70));
                this.orbitBack.setAttribute('stroke-width', '4.4');
                const frontArc = ellipseFrontArc(sceneOrbit);
                this.orbitFront.setAttribute('d', openPath(frontArc));
                this.orbitFront.setAttribute('opacity', String(orbitOpacity * .98));
                this.orbitFront.setAttribute('stroke-width', '4.0');
                const cresPts = c18(crescentPath), cc = centroid(cresPts), posC = (shape.side > 0 ? [155, 556, 1, 0, 1] : [845, 556, 1, 0, 1]), rawC = orn.crescent, c = mixTuple(posC, rawC, webBlend), cresTransform = `translate(${c[0] + sm.crescentOffsetX * 1000} ${c[1] + sm.crescentOffsetY * 1000}) rotate(${c[3] + sm.crescentRotation * 57.2958}) scale(${c[2] * sm.crescentScale}) translate(${-cc[0]} ${-cc[1]})`;
                this.posCrescentImage.setAttribute('transform', cresTransform);
                this.posCrescentImage.setAttribute('opacity', String(clamp(posBlend * c[4] * sm.crescentOpacity)));
                this.crescent.setAttribute('transform', cresTransform);
                this.crescent.setAttribute('opacity', String(clamp(c[4] * sm.crescentOpacity * (webBlend + posBlend * .24))));
                const posStarCenters = [[star0Center[0] * 1000, star0Center[1] * 1000], [star1Center[0] * 1000, star1Center[1] * 1000], [star2Center[0] * 1000, star2Center[1] * 1000]], posStarOuter = [star0Outer, star1Outer, star2Outer], posStarInner = [star0Inner, star1Inner, star2Inner];
                this.stars.forEach((node, i) => { const raw = orn.stars[i] ?? [500, 500, 0, 0, 0], pc = posStarCenters[i], posQ = (shape.side > 0 ? [pc[0], pc[1], 1, 0, 1] : [1000 - pc[0], pc[1], 1, 0, 1]), q = mixTuple(posQ, raw, webBlend), outer = lerp((posStarOuter[i] ?? star0Outer) * 1000, star0Outer * 1000 * raw[2], webBlend), inner = lerp((posStarInner[i] ?? star0Inner) * 1000, star0Inner * 1000 * raw[2], webBlend), cfg = i === 0 ? { x: sm.star0OffsetX, y: sm.star0OffsetY, r: sm.star0Rotation, sc: sm.star0Scale, o: sm.star0Opacity } : i === 1 ? { x: sm.star1OffsetX, y: sm.star1OffsetY, r: sm.star1Rotation, sc: sm.star1Scale, o: sm.star1Opacity } : { x: sm.star2OffsetX, y: sm.star2OffsetY, r: sm.star2Rotation, sc: sm.star2Scale, o: sm.star2Opacity }, sx = q[0] + cfg.x * 1000, sy = q[1] + cfg.y * 1000; node.setAttribute('d', starD(sx, sy, outer * cfg.sc, inner * cfg.sc)); if (Math.abs(cfg.r) > .00001)
                    node.setAttribute('transform', `rotate(${cfg.r * 57.2958} ${sx} ${sy})`);
                else
                    node.removeAttribute('transform'); node.setAttribute('opacity', String(clamp(q[4] * cfg.o))); });
                this.sparkleNodes.forEach((node, i) => { const q = orn.sparkles[i]; if (!q) {
                    node.setAttribute('d', '');
                    node.setAttribute('opacity', '0');
                    return;
                } const outer = Math.max(2.2, q[2] * 1.55), inner = Math.max(.55, outer * .22); node.setAttribute('d', starD(q[0], q[1], outer, inner)); node.setAttribute('opacity', String(clamp(q[3]))); });
                this.trailGroup.setAttribute('opacity', '1');
                const bloomId = shape.side > 0 ? `${this.uid}-trailBloomRight` : `${this.uid}-trailBloomLeft`, coreId = shape.side > 0 ? `${this.uid}-trailCoreRight` : `${this.uid}-trailCoreLeft`;
                for (let i = 0; i < 4; i++) {
                    const ribbon = orn.trails[i] ?? [], rd = ribbon.length ? openPath(ribbon) : '', active = ribbon.length ? orn.trailOpacity * orn.trailIntensityScale : 0, outer = this.energyTrailOuter[i], mid = this.energyTrailMid[i], energyCore = this.energyTrailCore[i], gw = ([105, 78, 56, 38][i] ?? 38) * orn.trailWidthScale, mw = [24, 18, 13, 9][i] ?? 9, cw = [5.8, 4.6, 3.6, 2.8][i] ?? 2.8;
                    for (const node of [outer, mid, energyCore])
                        node.setAttribute('d', rd);
                    outer.setAttribute('stroke', `url(#${bloomId})`);
                    mid.setAttribute('stroke', `url(#${bloomId})`);
                    energyCore.setAttribute('stroke', `url(#${coreId})`);
                    outer.setAttribute('stroke-width', String(gw));
                    mid.setAttribute('stroke-width', String(mw));
                    energyCore.setAttribute('stroke-width', String(cw));
                    const broadOuterOpacity = [.50, .42, .24, .16][i] ?? .16, broadMidOpacity = [.68, .55, .20, .12][i] ?? .12, broadCoreOpacity = [.95, .78, 0, 0][i] ?? 0;
                    outer.setAttribute('opacity', String(clamp(active * broadOuterOpacity)));
                    mid.setAttribute('opacity', String(clamp(active * broadMidOpacity)));
                    energyCore.setAttribute('opacity', String(clamp(active * broadCoreOpacity)));
                    const path = fineTrails.paths[i] ?? [], d = path.length ? openPath(path) : '', glow = this.trailGlows[i], core = this.trails[i], fineActive = path.length ? fineTrails.opacity * orn.trailIntensityScale : 0;
                    glow.setAttribute('d', d);
                    core.setAttribute('d', d);
                    const fineGlowW = ([135, 72, 46, 30][i] ?? 30) * orn.trailWidthScale, fineCoreW = [9.5, 5, 3.5, 2.5][i] ?? 2.5;
                    glow.setAttribute('stroke', `url(#${bloomId})`);
                    core.setAttribute('stroke', `url(#${coreId})`);
                    glow.setAttribute('stroke-width', String(fineGlowW));
                    core.setAttribute('stroke-width', String(fineCoreW));
                    glow.setAttribute('filter', i === 0 ? `url(#${this.uid}-energyTrailBlur)` : `url(#${this.uid}-trailGlow)`);
                    glow.setAttribute('opacity', String(clamp(fineActive * (i === 0 ? .68 : .50 - i * .05))));
                    core.setAttribute('opacity', String(clamp(fineActive * (i === 0 ? .94 : .78 - i * .07))));
                }
                const beam = orn.beam, beamD = beam[5] > .001 ? `M ${beam[0]} ${beam[1]} L ${beam[2]} ${beam[3]}` : '';
                for (const node of [this.landingBeamOuter, this.landingBeamMid, this.landingBeamCore])
                    node.setAttribute('d', beamD);
                this.landingBeamOuter.setAttribute('stroke-width', String(beam[4] * 1.18));
                this.landingBeamMid.setAttribute('stroke-width', String(Math.max(8, beam[4] * .38)));
                this.landingBeamCore.setAttribute('stroke-width', String(Math.max(3, beam[4] * .07)));
                this.landingBeamOuter.setAttribute('opacity', String(clamp(beam[5] * .34)));
                this.landingBeamMid.setAttribute('opacity', String(clamp(beam[5] * .62)));
                this.landingBeamCore.setAttribute('opacity', String(clamp(beam[5] * .92)));
            }
        }
        else {
            this.sparkleNodes.forEach(node => { node.setAttribute('d', ''); node.setAttribute('opacity', '0'); });
            for (const node of [...this.energyTrailOuter, ...this.energyTrailMid, ...this.energyTrailCore]) {
                node.setAttribute('d', '');
                node.setAttribute('opacity', '0');
            }
            const orbitOpacity = clamp(p.orbitOpacity * sm.orbitOpacity), orbitRot = orbitRotationDeg + (p.orbitRotation + sm.orbitRotation) * 57.2958 + shape.side * shape.profile * 4, ocx = orbitCenter[0] * 1000, ocy = orbitCenter[1] * 1000, orbitDx = sm.orbitOffsetX * 1000 - shape.side * shape.profile * 8, orbitDy = sm.orbitOffsetY * 1000;
            this.orbitBack.setAttribute('cx', String(ocx));
            this.orbitBack.setAttribute('cy', String(ocy));
            this.orbitBack.setAttribute('rx', String(orbitRx * 1000));
            this.orbitBack.setAttribute('ry', String(orbitRy * 1000));
            this.orbitBack.setAttribute('opacity', String(orbitOpacity * .72));
            this.orbitBack.setAttribute('transform', `translate(${ocx + orbitDx} ${ocy + orbitDy}) rotate(${orbitRot}) scale(${sm.orbitScaleX * (1 - shape.profile * .10)} ${sm.orbitScaleY}) translate(${-ocx} ${-ocy})`);
            const rx = orbitRx * 1000 * (1 - shape.profile * .10), ry = orbitRy * 1000, ang = orbitRot * Math.PI / 180, x0 = ocx + orbitDx + Math.cos(ang) * rx * .80, y0 = ocy + orbitDy + Math.sin(ang) * rx * .80, x1 = ocx + orbitDx - Math.cos(ang) * rx * .90, y1 = ocy + orbitDy - Math.sin(ang) * rx * .90;
            this.orbitFront.setAttribute('d', `M ${x0} ${y0} Q ${ocx + orbitDx} ${ocy + orbitDy + ry * 1.22} ${x1} ${y1}`);
            this.orbitFront.setAttribute('opacity', String(orbitOpacity * .82));
            const cresPts = c18(crescentPath), cc = centroid(cresPts), crescentScale = sm.crescentScale * (1 + shape.profile * .03), cresTransform = `translate(${cc[0] + sm.crescentOffsetX * 1000 - shape.side * shape.profile * 18} ${cc[1] + sm.crescentOffsetY * 1000}) rotate(${sm.crescentRotation * 57.2958}) scale(${crescentScale}) translate(${-cc[0]} ${-cc[1]})`;
            this.posCrescentImage.setAttribute('transform', cresTransform);
            this.posCrescentImage.setAttribute('opacity', String(clamp(posBlend * sm.crescentOpacity)));
            this.crescent.setAttribute('transform', cresTransform);
            this.crescent.setAttribute('opacity', String(clamp(sm.crescentOpacity * (.78 + .22 * p.glow) * (webBlend + posBlend * .24))));
            const starCenters = [[star0Center[0] * 1000, star0Center[1] * 1000], [star1Center[0] * 1000, star1Center[1] * 1000], [star2Center[0] * 1000, star2Center[1] * 1000]], starScene = [{ x: sm.star0OffsetX, y: sm.star0OffsetY, r: sm.star0Rotation, sc: sm.star0Scale, o: sm.star0Opacity }, { x: sm.star1OffsetX, y: sm.star1OffsetY, r: sm.star1Rotation, sc: sm.star1Scale, o: sm.star1Opacity }, { x: sm.star2OffsetX, y: sm.star2OffsetY, r: sm.star2Rotation, sc: sm.star2Scale, o: sm.star2Opacity }];
            this.stars.forEach((node, i) => { const base = starCenters[i], cfg = starScene[i], spread = clamp(p.starSpread, -.2, .36), dx = (base[0] - 500) * spread + cfg.x * 1000 + shape.side * shape.profile * (i === 0 ? 15 : -9), dy = (base[1] - 510) * spread + cfg.y * 1000, pulse = 1 + clamp((i === 0 ? p.starPulse : p.sparkle) * (i === 0 ? .13 : .08), -.12, .18), sc = cfg.sc * pulse, twinkle = this.reduced ? 1 : .88 + .12 * Math.sin(seconds * (1.7 + i * .21) + i * 1.31); node.setAttribute('d', starD(base[0], base[1], (i === 0 ? star0Outer : i === 1 ? star1Outer : star2Outer) * 1000, (i === 0 ? star0Inner : i === 1 ? star1Inner : star2Inner) * 1000)); node.setAttribute('transform', `translate(${base[0] + dx} ${base[1] + dy}) rotate(${cfg.r * 57.2958}) scale(${sc}) translate(${-base[0]} ${-base[1]})`); node.setAttribute('opacity', String(clamp(cfg.o * twinkle))); });
            const trailOn = clamp((shape.profile - .45) / .55) * clamp(this.travel.energy * 1.4);
            this.trailGroup.setAttribute('opacity', String(trailOn));
            const sign = shape.side;
            this.trails.forEach((tr, i) => { const y = 470 + i * 60, xStart = sign > 0 ? 270 : 730, xEnd = sign > 0 ? -80 : 1080, d = `M ${xStart} ${y} C ${xStart - sign * 120} ${y - 25},${xEnd + sign * 160} ${y + 20},${xEnd} ${y + 15}`; tr.setAttribute('d', d); tr.setAttribute('stroke', i === 0 ? '#7f45ff' : i === 1 ? '#ba86ff' : i === 2 ? '#f0c7ff' : '#6d3de0'); tr.setAttribute('stroke-width', String(Math.max(3.5, 15 - i * 3))); tr.setAttribute('opacity', String(Math.max(.18, .58 - i * .085))); this.trailGlows[i].setAttribute('d', ''); });
        }
        this.layout();
    }
}
