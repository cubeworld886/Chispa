/**
 * WIP35 identity bridge.
 *
 * Lyra POS C18/C19 is the authority for Lavender's frontal anatomy. WIP33 remains
 * the authority for web-only physical movement and the true 90 degree profile.
 *
 * Front-facing web poses below are therefore POS geometry plus WIP33 motion
 * deltas. The profile/arc/approach masters are intentionally NOT recreated here.
 */
import { body as posBodyRaw, leftEyeSocket as posLeftEyeSocketRaw, rightEyeSocket as posRightEyeSocketRaw, leftEyeInner as posLeftEyeInnerRaw, rightEyeInner as posRightEyeInnerRaw, seamCubic as posSeamRaw, rightPetalCubic as posPetalRaw, } from './lavenderGeometry.js';
import { C11_FRONT_BODY, C11_TAKEOFF_BODY, C11_ANTICIPATION_BODY, C11_PROFILE_BODY, C11_PROFILE_ACCEL_BODY, C11_ARC_BODY, C11_HERO_APPROACH_BODY, C11_BRAKE_BODY, C11_LAND_BODY, C11_SQUASH_BODY, C11_BOUNCE_BODY, C11_FRONT_EYE_0, C11_FRONT_EYE_1, C11_TAKEOFF_EYE_0, C11_TAKEOFF_EYE_1, C11_ANTICIPATION_EYE_0, C11_ANTICIPATION_EYE_1, C11_PROFILE_EYE_0, C11_PROFILE_ACCEL_EYE_0, C11_ARC_EYE_0, C11_HERO_APPROACH_EYE_0, C11_BRAKE_EYE_0, C11_BRAKE_EYE_1, C11_LAND_EYE_0, C11_LAND_EYE_1, C11_SQUASH_EYE_0, C11_SQUASH_EYE_1, C11_BOUNCE_EYE_0, C11_BOUNCE_EYE_1, C11_SETTLE_EYE_0, C11_SETTLE_EYE_1, C11_FRONT_SEAM, C11_FRONT_PETAL, C11_BRAKE_SEAM, C11_BRAKE_PETAL, C11_LAND_SEAM, C11_LAND_PETAL, C11_SQUASH_SEAM, C11_SQUASH_PETAL, C11_BOUNCE_SEAM, C11_BOUNCE_PETAL, C11_SETTLE_SEAM, C11_SETTLE_PETAL, } from '../svg/keyframeGeometry.js';
const to1000 = (p) => p.map(([x, y]) => [x * 1000, y * 1000]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const centroid = (p) => { let x = 0, y = 0; for (const q of p) {
    x += q[0];
    y += q[1];
} return [x / Math.max(1, p.length), y / Math.max(1, p.length)]; };
const bounds = (p) => { const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const rotateClosed = (p, shift) => { const s = ((shift % p.length) + p.length) % p.length; return [...p.slice(s), ...p.slice(0, s)]; };
const bestClosedShift = (authority, candidate) => { let best = 0, bestErr = Infinity; for (let s = 0; s < candidate.length; s++) {
    const q = rotateClosed(candidate, s);
    let e = 0;
    for (let i = 0; i < Math.min(authority.length, q.length); i++) {
        const d = dist(authority[i], q[i]);
        e += d * d;
    }
    if (e < bestErr) {
        bestErr = e;
        best = s;
    }
} return best; };
const resample = (points, count, closed) => {
    if (points.length === count)
        return points.map(p => [p[0], p[1]]);
    if (points.length < 2)
        return Array.from({ length: count }, () => points[0] ?? [500, 500]);
    const src = closed ? [...points, points[0]] : [...points];
    const lengths = [];
    let total = 0;
    for (let i = 0; i < src.length - 1; i++) {
        const n = dist(src[i], src[i + 1]);
        lengths.push(n);
        total += n;
    }
    const denom = closed ? count : Math.max(1, count - 1), out = [];
    let seg = 0, passed = 0;
    for (let i = 0; i < count; i++) {
        const target = total * (i / denom);
        while (seg < lengths.length - 1 && passed + lengths[seg] < target) {
            passed += lengths[seg];
            seg++;
        }
        const len = Math.max(.000001, lengths[seg] ?? 1), t = Math.max(0, Math.min(1, (target - passed) / len)), a = src[seg], b = src[seg + 1];
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return out;
};
const posBody = to1000(posBodyRaw);
const bodyShift = bestClosedShift(posBody, C11_FRONT_BODY);
const alignedBody = (p) => rotateClosed(p, bodyShift);
const alignedFrontBody = alignedBody(C11_FRONT_BODY);
const solve3 = (a, b) => { const m = a.map((r, i) => [...r, b[i]]); for (let c = 0; c < 3; c++) {
    let pivot = c;
    for (let r = c + 1; r < 3; r++)
        if (Math.abs(m[r][c]) > Math.abs(m[pivot][c]))
            pivot = r;
    [m[c], m[pivot]] = [m[pivot], m[c]];
    const d = Math.abs(m[c][c]) < 1e-9 ? 1e-9 : m[c][c];
    for (let j = c; j < 4; j++)
        m[c][j] /= d;
    for (let r = 0; r < 3; r++) {
        if (r === c)
            continue;
        const f = m[r][c];
        for (let j = c; j < 4; j++)
            m[r][j] -= f * m[c][j];
    }
} return [m[0][3], m[1][3], m[2][3]]; };
const fitAffine = (from, to) => { let sxx = 0, sxy = 0, sx = 0, syy = 0, sy = 0, n = 0, bxx = 0, bxy = 0, bx = 0, byx = 0, byy = 0, by = 0; for (let i = 0; i < Math.min(from.length, to.length); i++) {
    const [x, y] = from[i], [u, v] = to[i];
    sxx += x * x;
    sxy += x * y;
    sx += x;
    syy += y * y;
    sy += y;
    n++;
    bxx += x * u;
    bxy += y * u;
    bx += u;
    byx += x * v;
    byy += y * v;
    by += v;
} const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], cx = solve3(A, [bxx, bxy, bx]), cy = solve3(A, [byx, byy, by]); return [cx[0], cy[0], cx[1], cy[1], cx[2], cy[2]]; };
const applyAffine = (points, m) => points.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
export const POS_IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0];
export const POS_TAKEOFF_MATRIX = fitAffine(C11_FRONT_BODY, C11_TAKEOFF_BODY);
export const POS_ANTICIPATION_MATRIX = fitAffine(C11_FRONT_BODY, C11_ANTICIPATION_BODY);
export const POS_BRAKE_MATRIX = fitAffine(C11_FRONT_BODY, C11_BRAKE_BODY);
export const POS_LAND_MATRIX = fitAffine(C11_FRONT_BODY, C11_LAND_BODY);
export const POS_SQUASH_MATRIX = fitAffine(C11_FRONT_BODY, C11_SQUASH_BODY);
export const POS_BOUNCE_MATRIX = fitAffine(C11_FRONT_BODY, C11_BOUNCE_BODY);
export const POS_SETTLE_MATRIX = POS_IDENTITY_MATRIX;
export const POS_FRONT_BODY = posBody;
export const POS_TAKEOFF_BODY = applyAffine(posBody, POS_TAKEOFF_MATRIX);
export const POS_ANTICIPATION_BODY = applyAffine(posBody, POS_ANTICIPATION_MATRIX);
export const POS_BRAKE_BODY = applyAffine(posBody, POS_BRAKE_MATRIX);
export const POS_LAND_BODY = applyAffine(posBody, POS_LAND_MATRIX);
export const POS_SQUASH_BODY = applyAffine(posBody, POS_SQUASH_MATRIX);
export const POS_BOUNCE_BODY = applyAffine(posBody, POS_BOUNCE_MATRIX);
export const POS_SETTLE_BODY = POS_FRONT_BODY;
// Same exact WIP33 90-degree silhouettes, only cyclically re-indexed so morph
// correspondence follows POS topology. Rotating a closed point list does not change
// the rendered master path.
export const WEB_PROFILE_BODY = alignedBody(C11_PROFILE_BODY);
export const WEB_PROFILE_ACCEL_BODY = alignedBody(C11_PROFILE_ACCEL_BODY);
export const WEB_ARC_BODY = alignedBody(C11_ARC_BODY);
export const WEB_HERO_APPROACH_BODY = alignedBody(C11_HERO_APPROACH_BODY);
// Eyes keep the POS silhouette. WIP33 contributes only the affine acting change
// (translation / anisotropic scale) observed between its front and target pose.
const affinePose = (authority, refFront, refTarget) => {
    const ac = centroid(authority), fc = centroid(refFront), tc = centroid(refTarget), ab = bounds(authority), fb = bounds(refFront), tb = bounds(refTarget);
    const sx = Math.max(.72, Math.min(1.32, (tb[2] - tb[0]) / Math.max(1, fb[2] - fb[0]))), sy = Math.max(.72, Math.min(1.32, (tb[3] - tb[1]) / Math.max(1, fb[3] - fb[1]))), dx = tc[0] - fc[0], dy = tc[1] - fc[1];
    return authority.map(([x, y]) => [ac[0] + (x - ac[0]) * sx + dx, ac[1] + (y - ac[1]) * sy + dy]);
};
const posLeftSocket = resample(to1000(posLeftEyeSocketRaw), 64, true), posRightSocket = resample(to1000(posRightEyeSocketRaw), 64, true);
const posLeftInner = resample(to1000(posLeftEyeInnerRaw), 64, true), posRightInner = resample(to1000(posRightEyeInnerRaw), 64, true);
const eyeSet = (left, right) => ({
    left: affinePose(posLeftSocket, C11_FRONT_EYE_0, left), right: affinePose(posRightSocket, C11_FRONT_EYE_1, right),
    leftInner: affinePose(posLeftInner, C11_FRONT_EYE_0, left), rightInner: affinePose(posRightInner, C11_FRONT_EYE_1, right),
});
export const POS_FRONT_EYES = { left: posLeftSocket, right: posRightSocket, leftInner: posLeftInner, rightInner: posRightInner };
export const POS_TAKEOFF_EYES = eyeSet(C11_TAKEOFF_EYE_0, C11_TAKEOFF_EYE_1);
export const POS_ANTICIPATION_EYES = eyeSet(C11_ANTICIPATION_EYE_0, C11_ANTICIPATION_EYE_1);
export const POS_BRAKE_EYES = eyeSet(C11_BRAKE_EYE_0, C11_BRAKE_EYE_1);
export const POS_LAND_EYES = eyeSet(C11_LAND_EYE_0, C11_LAND_EYE_1);
export const POS_SQUASH_EYES = eyeSet(C11_SQUASH_EYE_0, C11_SQUASH_EYE_1);
export const POS_BOUNCE_EYES = eyeSet(C11_BOUNCE_EYE_0, C11_BOUNCE_EYE_1);
export const POS_SETTLE_EYES = eyeSet(C11_SETTLE_EYE_0, C11_SETTLE_EYE_1);
const profileEyeShift = bestClosedShift(POS_ANTICIPATION_EYES.right, C11_PROFILE_ACCEL_EYE_0);
const alignedProfileEye = (p) => rotateClosed(p, profileEyeShift);
export const WEB_PROFILE_EYE = alignedProfileEye(C11_PROFILE_EYE_0);
export const WEB_PROFILE_ACCEL_EYE = alignedProfileEye(C11_PROFILE_ACCEL_EYE_0);
export const WEB_ARC_EYE = alignedProfileEye(C11_ARC_EYE_0);
export const WEB_HERO_APPROACH_EYE = alignedProfileEye(C11_HERO_APPROACH_EYE_0);
// POS seam/petal are resampled to the established WIP33 topology so the motion
// deltas stay interpolable and no topology switch occurs mid-flight.
const posSeam = resample(to1000(posSeamRaw), C11_FRONT_SEAM.length, false);
const posPetal = resample(to1000(posPetalRaw), C11_FRONT_PETAL.length, true);
const transferOpenDelta = (base, front, target) => base.map((p, i) => [p[0] + ((target[i]?.[0] ?? front[i][0]) - front[i][0]), p[1] + ((target[i]?.[1] ?? front[i][1]) - front[i][1])]);
export const POS_FRONT_SEAM = posSeam;
export const POS_FRONT_PETAL = posPetal;
export const POS_BRAKE_SEAM = transferOpenDelta(posSeam, C11_FRONT_SEAM, C11_BRAKE_SEAM);
export const POS_BRAKE_PETAL = transferOpenDelta(posPetal, C11_FRONT_PETAL, C11_BRAKE_PETAL);
export const POS_LAND_SEAM = transferOpenDelta(posSeam, C11_FRONT_SEAM, C11_LAND_SEAM);
export const POS_LAND_PETAL = transferOpenDelta(posPetal, C11_FRONT_PETAL, C11_LAND_PETAL);
export const POS_SQUASH_SEAM = transferOpenDelta(posSeam, C11_FRONT_SEAM, C11_SQUASH_SEAM);
export const POS_SQUASH_PETAL = transferOpenDelta(posPetal, C11_FRONT_PETAL, C11_SQUASH_PETAL);
export const POS_BOUNCE_SEAM = transferOpenDelta(posSeam, C11_FRONT_SEAM, C11_BOUNCE_SEAM);
export const POS_BOUNCE_PETAL = transferOpenDelta(posPetal, C11_FRONT_PETAL, C11_BOUNCE_PETAL);
export const POS_SETTLE_SEAM = transferOpenDelta(posSeam, C11_FRONT_SEAM, C11_SETTLE_SEAM);
export const POS_SETTLE_PETAL = transferOpenDelta(posPetal, C11_FRONT_PETAL, C11_SETTLE_PETAL);
export const POS_WEB_IDENTITY_META = {
    source: 'Lyra POS C18/C19',
    bodyPoints: POS_FRONT_BODY.length,
    eyePoints: POS_FRONT_EYES.left.length,
    bodyC11AlignmentShift: bodyShift,
    profileAuthority: 'WIP33 C11_PROFILE/C11_PROFILE_ACCEL/C11_ARC/C11_HERO_APPROACH (cyclic point reindex only)',
};
