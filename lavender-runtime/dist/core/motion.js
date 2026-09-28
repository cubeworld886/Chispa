import { accentByState } from './types.js';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const vec = (x, y) => ({ x, y });
const ACCENTS = { lavender: 0xd8d0ff, cosmic: 0x8b6dff, mint: 0x63e8cf, cyan: 0x69d9ff, warning: 0xffc54d, rose: 0xff5a88, muted: 0x777d96, sleepy: 0x999bca, celebration: 0xff82dd };
const mixColor = (a, b, t) => { const v = clamp(t); const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255; return (Math.round(ar + (br - ar) * v) << 16) | (Math.round(ag + (bg - ag) * v) << 8) | Math.round(ab + (bb - ab) * v); };
const wavePulse = (t, period) => (Math.sin(t * Math.PI * 2 / period) + 1) * .5;
const smoothstep = (x) => { const v = clamp(x); return v * v * (3 - 2 * v); };
const morphIn = (age, duration) => { if (!Number.isFinite(age) || age <= 0)
    return 0; if (age >= duration)
    return 1; const x = clamp(age / duration); return clamp(x * x * x * (x * (x * 6 - 15) + 10)); };
const oneShot = (age, enter, hold, exit) => { if (!Number.isFinite(age) || age <= 0)
    return 0; if (age < enter)
    return morphIn(age, enter); if (age < enter + hold)
    return 1; const outAge = age - enter - hold; if (outAge >= exit)
    return 0; return clamp(1 - morphIn(outAge, exit)); };
const errorShock = (age) => { if (age <= 0 || age >= .78)
    return 0; if (age < .18)
    return clamp(age / .18); const x = clamp((age - .18) / .60); return (1 - x) * (1 - x); };
const hash01 = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453123; return x - Math.floor(x); };
const ambientGaze = (t) => { const window = 2.75, segment = Math.floor(t / window), local = (t - segment * window) / window; const target = (index) => vec((hash01(index * 2 + 19) * 2 - 1) * .24, (hash01(index * 2 + 37) * 2 - 1) * .14); const a = target(segment), b = target(segment + 1), glide = clamp((local - .78) / .22), smooth = glide * glide * (3 - 2 * glide); return vec(a.x + (b.x - a.x) * smooth + Math.sin(t * .41) * .025, a.y + (b.y - a.y) * smooth + Math.sin(t * .33 + .8) * .018); };
const singleBlink = (local, duration) => { if (local < 0 || local > duration)
    return 1; const x = local / duration; return 1 - clamp(Math.sin(x * Math.PI)); };
const slowLamentBlinkOpen = (age) => {
    if (age < 1.24)
        return 1;
    if (age < 1.60)
        return 1 - smoothstep((age - 1.24) / .36) * .90;
    if (age < 1.80)
        return .10;
    if (age < 2.42)
        return .10 + smoothstep((age - 1.80) / .62) * .90;
    return 1;
};
const lamentBreathPulse = (age) => {
    const cycleSeconds = 7.4;
    const segment = Math.floor(Math.max(0, age) / cycleSeconds);
    const local = (Math.max(0, age) - segment * cycleSeconds) / cycleSeconds;
    const inhaleEnd = .235 + hash01(segment + 601) * .035;
    const holdEnd = inhaleEnd + .045 + hash01(segment + 602) * .035;
    const exhaleEnd = .60 + hash01(segment + 603) * .055;
    const pauseEnd = .82 + hash01(segment + 604) * .06;
    if (local < inhaleEnd) return smoothstep(local / inhaleEnd);
    if (local < holdEnd) return .94;
    if (local < exhaleEnd) return .94 - smoothstep((local - holdEnd) / (exhaleEnd - holdEnd)) * 1.34;
    if (local < pauseEnd) return -.40;
    return -.40 + smoothstep((local - pauseEnd) / (1 - pauseEnd)) * .40;
};
const lamentBlinkOpen = (age, offset = 0) => {
    const localAge = Math.max(0, age + offset);
    const processing = slowLamentBlinkOpen(localAge);
    if (processing < .999) return processing;
    const sinceProcessing = Math.max(0, localAge - 2.42);
    const segment = Math.floor(sinceProcessing / 8.1);
    const segmentStart = 2.42 + segment * 8.1;
    const start = segmentStart + 1.15 + hash01(segment + 711) * 4.2;
    const duration = .52 + hash01(segment + 712) * .11;
    const elapsed = localAge - start;
    if (elapsed < 0 || elapsed > duration) return 1;
    const closeEnd = duration * .40;
    const reopenStart = closeEnd + duration * .12;
    if (elapsed < closeEnd) return 1 - smoothstep(elapsed / closeEnd) * .88;
    if (elapsed < reopenStart) return .12;
    return .12 + smoothstep((elapsed - reopenStart) / (duration - reopenStart)) * .88;
};
const blinkOpen = (t) => { const window = 6.2, segment = Math.floor(t / window), local = t - segment * window, start = .85 + hash01(segment + 7) * 4.15, first = singleBlink(local - start, .165), doubleBlink = hash01(segment + 101) > .76; if (!doubleBlink)
    return first; return Math.min(first, singleBlink(local - start - .27, .145)); };
const winkGestureOpen = (phase) => phase < .34 ? 1 : phase < .46 ? 1 - smoothstep((phase - .34) / .12) * .93 : phase < .62 ? .07 : phase < .84 ? .07 + smoothstep((phase - .62) / .22) * .93 : 1;
const winkGestureBeat = (phase) => { if (phase < .28 || phase > 1.02)
    return 0; const x = clamp((phase - .28) / .74); return Math.sin(x * Math.PI) * Math.exp(-x * .45); };
const winkHeadFollow = (phase) => { if (phase < .18)
    return 0; if (phase < .48)
    return smoothstep((phase - .18) / .30); if (phase < .92)
    return 1; if (phase < 1.42)
    return 1 - smoothstep((phase - .92) / .50); return 0; };
const entranceBounce = (age, frequency, damping) => !Number.isFinite(age) || age < 0 || age > 2.2 ? 0 : Math.sin(age * Math.PI * frequency) * Math.exp(-age * damping);
const positiveKick = (age, duration) => !Number.isFinite(age) || age < 0 || age > duration ? 0 : clamp(Math.sin((age / duration) * Math.PI));
const interactionPop = (age) => !Number.isFinite(age) || age < 0 || age > .75 ? 0 : Math.sin(age * Math.PI * 4.1) * Math.exp(-age * 5.4);
const errorShake = (age) => !Number.isFinite(age) || age < 0 || age > .72 ? 0 : Math.sin(age * Math.PI * 11) * Math.exp(-age * 5.8);
const idleGesture = (t) => { const period = 9.4, segment = Math.floor(t / period), local = t - segment * period, start = 5.1 + hash01(segment + 211) * 1.7, d = local - start; if (d < 0 || d > 1.05)
    return 0; const x = d / 1.05, envelope = clamp(Math.sin(x * Math.PI)); return envelope * envelope; };
const danceBounce = (t) => Math.pow((Math.sin(t * Math.PI * 2 / .61) + 1) * .5, 2.2);
export function basePose(state = 'idle') { return { bodyScaleX: 1, bodyScaleY: 1, bodyRotation: 0, bodyDx: 0, bodyDy: 0, bodySkewX: 0, bodySkewY: 0, bodyPuff: 0, bodyPinch: 0, bodyBend: 0, bodyWave: 0, bodyWavePhase: 0, bodyTurn: 0, faceDepth: 0, leftEyeOpen: 1, rightEyeOpen: 1, leftEyeScaleX: 1, rightEyeScaleX: 1, leftEyeRotation: 0, rightEyeRotation: 0, leftEyeSmile: 0, rightEyeSmile: 0, leftEyeDx: 0, leftEyeDy: 0, rightEyeDx: 0, rightEyeDy: 0, eyeGlow: 1, gazeX: 0, gazeY: 0, orbitRotation: 0, orbitOpacity: .72, glow: 1, starPulse: 0, sparkle: 0, starSpread: 0, accentStrength: 0, desaturation: 0, accentColor: accentByState[state] ?? ACCENTS.lavender, galaxyMorph: 0, successMorph: 0, warningMorph: 0, errorMorph: 0, signalMorph: 0 }; }
export function lerpPose(a, b, t) { const v = clamp(t), d = (x, y) => x + (y - x) * v, out = { ...a }; for (const k of Object.keys(a)) {
    if (k === 'accentColor')
        continue;
    out[k] = d(a[k], b[k]);
} out.accentColor = mixColor(a.accentColor, b.accentColor, v); return out; }
export function samplePose(o) {
    const { state, reducedMotion } = o, t = reducedMotion ? 0 : Math.max(0, o.seconds), age = reducedMotion ? 10 : Math.max(0, o.stateAge);
    const breath = reducedMotion ? 0 : Math.sin(t * Math.PI * 2 / 3.9), float = reducedMotion ? 0 : Math.sin(t * Math.PI * 2 / 4.7 + .7), jelly = reducedMotion ? 0 : Math.sin(t * Math.PI * 2 / 2.65 + .35), blink = reducedMotion ? 1 : blinkOpen(t);
    const userGaze = vec(clamp(o.gazeX, -1, 1), clamp(o.gazeY, -1, 1)), hasUserGaze = userGaze.x * userGaze.x + userGaze.y * userGaze.y > .0004, ambient = reducedMotion ? vec(0, 0) : ambientGaze(t), resolvedGaze = hasUserGaze ? userGaze : ambient;
    const resolvedHeadTurn = reducedMotion ? 0 : clamp(hasUserGaze ? (o.headTurn ?? 0) : ambient.x * .055, -.16, .16), interactionLean = resolvedHeadTurn * .024, interactionLift = hasUserGaze ? -userGaze.y * .0025 : 0, interactionMag = hasUserGaze ? clamp(Math.hypot(userGaze.x, userGaze.y)) : 0;
    const interactionAge = o.interactionAgeSeconds ?? Number.POSITIVE_INFINITY, poke = reducedMotion ? 0 : o.pressed ? 1 : interactionPop(interactionAge), curiosity = reducedMotion ? 0 : idleGesture(t), pressScaleX = o.pressed ? 1.030 : 1 + poke * .018, pressScaleY = o.pressed ? .958 : 1 + poke * .026;
    const pose = (input = {}) => { const gaze = input.gaze ?? resolvedGaze, p = basePose(state); Object.assign(p, input); p.bodyScaleX = (input.bodyScaleX ?? 1) * pressScaleX; p.bodyScaleY = (input.bodyScaleY ?? 1) * pressScaleY; p.bodyRotation = (input.bodyRotation ?? 0) + interactionLean; p.bodyDx = (input.bodyDx ?? 0) + resolvedGaze.x * (hasUserGaze ? .0028 : 0); p.bodyDy = (input.bodyDy ?? 0) + interactionLift + (o.pressed ? .006 : -poke * .006); p.bodySkewX = (input.bodySkewX ?? 0) + interactionLean * .30; p.bodySkewY = input.bodySkewY ?? 0; p.bodyPuff = (input.bodyPuff ?? 0) + poke * .18; p.bodyTurn = clamp((input.bodyTurn ?? 0) + resolvedHeadTurn, -.16, .16); p.faceDepth = clamp((input.faceDepth ?? 0) + (hasUserGaze ? interactionMag * .10 : 0)); p.eyeGlow = (input.eyeGlow ?? 1) + poke * .14; p.gazeX = gaze.x; p.gazeY = gaze.y; p.glow = (input.glow ?? 1) + poke * .08; p.starPulse = (input.starPulse ?? 0) + poke * .10; p.sparkle = (input.sparkle ?? 0) + poke * .08; p.accentColor = input.accentColor ?? accentByState[state] ?? ACCENTS.lavender; p.galaxyMorph = clamp(input.galaxyMorph ?? 0); p.successMorph = clamp(input.successMorph ?? 0); p.warningMorph = clamp(input.warningMorph ?? 0); p.errorMorph = clamp(input.errorMorph ?? 0); p.signalMorph = clamp(input.signalMorph ?? 0); delete p.gaze; return p; };
    const base = pose({ bodyScaleX: 1 + breath * .007 + jelly * .002 + curiosity * .010, bodyScaleY: 1 + breath * .011 - jelly * .001 + curiosity * .016, bodyRotation: curiosity * Math.sin(t * 5.2) * .026, bodyDy: float * .006 - curiosity * .009, bodyPuff: breath * .08 + curiosity * .16, bodyPinch: -curiosity * .05, bodyBend: Math.sin(t * .55) * .045 + curiosity * Math.sin(t * 4.4) * .10, bodyWave: Math.sin(t * .73 + 1.1) * .025 + curiosity * .055, bodyWavePhase: t * .85, bodyTurn: 0, faceDepth: .10 + curiosity * .12, leftEyeOpen: clamp(blink + curiosity * .045, 0, 1.08), rightEyeOpen: clamp(blink + curiosity * .045, 0, 1.08), leftEyeScaleX: 1 + Math.sin(t * .43) * .012 + curiosity * .020, rightEyeScaleX: 1 + Math.sin(t * .43 + .9) * .012 + curiosity * .020, leftEyeRotation: Math.sin(t * .31) * .010 - curiosity * .018, rightEyeRotation: -Math.sin(t * .29 + .4) * .010 + curiosity * .018, leftEyeDy: Math.sin(t * .67) * .0012 - curiosity * .0015, rightEyeDy: Math.sin(t * .67 + .7) * .0012 - curiosity * .0015, eyeGlow: 1 + interactionMag * .10 + curiosity * .08, orbitRotation: reducedMotion ? 0 : Math.sin(t * .20) * .028, orbitOpacity: .68, glow: 1 + breath * .045 + curiosity * .035, starPulse: curiosity * .16, sparkle: curiosity * .07 });
    switch (state) {
        case 'idle': {
            return base;
        }
        case 'attentive': {
            const listen = reducedMotion ? 0.0 : Math.sin(t * 2.2) * 0.5 + 0.5;
            return pose({
                bodyScaleX: 1.006 + listen * 0.006,
                bodyScaleY: 1.012 - listen * 0.003,
                bodyRotation: resolvedGaze.x * 0.018,
                bodyDy: reducedMotion ? 0 : float * 0.0035,
                bodyPuff: 0.08 + listen * 0.08,
                bodyBend: resolvedGaze.x * 0.13,
                bodyWave: reducedMotion ? 0 : Math.sin(t * 1.3) * 0.035,
                bodyWavePhase: t,
                bodyTurn: 0,
                faceDepth: 0.22,
                leftEyeOpen: clamp(Math.max(1.18, blink), 0.0, 1.42),
                rightEyeOpen: clamp(Math.max(1.18, blink), 0.0, 1.42),
                leftEyeScaleX: 1.10,
                rightEyeScaleX: 1.10,
                leftEyeRotation: resolvedGaze.x * 0.020,
                rightEyeRotation: resolvedGaze.x * 0.020,
                eyeGlow: 1.10,
                gaze: resolvedGaze,
                orbitRotation: reducedMotion ? 0 : Math.sin(t * 0.32) * 0.022,
                orbitOpacity: 0.72,
                glow: 1.08,
                starPulse: reducedMotion ? 0.15 : 0.12 + wavePulse(t, 2.8) * 0.13,
            });
        }
        case 'thinking': {
            const thought = reducedMotion ? 0.0 : Math.sin(t * 1.15);
            const scan = reducedMotion ? 0.0 : Math.sin(t * 0.88 + 0.6);
            const morph = reducedMotion ? 1.0 : morphIn(age, 0.78);
            return pose({
                bodyScaleX: 0.994 + breath * 0.006,
                bodyScaleY: 1.018 + breath * 0.012,
                bodyRotation: reducedMotion ? -0.016 : -0.016 + thought * 0.022,
                bodyDy: reducedMotion ? -0.004 : -0.008 + float * 0.006,
                bodySkewX: thought * 0.010,
                bodyPuff: 0.05 + breath * 0.08,
                bodyPinch: 0.20 + (thought + 1) * 0.05,
                bodyBend: 0.10 + thought * 0.18,
                bodyWave: 0.08 + thought * 0.045,
                bodyWavePhase: t * 1.25,
                bodyTurn: scan * 0.022,
                faceDepth: 0.30,
                leftEyeOpen: clamp((1.06 * blink), 0.0, 1.26),
                rightEyeOpen: clamp((1.14 * blink), 0.0, 1.32),
                leftEyeScaleX: 0.98 + scan * 0.025,
                rightEyeScaleX: 1.00 - scan * 0.020,
                leftEyeRotation: -0.035 + scan * 0.020,
                rightEyeRotation: 0.018 + scan * 0.018,
                leftEyeDy: -0.003 - scan * 0.0015,
                rightEyeDy: -0.001 + scan * 0.0015,
                eyeGlow: 1.15,
                gaze: hasUserGaze
                    ? userGaze
                    : vec(0.17 + scan * 0.11, -0.20 + thought * 0.035),
                orbitRotation: reducedMotion ? 0.03 : Math.sin(t * 0.72) * 0.060,
                orbitOpacity: 0.80,
                glow: 1.13,
                starPulse: reducedMotion ? 0.32 : 0.20 + wavePulse(t, 1.6) * 0.42,
                sparkle: reducedMotion ? 0.15 : 0.10 + wavePulse(t + 0.2, 2.2) * 0.24,
                accentStrength: 0.68,
                galaxyMorph: morph,
            });
        }
        case 'notification': {
            const kick = reducedMotion ? 0.0 : entranceBounce(age, 3.8, 3.4);
            const eyePop = reducedMotion ? 0.0 : positiveKick(age, 0.70);
            return pose({
                bodyScaleX: 1.0 + kick * 0.036,
                bodyScaleY: 1.0 - kick * 0.025,
                bodyDy: -Math.abs(kick) * 0.018,
                bodyRotation: reducedMotion ? 0 : Math.sin(age * 12) * Math.exp(-age * 4.8) * 0.020,
                bodyPuff: 0.10 + eyePop * 0.24,
                bodyPinch: -0.06 + kick * 0.09,
                bodyBend: kick * 0.14,
                bodyWave: kick * 0.10,
                bodyWavePhase: age * 5.0,
                bodyTurn: kick * 0.055,
                faceDepth: 0.36 + eyePop * 0.22,
                leftEyeOpen: clamp((Math.max(1.10, blink) + eyePop * 0.34), 0.0, 1.48),
                rightEyeOpen: clamp((Math.max(1.10, blink) + eyePop * 0.34), 0.0, 1.48),
                leftEyeScaleX: 1.08 + eyePop * 0.10,
                rightEyeScaleX: 1.08 + eyePop * 0.10,
                leftEyeRotation: -kick * 0.025,
                rightEyeRotation: kick * 0.025,
                leftEyeDy: -eyePop * 0.004,
                rightEyeDy: -eyePop * 0.004,
                eyeGlow: 1.10 + eyePop * 0.24,
                gaze: hasUserGaze ? userGaze : vec(0.0, -0.06),
                orbitRotation: reducedMotion ? 0 : Math.sin(t * 0.85) * 0.038,
                orbitOpacity: 0.76,
                glow: 1.10 + eyePop * 0.10,
                starPulse: reducedMotion ? 0.35 : 0.24 + wavePulse(t, 1.3) * 0.42,
                sparkle: reducedMotion ? 0.12 : 0.18 + eyePop * 0.54,
                accentStrength: 0.44 + eyePop * 0.22,
            });
        }
        case 'success': {
            const bloom = reducedMotion ? 0.20 : wavePulse(t, 2.1);
            const entrance = reducedMotion ? 0.0 : entranceBounce(age, 3.1, 2.8);
            const smile = reducedMotion ? 0.65 : 0.64 + wavePulse(t + 0.4, 3.2) * 0.10;
            const morph = reducedMotion
                ? 0.0
                : oneShot(age, 0.36, 0.42, 0.42);
            return pose({
                bodyScaleX: 1.012 + entrance * 0.028 + bloom * 0.008,
                bodyScaleY: 0.998 - entrance * 0.018 + bloom * 0.010,
                bodyDy: reducedMotion ? 0 : -Math.abs(entrance) * 0.012 + float * 0.003,
                bodyRotation: entrance * 0.018,
                bodyPuff: 0.24 + bloom * 0.18,
                bodyPinch: -0.10,
                bodyBend: entrance * 0.12,
                bodyWave: entrance * 0.08,
                bodyWavePhase: age * 4.0,
                bodyTurn: entrance * 0.045,
                faceDepth: 0.24,
                leftEyeOpen: clamp((smile * blink), 0.0, 1.18),
                rightEyeOpen: clamp((smile * blink), 0.0, 1.18),
                leftEyeScaleX: 1.055,
                rightEyeScaleX: 1.055,
                leftEyeRotation: 0.055,
                rightEyeRotation: -0.055,
                leftEyeDy: 0.004,
                rightEyeDy: 0.004,
                eyeGlow: 1.22,
                gaze: hasUserGaze ? userGaze : vec(0, 0),
                orbitRotation: reducedMotion ? 0 : Math.sin(t * 0.40) * 0.032,
                orbitOpacity: 0.70,
                glow: 1.18,
                starPulse: 0.28 + bloom * 0.38,
                sparkle: reducedMotion ? 0.28 : 0.22 + bloom * 0.58,
                accentStrength: 0.78,
                successMorph: morph,
            });
        }
        case 'warning': {
            const tension = reducedMotion ? 0.0 : Math.sin(t * 5.2);
            const morph = reducedMotion ? 1.0 : morphIn(age, 0.66);
            return pose({
                bodyScaleX: 1.018 + Math.abs(tension) * 0.004,
                bodyScaleY: 0.992 - Math.abs(tension) * 0.004,
                bodyRotation: tension * 0.007,
                bodyDx: tension * 0.0035,
                bodyPuff: 0.18,
                bodyPinch: -0.06,
                bodyBend: tension * 0.12,
                bodyTurn: tension * 0.040,
                faceDepth: 0.28,
                leftEyeOpen: clamp((0.66 * blink), 0.0, 1.08),
                rightEyeOpen: clamp((0.70 * blink), 0.0, 1.08),
                leftEyeScaleX: 1.04,
                rightEyeScaleX: 1.04,
                leftEyeRotation: -0.070 + tension * 0.012,
                rightEyeRotation: 0.070 + tension * 0.012,
                leftEyeDy: -0.001,
                rightEyeDy: -0.001,
                eyeGlow: 0.96,
                gaze: hasUserGaze ? userGaze : vec(tension * 0.12, -0.05),
                orbitRotation: reducedMotion ? 0 : Math.sin(t * 0.25) * 0.018,
                orbitOpacity: 0.50,
                glow: 0.98,
                starPulse: reducedMotion ? 0.20 : 0.18 + wavePulse(t, 1.9) * 0.26,
                sparkle: 0.05,
                accentStrength: 0.82,
                warningMorph: morph,
            });
        }
        case 'error': {
            const recoil = reducedMotion ? 0.0 : errorShake(age);
            const braced = reducedMotion ? 0.0 : positiveKick(age, 0.9);
            const morph = reducedMotion
                ? 0.0
                : oneShot(age, 0.30, 0.30, 0.42);
            return pose({
                bodyScaleX: 1.02 - braced * 0.018,
                bodyScaleY: 0.985 + braced * 0.026,
                bodyDx: recoil * 0.014,
                bodyRotation: recoil * 0.018,
                bodySkewX: recoil * 0.008,
                bodyPuff: 0.12,
                bodyPinch: 0.18,
                bodyBend: recoil * 0.20,
                bodyWave: recoil * 0.10,
                bodyWavePhase: age * 7.0,
                bodyTurn: recoil * 0.075,
                faceDepth: 0.42,
                leftEyeOpen: clamp(((errorShock(age) * 0.92 + 0.50) * blink), 0.0, 1.52),
                rightEyeOpen: clamp(((errorShock(age) * 0.92 + 0.54) * blink), 0.0, 1.52),
                leftEyeScaleX: 1.06 + errorShock(age) * 0.16,
                rightEyeScaleX: 1.06 + errorShock(age) * 0.16,
                leftEyeRotation: -0.085,
                rightEyeRotation: 0.085,
                eyeGlow: 0.88,
                gaze: hasUserGaze ? userGaze : vec(0, 0.08),
                orbitRotation: 0,
                orbitOpacity: 0.36,
                glow: 0.94,
                starPulse: 0.10,
                accentStrength: 0.96,
                errorMorph: morph,
            });
        }
        case 'offline': {
            const droop = reducedMotion ? 0.0 : Math.sin(t * 1.15) * 0.5 + 0.5;
            return pose({
                bodyScaleX: 1.018 + droop * 0.008,
                bodyScaleY: 0.970 + droop * 0.006,
                bodyRotation: -0.025,
                bodyDy: reducedMotion ? 0.010 : 0.012 + float * 0.003,
                bodySkewX: -0.010,
                bodyPuff: 0.20,
                bodyPinch: -0.08,
                bodyBend: -0.10,
                bodyTurn: -0.035,
                faceDepth: 0.20,
                leftEyeOpen: clamp((0.48 * blink), 0.0, 1.08),
                rightEyeOpen: clamp((0.52 * blink), 0.0, 1.08),
                leftEyeScaleX: 1.03,
                rightEyeScaleX: 1.03,
                leftEyeRotation: 0.030,
                rightEyeRotation: -0.030,
                leftEyeDy: 0.006,
                rightEyeDy: 0.006,
                eyeGlow: 0.64,
                gaze: hasUserGaze ? userGaze : vec(0, 0.28),
                orbitRotation: 0,
                orbitOpacity: 0.18,
                glow: 0.63,
                desaturation: 0.42,
                accentStrength: 0.44,
            });
        }
        case 'reconnecting': {
            const pulse = reducedMotion ? 0.2 : wavePulse(t, 1.25);
            const scan = reducedMotion ? 0.0 : Math.sin(t * 2.2);
            const morph = reducedMotion ? 1.0 : morphIn(age, 0.72);
            return pose({
                bodyScaleX: 0.994 + pulse * 0.013,
                bodyScaleY: 1.008 + pulse * 0.016,
                bodyRotation: scan * 0.012,
                bodyDy: reducedMotion ? 0 : -pulse * 0.005 + float * 0.003,
                bodyPuff: 0.06 + pulse * 0.18,
                bodyPinch: 0.12 - pulse * 0.08,
                bodyBend: scan * 0.16,
                bodyWave: scan * 0.07,
                bodyWavePhase: t * 2.0,
                bodyTurn: scan * 0.024,
                faceDepth: 0.34,
                leftEyeOpen: clamp((0.92 * blink), 0.0, 1.08),
                rightEyeOpen: clamp((0.96 * blink), 0.0, 1.08),
                leftEyeScaleX: 0.98 + pulse * 0.03,
                rightEyeScaleX: 0.98 + pulse * 0.03,
                leftEyeRotation: scan * 0.025,
                rightEyeRotation: scan * 0.025,
                eyeGlow: 0.94 + pulse * 0.20,
                gaze: hasUserGaze ? userGaze : vec(scan * 0.26, -0.08),
                orbitRotation: reducedMotion ? 0.04 : Math.sin(t * 1.15) * 0.075,
                orbitOpacity: 0.78,
                glow: 0.92 + pulse * 0.14,
                starPulse: 0.18 + pulse * 0.32,
                sparkle: 0.08 + pulse * 0.18,
                accentStrength: 0.62,
                signalMorph: morph,
            });
        }
        case 'sleeping': {
            const snooze = reducedMotion ? 0.0 : Math.sin(t * Math.PI * 2 / 5.3);
            return pose({
                bodyScaleX: 1.012 + breath * 0.006,
                bodyScaleY: 0.976 + breath * 0.012,
                bodyRotation: -0.035 + snooze * 0.006,
                bodyDy: reducedMotion ? 0.012 : 0.014 + float * 0.003,
                bodySkewX: -0.010,
                bodyPuff: 0.24 + breath * 0.09,
                bodyPinch: -0.12,
                bodyBend: -0.14 + snooze * 0.035,
                bodyWave: snooze * 0.025,
                bodyWavePhase: t * 0.4,
                bodyTurn: -0.030,
                faceDepth: 0.12,
                leftEyeOpen: 0.055,
                rightEyeOpen: 0.055,
                leftEyeScaleX: 1.08,
                rightEyeScaleX: 1.08,
                leftEyeRotation: 0.035,
                rightEyeRotation: -0.035,
                leftEyeDy: 0.007,
                rightEyeDy: 0.007,
                eyeGlow: 0.60,
                gaze: vec(0, 0.20),
                orbitRotation: 0,
                orbitOpacity: 0.14,
                glow: 0.68,
                starPulse: reducedMotion ? 0.0 : wavePulse(t, 4.0) * 0.10,
                desaturation: 0.16,
                accentStrength: 0.34,
            });
        }
        case 'wink': {
            // A staged social gesture: glance -> head follow -> eyelid close -> tiny
            // cheek bounce -> relaxed recovery. It loops slowly so it never looks mechanical.
            const phase = reducedMotion ? 2.4 : age % 3.4;
            const winkClose = reducedMotion ? 0.0 : winkGestureOpen(phase);
            const winkBeat = reducedMotion ? 0.0 : winkGestureBeat(phase);
            const follow = reducedMotion ? 0.0 : winkHeadFollow(phase);
            return pose({
                bodyScaleX: 1.004 + winkBeat * 0.010,
                bodyScaleY: 1.006 + winkBeat * 0.014,
                bodyRotation: -0.010 - follow * 0.030 + winkBeat * 0.010,
                bodyDy: -winkBeat * 0.006,
                bodyPuff: 0.10 + winkBeat * 0.10,
                bodyPinch: -0.025,
                bodyBend: -follow * 0.070,
                bodyWave: winkBeat * 0.025,
                bodyWavePhase: phase * 2.0,
                bodyTurn: -follow * 0.070,
                faceDepth: 0.24 + winkBeat * 0.08,
                leftEyeOpen: clamp((winkClose * blink), 0.045, 1.12),
                rightEyeOpen: clamp((1.04 + winkBeat * 0.12), 0.0, 1.22),
                leftEyeScaleX: 1.12,
                rightEyeScaleX: 1.05 + winkBeat * 0.025,
                leftEyeRotation: 0.045 + follow * 0.018,
                rightEyeRotation: -0.020 - follow * 0.010,
                leftEyeDy: 0.004 + winkBeat * 0.0015,
                rightEyeDy: -0.001 - winkBeat * 0.0015,
                eyeGlow: 1.06 + winkBeat * 0.12,
                gaze: hasUserGaze ? userGaze : vec(0.10 + follow * 0.05, -0.015),
                orbitRotation: reducedMotion ? 0 : Math.sin(t * 0.25) * 0.012,
                orbitOpacity: 0.50,
                glow: 1.02 + winkBeat * 0.05,
                starPulse: winkBeat * 0.22,
                sparkle: winkBeat * 0.18,
            });
        }
        case 'smile': {
            const smile = reducedMotion ? 1.0 : 0.92 + wavePulse(t, 3.4) * 0.08;
            return pose({
                bodyScaleX: 1.018,
                bodyScaleY: 1.020,
                bodyDy: reducedMotion ? 0 : float * 0.0035 - 0.003,
                bodyPuff: 0.34,
                bodyPinch: -0.12,
                bodyBend: resolvedGaze.x * 0.075,
                faceDepth: 0.36,
                leftEyeOpen: clamp((0.28 * blink), 0.055, 0.34),
                rightEyeOpen: clamp((0.28 * blink), 0.055, 0.34),
                leftEyeScaleX: 1.26,
                rightEyeScaleX: 1.26,
                leftEyeRotation: 0.035,
                rightEyeRotation: -0.035,
                leftEyeSmile: 1.0,
                rightEyeSmile: 1.0,
                leftEyeDy: 0.004,
                rightEyeDy: 0.004,
                eyeGlow: 1.28,
                gaze: hasUserGaze ? userGaze : vec(0, -0.03),
                orbitOpacity: 0.72,
                glow: 1.16,
                starPulse: 0.30 * smile,
                sparkle: 0.22,
                starSpread: 0.10,
                accentStrength: 0.34,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.mint, 0.24),
            });
        }
        case 'greeting': {
            const phase = reducedMotion ? 0.48 : (age % 2.10) / 2.10;
            const envelope = clamp(Math.sin(Math.PI * phase), 0.0, 1.0);
            const wave = reducedMotion ? 0.0 : Math.sin(phase * Math.PI * 3.6) * envelope;
            const lift = reducedMotion ? 0.0 : Math.sin(Math.PI * phase);
            const eyeLift = reducedMotion ? 1.28 : 1.28 + lift * 0.18;
            return pose({
                bodyScaleX: 1.010 - lift * 0.018,
                bodyScaleY: 1.012 + lift * 0.034,
                bodyRotation: wave * 0.078,
                bodyDx: wave * 0.014,
                bodyDy: -lift * 0.014,
                bodyPuff: 0.18 + lift * 0.22,
                bodyPinch: -0.04 - lift * 0.04,
                bodyBend: wave * 0.25,
                bodyWave: wave * 0.10,
                bodyWavePhase: phase * 5.6,
                bodyTurn: wave * 0.105,
                faceDepth: 0.42,
                leftEyeOpen: clamp((eyeLift * blink), 0.0, 1.54),
                rightEyeOpen: clamp((eyeLift * blink), 0.0, 1.54),
                leftEyeScaleX: 1.13,
                rightEyeScaleX: 1.13,
                leftEyeRotation: wave * 0.032,
                rightEyeRotation: wave * 0.032,
                leftEyeSmile: 0.12 * (1 - lift),
                rightEyeSmile: 0.12 * (1 - lift),
                eyeGlow: 1.30,
                gaze: hasUserGaze ? userGaze : vec(wave * 0.32, -0.10 - lift * 0.04),
                orbitRotation: wave * 0.050,
                orbitOpacity: 0.82,
                glow: 1.18,
                starPulse: 0.30 + lift * 0.34,
                sparkle: 0.20 + lift * 0.32,
                starSpread: 0.13 + lift * 0.10,
                accentStrength: 0.34,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.cyan, 0.22),
            });
        }
        case 'curious': {
            const inspect = reducedMotion ? 0.60 : Math.sin(t * 1.15) * 0.5 + 0.5;
            return pose({
                bodyScaleX: 1.006,
                bodyScaleY: 1.020,
                bodyRotation: -0.070 + inspect * 0.014,
                bodyDy: -0.007,
                bodyPuff: 0.18,
                bodyPinch: 0.05,
                bodyBend: -0.24,
                bodyTurn: -0.095,
                faceDepth: 0.46,
                leftEyeOpen: clamp((1.08 * blink), 0.0, 1.30),
                rightEyeOpen: clamp((1.48 * blink), 0.0, 1.56),
                leftEyeScaleX: 0.98,
                rightEyeScaleX: 1.15,
                leftEyeRotation: -0.060,
                rightEyeRotation: 0.032,
                leftEyeSmile: -0.10,
                rightEyeSmile: 0.08,
                leftEyeDx: -0.002,
                rightEyeDx: 0.002,
                eyeGlow: 1.24,
                gaze: hasUserGaze ? userGaze : vec(0.42, -0.22),
                orbitOpacity: 0.74,
                glow: 1.10,
                starPulse: 0.20 + inspect * 0.20,
                sparkle: 0.10,
                starSpread: 0.08 + inspect * 0.05,
                accentStrength: 0.24,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.cyan, 0.16),
            });
        }
        case 'peeking': {
            const local = reducedMotion ? 0.9 : age % 2.35;
            const peek = reducedMotion
                ? 0.78
                : clamp(Math.sin(clamp((local / 2.35), 0.0, 1.0) * Math.PI), 0.0, 1.0);
            const curiousBlink = reducedMotion
                ? 1.0
                : singleBlink(local - 0.78, 0.22);
            const gx = resolvedGaze.x;
            const gy = resolvedGaze.y;
            const verticalPeek = Math.abs(gy) > Math.max(0.13, Math.abs(gx) * 1.05);
            const horizontalSide = Math.abs(gx) < 0.08 ? 1.0 : Math.sign(gx);
            const verticalSide = Math.abs(gy) < 0.08 ? -1.0 : Math.sign(gy);
            if (verticalPeek) {
                const fromBelow = verticalSide < 0;
                const lift = 0.010 + peek * (fromBelow ? 0.020 : 0.016);
                const sway = reducedMotion ? 0.0 : Math.sin(t * 2.2) * 0.012;
                return pose({
                    bodyScaleX: (fromBelow ? 0.982 : 1.008) + peek * 0.012,
                    bodyScaleY: (fromBelow ? 1.032 : 1.018) + peek * 0.025,
                    bodyRotation: sway + horizontalSide * (fromBelow ? -0.010 : 0.014),
                    bodyDx: horizontalSide * 0.003 * peek,
                    bodyDy: verticalSide * lift,
                    bodyPuff: 0.14 + peek * 0.13,
                    bodyPinch: fromBelow ? 0.055 : 0.025,
                    bodyBend: verticalSide * (0.14 + peek * 0.10),
                    bodyTurn: horizontalSide * 0.035,
                    faceDepth: fromBelow ? 0.56 : 0.50,
                    leftEyeOpen: clamp((1.30 * curiousBlink), 0.06, 1.48),
                    rightEyeOpen: clamp((1.42 * curiousBlink), 0.06, 1.58),
                    leftEyeScaleX: 1.08,
                    rightEyeScaleX: 1.13,
                    leftEyeRotation: horizontalSide * -0.018,
                    rightEyeRotation: horizontalSide * 0.018,
                    leftEyeSmile: 0.05,
                    rightEyeSmile: 0.13,
                    eyeGlow: 1.34,
                    gaze: hasUserGaze ? userGaze : vec(horizontalSide * 0.10, verticalSide * 0.60),
                    orbitOpacity: 0.66,
                    glow: 1.12,
                    starPulse: 0.18 + peek * 0.18,
                    sparkle: 0.11 + peek * 0.10,
                    starSpread: fromBelow ? 0.025 + peek * 0.035 : 0.05 + peek * 0.05,
                    accentStrength: 0.26,
                    accentColor: mixColor(ACCENTS.lavender, ACCENTS.cyan, 0.18),
                });
            }
            return pose({
                bodyScaleX: 0.988 + peek * 0.020,
                bodyScaleY: 1.010 + peek * 0.018,
                bodyRotation: horizontalSide * (-0.048 - peek * 0.028),
                bodyDx: horizontalSide * (0.007 + peek * 0.014),
                bodyDy: -0.004 - peek * 0.004,
                bodyPuff: 0.13 + peek * 0.12,
                bodyPinch: 0.04,
                bodyBend: horizontalSide * (-0.20 - peek * 0.12),
                bodyTurn: horizontalSide * (-0.09 - peek * 0.060),
                faceDepth: 0.50,
                leftEyeOpen: clamp((1.18 * curiousBlink), 0.06, 1.40),
                rightEyeOpen: clamp((1.42 * curiousBlink), 0.06, 1.56),
                leftEyeScaleX: 1.02,
                rightEyeScaleX: 1.14,
                leftEyeRotation: -0.035 * horizontalSide,
                rightEyeRotation: 0.025 * horizontalSide,
                leftEyeSmile: 0.03,
                rightEyeSmile: 0.12,
                eyeGlow: 1.30,
                gaze: hasUserGaze ? userGaze : vec(0.52 * horizontalSide, -0.12),
                orbitOpacity: 0.68,
                glow: 1.10,
                starPulse: 0.16 + peek * 0.16,
                sparkle: 0.10 + peek * 0.09,
                starSpread: 0.04 + peek * 0.05,
                accentStrength: 0.24,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.cyan, 0.15),
            });
        }
        case 'eyeContact': {
            const contactPulse = reducedMotion ? 0.45 : wavePulse(t, 2.7);
            const contactBlink = reducedMotion
                ? 1.0
                : singleBlink((age % 3.1) - 1.75, 0.19);
            return pose({
                bodyScaleX: 1.008 + contactPulse * 0.006,
                bodyScaleY: 1.016 - contactPulse * 0.004,
                bodyRotation: Math.sin(t * 0.65) * 0.010,
                bodyDy: -0.004 + float * 0.002,
                bodyPuff: 0.16 + contactPulse * 0.08,
                bodyPinch: -0.04,
                bodyBend: Math.sin(t * 0.48) * 0.045,
                bodyTurn: 0,
                faceDepth: 0.44,
                leftEyeOpen: clamp((1.22 * contactBlink), 0.05, 1.40),
                rightEyeOpen: clamp((1.22 * contactBlink), 0.05, 1.40),
                leftEyeScaleX: 1.10,
                rightEyeScaleX: 1.10,
                leftEyeSmile: 0.12,
                rightEyeSmile: 0.12,
                eyeGlow: 1.28,
                gaze: vec(0, -0.015),
                orbitOpacity: 0.70,
                glow: 1.12,
                starPulse: 0.12 + contactPulse * 0.10,
                sparkle: 0.08,
                starSpread: 0.07,
                accentStrength: 0.16,
            });
        }
        case 'doubleTake': {
            const local = reducedMotion ? 0.5 : age % 1.55;
            const snap = reducedMotion
                ? 0.0
                : Math.sin((local / 1.55) * Math.PI * 2.0) *
                    Math.exp(-local * 0.75);
            const wide = clamp((0.5 + 0.5 * Math.cos(local * Math.PI * 2.6)), 0.0, 1.0);
            return pose({
                bodyScaleX: 1.006 + wide * 0.012,
                bodyScaleY: 1.010 - wide * 0.006,
                bodyRotation: snap * 0.050,
                bodyDx: snap * 0.008,
                bodyPuff: 0.14 + wide * 0.16,
                bodyBend: snap * 0.18,
                bodyTurn: snap * 0.10,
                faceDepth: 0.48,
                leftEyeOpen: clamp((1.18 + wide * 0.16), 0.0, 1.48),
                rightEyeOpen: clamp((1.24 + wide * 0.18), 0.0, 1.52),
                leftEyeScaleX: 1.08,
                rightEyeScaleX: 1.11,
                leftEyeRotation: snap * 0.025,
                rightEyeRotation: snap * 0.025,
                eyeGlow: 1.30,
                gaze: hasUserGaze ? userGaze : vec(snap * 0.52, -0.06),
                orbitOpacity: 0.72,
                glow: 1.12,
                starPulse: 0.18 + wide * 0.18,
                sparkle: 0.18,
                starSpread: 0.09,
                accentStrength: 0.20,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.cyan, 0.12),
            });
        }
        case 'glanceBack': {
            const glance = reducedMotion ? 0.72 : positiveKick(age, 1.25);
            const side = Math.abs(resolvedGaze.x) < 0.08
                ? -1.0
                : Math.sign(resolvedGaze.x);
            return pose({
                bodyScaleX: 1.004,
                bodyScaleY: 1.012,
                bodyRotation: -side * 0.028 * glance,
                bodyDx: -side * 0.004 * glance,
                bodyPuff: 0.12,
                bodyBend: -side * 0.13 * glance,
                bodyTurn: -side * 0.12 * glance,
                faceDepth: 0.40,
                leftEyeOpen: clamp((1.12 * blink), 0.0, 1.32),
                rightEyeOpen: clamp((1.12 * blink), 0.0, 1.32),
                leftEyeScaleX: 1.08,
                rightEyeScaleX: 1.08,
                leftEyeRotation: -side * 0.020,
                rightEyeRotation: -side * 0.020,
                eyeGlow: 1.20,
                gaze: hasUserGaze ? userGaze : vec(-side * 0.58, -0.03),
                orbitOpacity: 0.64,
                glow: 1.06,
                starPulse: 0.14 * glance,
                sparkle: 0.08,
                starSpread: 0.05,
                accentStrength: 0.10,
            });
        }
        case 'happy': {
            const bounce = reducedMotion ? 0.0 : danceBounce(t) * 0.48;
            return pose({
                bodyScaleX: 1.018 + bounce * 0.028,
                bodyScaleY: 1.010 + bounce * 0.040,
                bodyDy: -Math.abs(bounce) * 0.019 - 0.003,
                bodyPuff: 0.36 + Math.abs(bounce) * 0.18,
                bodyPinch: -0.14,
                bodyBend: Math.sin(t * 1.8) * 0.10,
                faceDepth: 0.38,
                leftEyeOpen: clamp((0.25 * blink), 0.055, 0.32),
                rightEyeOpen: clamp((0.25 * blink), 0.055, 0.32),
                leftEyeScaleX: 1.28,
                rightEyeScaleX: 1.28,
                leftEyeRotation: 0.040,
                rightEyeRotation: -0.040,
                leftEyeSmile: 1.12,
                rightEyeSmile: 1.12,
                eyeGlow: 1.34,
                gaze: hasUserGaze ? userGaze : vec(0, 0),
                orbitOpacity: 0.78,
                glow: 1.22,
                starPulse: 0.38 + Math.abs(bounce) * 0.30,
                sparkle: 0.34 + Math.abs(bounce) * 0.26,
                starSpread: 0.20 + Math.abs(bounce) * 0.08,
                accentStrength: 0.46,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.mint, 0.30),
            });
        }
        case 'surprise': {
            const shock = reducedMotion ? 0.72 : positiveKick(age, 0.88);
            const recoil = reducedMotion ? 0.0 : Math.sin(age * 10.8) * Math.exp(-age * 4.8);
            return pose({
                bodyScaleX: 1.0 + shock * 0.050,
                bodyScaleY: 1.0 - shock * 0.040,
                bodyDy: -shock * 0.018,
                bodyRotation: recoil * 0.028,
                bodyPuff: 0.14 + shock * 0.30,
                bodyPinch: shock * 0.11,
                bodyBend: recoil * 0.20,
                bodyTurn: recoil * 0.075,
                faceDepth: 0.50,
                leftEyeOpen: clamp((1.34 + shock * 0.24), 0.0, 1.58),
                rightEyeOpen: clamp((1.34 + shock * 0.24), 0.0, 1.58),
                leftEyeScaleX: 0.94,
                rightEyeScaleX: 0.94,
                leftEyeSmile: -0.10,
                rightEyeSmile: -0.10,
                eyeGlow: 1.38,
                gaze: hasUserGaze ? userGaze : vec(0, -0.05),
                orbitOpacity: 0.86,
                glow: 1.22 + shock * 0.14,
                starPulse: 0.34 + shock * 0.30,
                sparkle: 0.36 + shock * 0.36,
                starSpread: 0.28 * shock,
                accentStrength: 0.42,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.cyan, 0.26),
            });
        }
        case 'nodding': {
            const nod = reducedMotion ? 0.0 : Math.sin(age * Math.PI * 3.0) * Math.exp(-age * 0.48);
            const down = Math.max(0.0, nod);
            return pose({
                bodyScaleX: 1.006 - Math.abs(nod) * 0.010,
                bodyScaleY: 1.010 + Math.abs(nod) * 0.018,
                bodyDy: nod * 0.018,
                bodyPuff: 0.15,
                bodyBend: nod * 0.13,
                faceDepth: 0.32,
                leftEyeOpen: clamp(((1.08 - down * 0.26) * blink), 0.0, 1.28),
                rightEyeOpen: clamp(((1.08 - down * 0.26) * blink), 0.0, 1.28),
                leftEyeSmile: down * 0.20,
                rightEyeSmile: down * 0.20,
                leftEyeDy: nod * 0.003,
                rightEyeDy: nod * 0.003,
                eyeGlow: 1.12,
                gaze: hasUserGaze ? userGaze : vec(0, -0.08),
                orbitOpacity: 0.68,
                glow: 1.08,
                starPulse: Math.abs(nod) * 0.22,
                starSpread: Math.abs(nod) * 0.06,
                accentStrength: 0.12,
            });
        }
        case 'shaking': {
            const no = reducedMotion ? 0.0 : Math.sin(age * Math.PI * 3.2) * Math.exp(-age * 0.50);
            return pose({
                bodyScaleX: 1.010,
                bodyScaleY: 1.004,
                bodyRotation: no * 0.070,
                bodyDx: no * 0.014,
                bodyPuff: 0.11,
                bodyBend: no * 0.21,
                bodyTurn: no * 0.105,
                faceDepth: 0.34,
                leftEyeOpen: clamp((0.74 * blink), 0.0, 1.02),
                rightEyeOpen: clamp((0.74 * blink), 0.0, 1.02),
                leftEyeScaleX: 1.06,
                rightEyeScaleX: 1.06,
                leftEyeRotation: -0.055 + no * 0.028,
                rightEyeRotation: 0.055 + no * 0.028,
                leftEyeSmile: -0.38,
                rightEyeSmile: -0.38,
                eyeGlow: 1.02,
                gaze: hasUserGaze ? userGaze : vec(no * 0.26, 0.03),
                orbitOpacity: 0.58,
                glow: 1.0,
                starPulse: Math.abs(no) * 0.18,
                starSpread: -0.05,
                accentStrength: 0.18,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.rose, 0.10),
            });
        }
        case 'concerned': {
            const worry = reducedMotion ? 0.58 : 0.54 + Math.sin(t * 1.65) * 0.08;
            const tremble = reducedMotion ? 0.0 : Math.sin(t * 4.2) * 0.010;
            return pose({
                bodyScaleX: 1.018,
                bodyScaleY: 0.982,
                bodyRotation: -0.020 + tremble,
                bodyDy: 0.010,
                bodyPuff: 0.24,
                bodyPinch: -0.14,
                bodyBend: -0.12,
                bodyTurn: -0.035,
                faceDepth: 0.28,
                leftEyeOpen: clamp((0.66 * blink), 0.08, 0.82),
                rightEyeOpen: clamp((0.72 * blink), 0.08, 0.88),
                leftEyeScaleX: 1.16,
                rightEyeScaleX: 1.16,
                leftEyeRotation: -0.050,
                rightEyeRotation: 0.050,
                leftEyeSmile: -0.74,
                rightEyeSmile: -0.74,
                leftEyeDy: 0.005,
                rightEyeDy: 0.005,
                eyeGlow: 0.92,
                gaze: hasUserGaze ? userGaze : vec(0.02, 0.16),
                orbitOpacity: 0.44,
                glow: 0.88,
                starPulse: 0.08 + worry * 0.08,
                starSpread: -0.18,
                sparkle: 0.02,
                desaturation: 0.06,
                accentStrength: 0.34,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.sleepy, 0.30),
            });
        }
        case 'relieved': {
            const release = reducedMotion ? 1.0 : clamp((1 - Math.exp(-age * 2.5)), 0.0, 1.0);
            const exhale = reducedMotion ? 0.0 : Math.sin(Math.min(1.0, age / 1.25) * Math.PI);
            return pose({
                bodyScaleX: 1.010 + release * 0.022,
                bodyScaleY: 1.018 - exhale * 0.025,
                bodyDy: 0.006 + exhale * 0.008 - release * 0.008,
                bodyRotation: -0.010 + Math.sin(t * 0.9) * 0.006,
                bodyPuff: 0.22 + release * 0.18,
                bodyPinch: -0.16,
                bodyBend: -0.04,
                faceDepth: 0.34,
                leftEyeOpen: clamp(((0.22 + (1 - release) * 0.18) * blink), 0.055, 0.46),
                rightEyeOpen: clamp(((0.22 + (1 - release) * 0.18) * blink), 0.055, 0.46),
                leftEyeScaleX: 1.30,
                rightEyeScaleX: 1.30,
                leftEyeRotation: 0.032,
                rightEyeRotation: -0.032,
                leftEyeSmile: 1.18,
                rightEyeSmile: 1.18,
                eyeGlow: 1.20,
                gaze: hasUserGaze ? userGaze : vec(0, -0.02),
                orbitOpacity: 0.64,
                glow: 1.10 + release * 0.08,
                starPulse: 0.18 + release * 0.18,
                starSpread: -0.04 + release * 0.10,
                sparkle: release * 0.16,
                accentStrength: 0.40,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.mint, 0.28),
            });
        }
        case 'confused': {
            const question = reducedMotion ? 0.45 : Math.sin(t * 1.35) * 0.5 + 0.5;
            const tilt = -0.075 + question * 0.095;
            return pose({
                bodyScaleX: 1.005,
                bodyScaleY: 1.018,
                bodyRotation: tilt,
                bodyDy: -0.005,
                bodyPuff: 0.18,
                bodyPinch: 0.04,
                bodyBend: tilt * 2.3,
                bodyWave: (question - 0.5) * 0.06,
                bodyWavePhase: t * 1.4,
                bodyTurn: tilt * 1.15,
                faceDepth: 0.46,
                leftEyeOpen: clamp(((0.58 + question * 0.24) * blink), 0.08, 0.96),
                rightEyeOpen: clamp(((1.34 - question * 0.18) * blink), 0.60, 1.52),
                leftEyeScaleX: 1.12,
                rightEyeScaleX: 0.98,
                leftEyeRotation: -0.075,
                rightEyeRotation: 0.040,
                leftEyeSmile: -0.42,
                rightEyeSmile: 0.16,
                leftEyeDy: 0.004,
                rightEyeDy: -0.002,
                eyeGlow: 1.20,
                gaze: hasUserGaze ? userGaze : vec(0.34 - question * 0.12, -0.16),
                orbitRotation: (question - 0.5) * 0.026,
                orbitOpacity: 0.70,
                glow: 1.08,
                starPulse: 0.16 + question * 0.18,
                starSpread: 0.04 + question * 0.08,
                sparkle: 0.08,
                accentStrength: 0.30,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.cyan, 0.20),
            });
        }
        case 'skeptical': {
            const side = reducedMotion ? 0.72 : 0.68 + Math.sin(t * 0.85) * 0.10;
            return pose({
                bodyScaleX: 1.010,
                bodyScaleY: 1.000,
                bodyRotation: 0.045,
                bodyDx: 0.004,
                bodyPuff: 0.12,
                bodyPinch: -0.04,
                bodyBend: 0.18,
                bodyTurn: 0.080,
                faceDepth: 0.40,
                leftEyeOpen: clamp((0.46 * blink), 0.06, 0.58),
                rightEyeOpen: clamp((1.03 * blink), 0.40, 1.22),
                leftEyeScaleX: 1.18,
                rightEyeScaleX: 1.03,
                leftEyeRotation: -0.065,
                rightEyeRotation: 0.015,
                leftEyeSmile: -0.62,
                rightEyeSmile: -0.06,
                leftEyeDy: 0.005,
                rightEyeDy: -0.001,
                eyeGlow: 1.06,
                gaze: hasUserGaze ? userGaze : vec(side, 0.02),
                orbitOpacity: 0.56,
                glow: 1.00,
                starPulse: 0.10,
                starSpread: -0.03,
                sparkle: 0.03,
                accentStrength: 0.16,
            });
        }
        case 'proud': {
            const lift = reducedMotion ? 0.7 : 0.64 + wavePulse(t, 2.8) * 0.24;
            return pose({
                bodyScaleX: 0.992,
                bodyScaleY: 1.040 + lift * 0.018,
                bodyRotation: -0.012,
                bodyDy: -0.014 - lift * 0.006,
                bodyPuff: 0.28,
                bodyPinch: -0.08,
                bodyBend: 0.04,
                faceDepth: 0.42,
                leftEyeOpen: clamp((0.30 * blink), 0.055, 0.38),
                rightEyeOpen: clamp((0.30 * blink), 0.055, 0.38),
                leftEyeScaleX: 1.28,
                rightEyeScaleX: 1.28,
                leftEyeRotation: 0.040,
                rightEyeRotation: -0.040,
                leftEyeSmile: 1.08,
                rightEyeSmile: 1.08,
                eyeGlow: 1.32,
                gaze: hasUserGaze ? userGaze : vec(0, -0.16),
                orbitOpacity: 0.82,
                glow: 1.22,
                starPulse: 0.34 + lift * 0.22,
                starSpread: 0.26,
                sparkle: 0.34,
                accentStrength: 0.46,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.celebration, 0.20),
            });
        }
        case 'petted': {
            const pet = reducedMotion ? 0.70 : Math.sin(Math.min(1.0, age / 1.35) * Math.PI);
            const wiggle = reducedMotion ? 0.0 : Math.sin(age * 9.2) * Math.exp(-age * 2.6);
            return pose({
                bodyScaleX: 1.030 + pet * 0.030,
                bodyScaleY: 0.986 + pet * 0.015,
                bodyRotation: wiggle * 0.018,
                bodyDy: 0.004 - pet * 0.010,
                bodyPuff: 0.42 + pet * 0.20,
                bodyPinch: -0.18,
                bodyBend: wiggle * 0.10,
                faceDepth: 0.38,
                leftEyeOpen: clamp((0.20 * blink), 0.05, 0.28),
                rightEyeOpen: clamp((0.20 * blink), 0.05, 0.28),
                leftEyeScaleX: 1.34,
                rightEyeScaleX: 1.34,
                leftEyeRotation: 0.050,
                rightEyeRotation: -0.050,
                leftEyeSmile: 1.24,
                rightEyeSmile: 1.24,
                leftEyeDy: 0.005,
                rightEyeDy: 0.005,
                eyeGlow: 1.38,
                gaze: hasUserGaze ? userGaze : vec(0, -0.02),
                orbitOpacity: 0.82,
                glow: 1.28,
                starPulse: 0.40 + pet * 0.32,
                sparkle: 0.38 + pet * 0.24,
                starSpread: 0.26 + pet * 0.08,
                accentStrength: 0.50,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.mint, 0.34),
            });
        }
        case 'pickedUp': {
            const lift = reducedMotion ? 0.74 : clamp((1 - Math.exp(-age * 6.0)), 0.0, 1.0);
            const suspended = reducedMotion ? 0.0 : Math.sin(t * 2.8) * 0.006;
            return pose({
                bodyScaleX: 1.045,
                bodyScaleY: 0.958,
                bodyRotation: resolvedGaze.x * 0.032,
                bodyDy: -0.020 - lift * 0.010 + suspended,
                bodyPuff: 0.30,
                bodyPinch: -0.08,
                bodyBend: resolvedGaze.x * 0.16,
                bodyTurn: resolvedGaze.x * 0.070,
                faceDepth: 0.48,
                leftEyeOpen: clamp((1.30 * blink), 0.0, 1.52),
                rightEyeOpen: clamp((1.30 * blink), 0.0, 1.52),
                leftEyeScaleX: 1.04,
                rightEyeScaleX: 1.04,
                leftEyeSmile: -0.06,
                rightEyeSmile: -0.06,
                eyeGlow: 1.34,
                gaze: hasUserGaze ? userGaze : vec(0, -0.38),
                orbitOpacity: 0.78,
                glow: 1.20,
                starPulse: 0.28,
                sparkle: 0.20,
                starSpread: 0.20,
                accentStrength: 0.34,
                accentColor: mixColor(ACCENTS.lavender, ACCENTS.cyan, 0.22),
            });
        }
        case 'wakeStretch': {
            const stretch = reducedMotion ? 0.76 : Math.sin(Math.min(1.0, age / 1.55) * Math.PI);
            const awake = reducedMotion ? 1.0 : clamp((1 - Math.exp(-age * 3.6)), 0.0, 1.0);
            return pose({
                bodyScaleX: 1.018 - stretch * 0.075,
                bodyScaleY: 1.0 + stretch * 0.125,
                bodyRotation: -0.020 + Math.sin(age * 2.6) * 0.012,
                bodyDy: -stretch * 0.026,
                bodyPuff: 0.18 + awake * 0.16,
                bodyPinch: stretch * 0.12,
                bodyBend: -0.08 + stretch * 0.12,
                faceDepth: 0.34,
                leftEyeOpen: clamp(((0.22 + awake * 0.96) * blink), 0.05, 1.28),
                rightEyeOpen: clamp(((0.26 + awake * 0.94) * blink), 0.05, 1.28),
                leftEyeScaleX: 1.10,
                rightEyeScaleX: 1.10,
                leftEyeSmile: 0.28 * stretch,
                rightEyeSmile: 0.28 * stretch,
                eyeGlow: 0.82 + awake * 0.38,
                gaze: hasUserGaze ? userGaze : vec(0, -0.10),
                orbitOpacity: 0.38 + awake * 0.34,
                glow: 0.84 + awake * 0.28,
                starPulse: 0.10 + awake * 0.22,
                starSpread: -0.10 + awake * 0.12,
                sparkle: awake * 0.12,
                accentStrength: 0.18,
            });
        }
        case 'drowsy': {
            const nod = reducedMotion ? 0.0 : Math.max(0.0, Math.sin(t * Math.PI * 2 / 3.4));
            return pose({
                bodyScaleX: 1.010,
                bodyScaleY: 0.986,
                bodyRotation: -0.025 - nod * 0.020,
                bodyDy: 0.008 + nod * 0.006,
                bodyPuff: 0.22,
                bodyPinch: -0.10,
                bodyBend: -0.10 - nod * 0.08,
                bodyTurn: -0.025,
                faceDepth: 0.18,
                leftEyeOpen: clamp((0.34 * blink), 0.05, 0.42),
                rightEyeOpen: clamp((0.38 * blink), 0.05, 0.46),
                leftEyeScaleX: 1.08,
                rightEyeScaleX: 1.08,
                leftEyeDy: 0.006,
                rightEyeDy: 0.006,
                eyeGlow: 0.72,
                gaze: vec(0, 0.16),
                orbitOpacity: 0.26,
                glow: 0.76,
                starPulse: 0.05,
                desaturation: 0.10,
                accentStrength: 0.30,
            });
        }
        case 'lament': {
            const release = reducedMotion ? 1 : smoothstep(age / 2.8);
            const settling = reducedMotion ? 0 : Math.sin(age * 6.4) * Math.exp(-age * 2.8);
            const breathPulse = reducedMotion ? 0 : lamentBreathPulse(age);
            const breathMotion = reducedMotion ? 0 : breathPulse * .0011;
            const deepExhale = reducedMotion ? 0 : oneShot(age, 2.55, .16, .90);
            const gesture = reducedMotion ? 0 : curiosity;
            const leftBlink = reducedMotion ? 1 : lamentBlinkOpen(age);
            const rightBlink = reducedMotion ? 1 : lamentBlinkOpen(age, .07);
            return pose({
                bodyScaleX: 1 - breathPulse * .004,
                bodyScaleY: 1 + breathPulse * .009,
                bodyPuff: .10 + breathPulse * .18,
                bodyPinch: .018 + breathPulse * .030,
                bodyBend: resolvedGaze.x * .040 + gesture * .012 + settling * .012,
                bodyWave: breathPulse * .012,
                bodyWavePhase: t * .78,
                bodyRotation: -.026 + release * .013 + settling * .0035 + breathMotion + deepExhale * .001,
                bodyDy: -.004 + release * .010 + breathMotion + deepExhale * .002 + settling * .001 + gesture * .001,
                leftEyeOpen: clamp((.56 - release * .025) * leftBlink, .05, .68),
                rightEyeOpen: clamp((.60 - release * .025) * rightBlink, .05, .72),
                leftEyeRotation: -.018,
                rightEyeRotation: .014,
                leftEyeSmile: -.38,
                rightEyeSmile: -.34,
                leftEyeDy: breathPulse * .0009,
                rightEyeDy: breathPulse * .0011,
                eyeGlow: .84,
                gaze: hasUserGaze ? userGaze : vec(.03, .20 + release * .02),
                orbitRotation: 0,
                orbitOpacity: .34,
                glow: .92,
                starPulse: 0,
                sparkle: 0,
                desaturation: .06,
                accentStrength: .10,
            });
        }
        case 'settling': {
            const settle = reducedMotion ? 0.0 : Math.sin(age * 12.5) * Math.exp(-age * 5.0);
            const impact = reducedMotion ? 0.0 : Math.exp(-age * 5.8);
            return pose({
                bodyScaleX: 1.0 + impact * 0.060 - settle * 0.012,
                bodyScaleY: 1.0 - impact * 0.050 + settle * 0.018,
                bodyDy: impact * 0.010 - Math.abs(settle) * 0.003,
                bodyRotation: settle * 0.012,
                bodyPuff: 0.12 + impact * 0.18,
                bodyPinch: -impact * 0.06,
                bodyBend: settle * 0.08,
                faceDepth: 0.26,
                leftEyeOpen: clamp((1.02 * blink), 0.0, 1.18),
                rightEyeOpen: clamp((1.02 * blink), 0.0, 1.18),
                eyeGlow: 1.08,
                gaze: hasUserGaze ? userGaze : vec(0, 0),
                orbitOpacity: 0.62,
                glow: 1.05,
                starPulse: impact * 0.20,
                sparkle: impact * 0.10,
            });
        }
        case 'celebration': {
            const dance = reducedMotion ? 0.0 : Math.sin(t * Math.PI * 2 / 1.58);
            const dance2 = reducedMotion ? 0.0 : Math.sin(t * Math.PI * 2 / 0.79 + Math.PI / 2);
            const bounce = reducedMotion ? 0.08 : danceBounce(t) * 0.72;
            const smile = reducedMotion ? 0.80 : 0.78 + bounce * 0.08;
            return pose({
                bodyScaleX: 1.006 + bounce * 0.026 - dance2 * 0.006,
                bodyScaleY: 1.002 + bounce * 0.035 + dance2 * 0.005,
                bodyRotation: dance * 0.045,
                bodyDx: dance * 0.014,
                bodyDy: -Math.abs(bounce) * 0.022,
                bodySkewX: dance * 0.010,
                bodyPuff: 0.18 + bounce * 0.22,
                bodyPinch: dance2 * 0.10,
                bodyBend: dance * 0.18,
                bodyWave: dance2 * 0.08,
                bodyWavePhase: t * 3.0,
                bodyTurn: dance * 0.085,
                faceDepth: 0.42,
                leftEyeOpen: clamp((smile * blink), 0.0, 1.12),
                rightEyeOpen: clamp(((smile + 0.03 * Math.sin(t * 2.0)) * blink), 0.0, 1.12),
                leftEyeScaleX: 1.05 + dance * 0.015,
                rightEyeScaleX: 1.05 - dance * 0.015,
                leftEyeRotation: 0.040 + dance * 0.025,
                rightEyeRotation: -0.040 + dance * 0.025,
                leftEyeDy: dance2 * 0.0018,
                rightEyeDy: -dance2 * 0.0018,
                eyeGlow: 1.18 + bounce * 0.08,
                gaze: hasUserGaze ? userGaze : vec(dance * 0.10, -0.02 - bounce * 0.025),
                orbitRotation: reducedMotion ? 0.02 : Math.sin(t * 0.38) * 0.028,
                orbitOpacity: 0.68,
                glow: 1.14 + bounce * 0.08,
                starPulse: 0.28 + bounce * 0.36,
                sparkle: reducedMotion ? 0.36 : 0.38 + wavePulse(t, 1.35) * 0.34,
                accentStrength: 0.50,
            });
        }
        default: {
            // Runtime safety net. Semantic audits should make this unreachable, but a bad
            // dynamically-sourced state must never be able to kill the Pixi ticker.
            return pose({ gaze: resolvedGaze, accentColor: ACCENTS.lavender });
        }
    }
}
export const lavenderTransitionSeconds = .44;
export const easedTransition = (secondsSinceChange) => { if (secondsSinceChange <= 0)
    return 0; if (secondsSinceChange >= lavenderTransitionSeconds)
    return 1; const x = secondsSinceChange / lavenderTransitionSeconds; return x * x * x * (x * (x * 6 - 15) + 10); };
