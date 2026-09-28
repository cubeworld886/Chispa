import { body, leftEye, leftEyeSocket, rightEye, rightEyeSocket, seamCubic } from './lavenderGeometry.js';
import { lavenderMorphTargets } from './morphTargets.js';
const BODY_CENTER = [.5, .515];
export const contourPointCount = 192;
export const eyePointCount = 96;
export const ridgePointCount = 64;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const pointAt = (points, index) => points[index];
const numberAt = (values, index) => values[index];
export const smooth01 = (value) => {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
};
export function resampleClosed(source, count) {
    if (!source.length || count <= 0)
        return [];
    if (source.length === 1)
        return Array.from({ length: count }, () => pointAt(source, 0));
    const distances = [0];
    let total = 0;
    for (let i = 0; i < source.length; i++) {
        total += dist(pointAt(source, i), pointAt(source, (i + 1) % source.length));
        distances.push(total);
    }
    if (total < 1e-9)
        return Array.from({ length: count }, () => pointAt(source, 0));
    const out = [];
    let segment = 0;
    for (let i = 0; i < count; i++) {
        const targetDistance = (total * i) / count;
        while (segment + 1 < distances.length && numberAt(distances, segment + 1) < targetDistance)
            segment++;
        const a = pointAt(source, segment % source.length);
        const b = pointAt(source, (segment + 1) % source.length);
        const d0 = numberAt(distances, segment);
        const d1 = numberAt(distances, segment + 1);
        const u = d1 <= d0 ? 0 : (targetDistance - d0) / (d1 - d0);
        out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
    return out;
}
export function resampleOpen(source, count) {
    if (!source.length || count <= 0)
        return [];
    if (source.length === 1)
        return Array.from({ length: count }, () => pointAt(source, 0));
    const distances = [0];
    let total = 0;
    for (let i = 0; i < source.length - 1; i++) {
        total += dist(pointAt(source, i), pointAt(source, i + 1));
        distances.push(total);
    }
    const out = [];
    let segment = 0;
    for (let i = 0; i < count; i++) {
        const targetDistance = count === 1 ? 0 : (total * i) / (count - 1);
        while (segment + 1 < distances.length && numberAt(distances, segment + 1) < targetDistance)
            segment++;
        const nextIndex = Math.min(segment + 1, source.length - 1);
        const a = pointAt(source, segment);
        const b = pointAt(source, nextIndex);
        const d0 = numberAt(distances, segment);
        const d1 = numberAt(distances, Math.min(segment + 1, distances.length - 1));
        const u = d1 <= d0 ? 0 : (targetDistance - d0) / (d1 - d0);
        out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
    return out;
}
function signedArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const p = pointAt(points, i);
        const q = pointAt(points, (i + 1) % points.length);
        area += p[0] * q[1] - q[0] * p[1];
    }
    return area * .5;
}
function alignClosed(target, reference) {
    if (target.length !== reference.length || !target.length)
        return [...target];
    const candidate = [...target];
    if (Math.sign(signedArea(candidate)) !== Math.sign(signedArea(reference)))
        candidate.reverse();
    let bestShift = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let shift = 0; shift < reference.length; shift++) {
        let score = 0;
        for (let i = 0; i < reference.length; i += 4) {
            const a = pointAt(reference, i);
            const b = pointAt(candidate, (i + shift) % candidate.length);
            const dx = a[0] - b[0];
            const dy = a[1] - b[1];
            score += dx * dx + dy * dy;
        }
        if (score < bestScore) {
            bestScore = score;
            bestShift = shift;
        }
    }
    return reference.map((_, index) => pointAt(candidate, (index + bestShift) % candidate.length));
}
function softStar(center, outer, inner) {
    const out = [];
    for (let i = 0; i < 64; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / 64;
        const lobe = Math.pow(Math.abs(Math.cos(angle * 2)), 5.5);
        const radius = inner + (outer - inner) * lobe;
        out.push([center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]);
    }
    return out;
}
function diamond(center, width, height, rotation = 0) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const point = (x, y) => [center[0] + x * cos - y * sin, center[1] + x * sin + y * cos];
    return [point(0, -height), point(width, 0), point(0, height), point(-width, 0)];
}
function capsule(center, rx, ry, rotation = 0) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const out = [];
    for (let i = 0; i < 32; i++) {
        const angle = (i * Math.PI * 2) / 32;
        const x = Math.cos(angle) * rx;
        const y = Math.sin(angle) * ry;
        out.push([center[0] + x * cos - y * sin, center[1] + x * sin + y * cos]);
    }
    return out;
}
export const lavenderContour = resampleClosed(body, contourPointCount);
export const targetContours = {
    galaxy: alignClosed([...lavenderMorphTargets.galaxy], lavenderContour),
    success: alignClosed([...lavenderMorphTargets.success], lavenderContour),
    warning: alignClosed([...lavenderMorphTargets.warning], lavenderContour),
    error: alignClosed([...lavenderMorphTargets.error], lavenderContour),
    signal: alignClosed([...lavenderMorphTargets.signal], lavenderContour),
};
export const leftEyeSource = resampleClosed(leftEyeSocket, eyePointCount);
export const rightEyeSource = resampleClosed(rightEyeSocket, eyePointCount);
export const leftEyeCoreSource = resampleClosed(leftEye, eyePointCount);
export const rightEyeCoreSource = resampleClosed(rightEye, eyePointCount);
const eyeRaw = {
    galaxy: [softStar([.35, .642], .018, .0048), softStar([.72, .5], .022, .0052)],
    success: [softStar([.305, .735], .0085, .0026), softStar([.51, .365], .0075, .0024)],
    warning: [capsule([.486, .405], .0045, .03), diamond([.5, .697], .005, .0045)],
    error: [diamond([.405, .425], .01, .008, -Math.PI / 8), diamond([.602, .605], .01, .008, -Math.PI / 8)],
    signal: [capsule([.445, .592], .01, .01), capsule([.555, .592], .01, .01)],
};
export const eyeTargets = Object.fromEntries(Object.entries(eyeRaw).map(([key, [left, right]]) => [
    key,
    [
        alignClosed(resampleClosed(left, eyePointCount), leftEyeSource),
        alignClosed(resampleClosed(right, eyePointCount), rightEyeSource),
    ],
]));
export const ridgeSource = resampleOpen(seamCubic, ridgePointCount);
const ridgeRaw = {
    galaxy: [[.405, .405], [.435, .455], [.495, .49], [.565, .515], [.625, .56], [.66, .6]],
    success: [[.325, .485], [.37, .555], [.435, .63], [.495, .655], [.56, .605], [.635, .5], [.705, .37]],
    warning: [[.48, .3], [.478, .365], [.48, .435], [.486, .51]],
    error: [[.35, .365], [.42, .435], [.5, .515], [.58, .595], [.65, .665]],
    signal: [[.476, .35], [.468, .42], [.472, .5], [.474, .59], [.468, .68]],
};
export const ridgeTargets = Object.fromEntries(Object.entries(ridgeRaw).map(([key, value]) => [key, resampleOpen(value, ridgePointCount)]));
export const morphKeys = ['galaxy', 'success', 'warning', 'error', 'signal'];
export function morphWeights(pose) {
    const raw = [pose.galaxyMorph, pose.successMorph, pose.warningMorph, pose.errorMorph, pose.signalMorph]
        .map(value => Math.max(0, Math.min(1, value)));
    const total = raw.reduce((sum, value) => sum + value, 0);
    return total < 1e-9 ? [0, 0, 0, 0, 0] : raw.map(value => value / total);
}
export function morphInfluence(pose) {
    return Math.max(0, Math.min(1, pose.galaxyMorph + pose.successMorph + pose.warningMorph + pose.errorMorph + pose.signalMorph));
}
export function warpBodyPoint(point, pose) {
    const relX = point[0] - BODY_CENTER[0];
    const relY = point[1] - BODY_CENTER[1];
    const nx = Math.max(-1.35, Math.min(1.35, relX / .285));
    const ny = Math.max(-1.25, Math.min(1.25, relY / .355));
    const mid = Math.max(0, Math.min(1, 1 - Math.abs(ny)));
    const shoulder = Math.max(0, Math.min(1, Math.abs(Math.sin(Math.max(0, Math.min(Math.PI, (ny + 1) * Math.PI / 2))))));
    const puff = 1 + pose.bodyPuff * .115 * shoulder;
    const pinch = 1 - pose.bodyPinch * .095 * mid;
    let x = relX * puff * pinch;
    let y = relY * (1 - pose.bodyPuff * .018 + pose.bodyPinch * .024);
    const bend = Math.pow(mid, 1.35);
    x += pose.bodyBend * .038 * bend * (.62 + (ny + 1) * .19);
    x += pose.bodyWave * .023 * bend * Math.sin((ny + 1.08) * Math.PI * 1.35 + pose.bodyWavePhase);
    y += pose.bodyPuff * .0055 * (nx * nx - .35) * bend;
    y += pose.bodyPinch * .004 * Math.sin(ny * Math.PI) * mid;
    const turn = Math.max(-.16, Math.min(.16, pose.bodyTurn));
    const turnNormal = Math.max(-1, Math.min(1, turn / .16));
    const face = Math.pow(mid, 1.55);
    const side = Math.max(0, Math.min(1, Math.abs(nx)));
    x += turnNormal * .0105 * face + turnNormal * .0042 * side * face * Math.sign(nx);
    y += turnNormal * nx * .0028 * face;
    return [BODY_CENTER[0] + x, BODY_CENTER[1] + y];
}
export function livingBodyPoints(pose) {
    return lavenderContour.map(source => warpBodyPoint(source, pose));
}
export function materialMorphPoints(pose, seconds) {
    const influence = morphInfluence(pose);
    const eased = smooth01(influence);
    const weights = morphWeights(pose);
    return lavenderContour.map((source, index) => {
        const start = warpBodyPoint(source, pose);
        if (eased < 1e-6)
            return start;
        let tx = 0;
        let ty = 0;
        for (let k = 0; k < morphKeys.length; k++) {
            const weight = numberAt(weights, k);
            if (weight <= 0)
                continue;
            const key = morphKeys[k];
            let target = pointAt(targetContours[key], index);
            if (k === 0 && eased >= .58) {
                const settle = smooth01((eased - .58) / .42);
                const angle = Math.sin(seconds * .62) * .075 * settle;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const rx = target[0] - .5;
                const ry = target[1] - .515;
                target = [.5 + rx * cos - ry * sin, .515 + rx * sin + ry * cos];
            }
            tx += target[0] * weight;
            ty += target[1] * weight;
        }
        return [start[0] + (tx - start[0]) * eased, start[1] + (ty - start[1]) * eased];
    });
}
export function morphRidgePoints(pose) {
    const influence = morphInfluence(pose);
    const eased = smooth01(influence);
    const weights = morphWeights(pose);
    return ridgeSource.map((source, index) => {
        const start = warpBodyPoint(source, pose);
        if (eased < 1e-6)
            return start;
        let tx = 0;
        let ty = 0;
        for (let k = 0; k < morphKeys.length; k++) {
            const weight = numberAt(weights, k);
            if (weight <= 0)
                continue;
            const key = morphKeys[k];
            const target = pointAt(ridgeTargets[key], index);
            tx += target[0] * weight;
            ty += target[1] * weight;
        }
        return [start[0] + (tx - start[0]) * eased, start[1] + (ty - start[1]) * eased];
    });
}
const boundsCenter = (points) => {
    if (!points.length)
        return [0, 0];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const point of points) {
        minX = Math.min(minX, point[0]);
        maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]);
        maxY = Math.max(maxY, point[1]);
    }
    return [(minX + maxX) * .5, (minY + maxY) * .5];
};
function buildEyeWarpGeometry(points) {
    if (!points.length)
        return { center: [0, 0], points: [] };
    const center = boundsCenter(points);
    let halfWidth = .001;
    for (const point of points)
        halfWidth = Math.max(halfWidth, Math.abs(point[0] - center[0]));
    return { center, points: points.map(point => { const relX = point[0] - center[0], relY = point[1] - center[1], nx = Math.max(-1, Math.min(1, relX / halfWidth)); return { relX, relY, archFactor: nx * nx - .24 }; }) };
}
const leftSocketWarp = buildEyeWarpGeometry(leftEyeSource);
const rightSocketWarp = buildEyeWarpGeometry(rightEyeSource);
const leftCoreWarp = buildEyeWarpGeometry(leftEyeCoreSource);
const rightCoreWarp = buildEyeWarpGeometry(rightEyeCoreSource);
function transformEyeBase(geometry, pose, side) {
    const isLeft = side === 'left', turn = Math.max(-.16, Math.min(.16, pose.bodyTurn)), normalizedTurn = Math.max(-1, Math.min(1, turn / .16));
    const leftFar = Math.max(0, normalizedTurn), rightFar = Math.max(0, -normalizedTurn), leftNear = Math.max(0, -normalizedTurn), rightNear = Math.max(0, normalizedTurn);
    const gazeDx = pose.gazeX * .0165, gazeDy = pose.gazeY * .013, bendFollow = pose.bodyBend * .0065, puffLift = -pose.bodyPuff * .0018, faceShift = turn * .010;
    const translateX = isLeft
        ? gazeDx + bendFollow + pose.leftEyeDx + faceShift + leftFar * .0018
        : gazeDx + bendFollow + pose.rightEyeDx + faceShift - rightFar * .0018;
    const translateY = gazeDy + puffLift + (isLeft ? pose.leftEyeDy : pose.rightEyeDy);
    // C10 eyelid authority lives in the renderer mask. Eye anatomy remains geometrically stable;
    // blink/open values no longer squash the socket point cloud itself.
    const scaleRaw = isLeft ? pose.leftEyeScaleX * (1 - leftFar * .030 + leftNear * .016) : pose.rightEyeScaleX * (1 - rightFar * .030 + rightNear * .016);
    const open = 1, sx = Math.max(.68, Math.min(1.42, scaleRaw)), sy = 1;
    const rotation = isLeft ? pose.leftEyeRotation : pose.rightEyeRotation, curve = Math.max(-1.25, Math.min(1.25, isLeft ? pose.leftEyeSmile : pose.rightEyeSmile));
    const cos = Math.cos(rotation), sin = Math.sin(rotation), center = geometry.center;
    return geometry.points.map(basis => {
        const x = basis.relX * sx, arch = curve * .0175 * basis.archFactor, y = basis.relY * open * sy + arch;
        return [center[0] + x * cos - y * sin + translateX, center[1] + x * sin + y * cos + translateY];
    });
}
function animatedGalaxyTargetPoint(point, targetSet, patch, influence, seconds, reducedMotion) {
    if (reducedMotion || influence < .45)
        return point;
    const center = boundsCenter(targetSet), galaxyCenter = [.5, .515], rx = center[0] - galaxyCenter[0], ry = center[1] - galaxyCenter[1];
    const angle = (.10 + patch * .025) * Math.sin(seconds * (.72 + patch * .09) + patch * 1.7), cos = Math.cos(angle), sin = Math.sin(angle);
    const rotatedCenter = [galaxyCenter[0] + rx * cos - ry * sin, galaxyCenter[1] + rx * sin + ry * cos];
    const travel = smooth01((influence - .45) / .55);
    return [point[0] + (rotatedCenter[0] - center[0]) * travel, point[1] + (rotatedCenter[1] - center[1]) * travel];
}
/**
 * C18 eye metamorph. The target is blended first, then its inner/core cloud is
 * shrunk around the target bounding-box center by the exact 0.54 factor used by
 * `_scalePointCloudPoint`. Galaxy target patches also retain their C18 drift.
 */
export function morphEyePoints(pose, side, core = false, seconds = 0, reducedMotion = false) {
    const geometry = side === 'left' ? (core ? leftCoreWarp : leftSocketWarp) : (core ? rightCoreWarp : rightSocketWarp);
    const base = transformEyeBase(geometry, pose, side);
    const influence = morphInfluence(pose), eased = smooth01(influence), weights = morphWeights(pose);
    if (eased < 1e-6)
        return base;
    const targetIndex = side === 'left' ? 0 : 1, patch = targetIndex;
    const target = Array.from({ length: eyePointCount }, (_, index) => {
        let tx = 0, ty = 0;
        for (let k = 0; k < morphKeys.length; k++) {
            const weight = numberAt(weights, k);
            if (weight <= 0)
                continue;
            const key = morphKeys[k], targetSet = eyeTargets[key][targetIndex];
            let p = pointAt(targetSet, index);
            if (k === 0)
                p = animatedGalaxyTargetPoint(p, targetSet, patch, eased, seconds, reducedMotion);
            tx += p[0] * weight;
            ty += p[1] * weight;
        }
        return [tx, ty];
    });
    const targetCenter = core ? boundsCenter(target) : null;
    return base.map((point, index) => {
        const raw = pointAt(target, index);
        const dest = core && targetCenter
            ? [targetCenter[0] + (raw[0] - targetCenter[0]) * .54, targetCenter[1] + (raw[1] - targetCenter[1]) * .54]
            : raw;
        return [point[0] + (dest[0] - point[0]) * eased, point[1] + (dest[1] - point[1]) * eased];
    });
}
