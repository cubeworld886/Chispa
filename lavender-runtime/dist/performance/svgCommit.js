/** Commit only changed attributes. Reading attributes does not request layout.
 * No prototype overrides and no stale write cache if another owner changes a node.
 */
export function setSvgAttribute(node, name, value) {
  if (!node) return false;
  const next = String(value);
  if (node.getAttribute?.(name) === next) return false;
  node.setAttribute(name, next);
  return true;
}

export function removeSvgAttribute(node, name) {
  if (!node || node.hasAttribute?.(name) === false) return;
  node.removeAttribute(name);
}

/** Bounded, exact last-geometry cache: never quantizes the canonical silhouette. */
export class SvgPathCache {
  constructor(limit = 24) { this.limit = Math.max(1, limit); this.entries = new Map(); }
  get size() { return this.entries.size; }
  clear() { this.entries.clear(); }
  resolve(key, points, format) {
    const old = this.entries.get(key);
    let same = Boolean(old && old.points.length === points.length * 2);
    if (same) for (let i = 0; i < points.length; i++) {
      if (points[i][0] !== old.points[i * 2] || points[i][1] !== old.points[i * 2 + 1]) { same = false; break; }
    }
    if (same) return old.path;
    const path = format(points);
    if (!old && this.entries.size >= this.limit) this.entries.delete(this.entries.keys().next().value);
    // Reuse storage on changing contours instead of allocating another point tree.
    const saved = old?.points.length === points.length * 2 ? old.points : new Float64Array(points.length * 2);
    for (let i = 0; i < points.length; i++) { saved[i * 2] = points[i][0]; saved[i * 2 + 1] = points[i][1]; }
    this.entries.set(key, { points: saved, path });
    return path;
  }
}
