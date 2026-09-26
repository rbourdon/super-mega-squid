import type { Point } from './marchingSquares';

/** Shoelace area in raw coordinates (positive around solids produced by marchingSquares). */
export function signedArea(loop: readonly Point[]): number {
  let sum = 0;
  for (let i = 0, n = loop.length; i < n; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ramer-Douglas-Peucker simplification of an open polyline (endpoints kept). */
export function simplifyPolyline(points: readonly Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpendicularDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index !== -1 && maxDist > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

/** Simplify a closed loop, keeping its winding. */
export function simplifyLoop(loop: readonly Point[], tolerance: number): Point[] {
  if (loop.length <= 4) return loop.slice();
  // Split at the vertex farthest from the first one so both halves are well conditioned.
  let far = 0;
  let farDist = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i].x - loop[0].x, loop[i].y - loop[0].y);
    if (d > farDist) {
      farDist = d;
      far = i;
    }
  }
  const a = simplifyPolyline(loop.slice(0, far + 1), tolerance);
  const b = simplifyPolyline([...loop.slice(far), loop[0]], tolerance);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/** Drop vertices closer than `minDistance` to their predecessor (Box2D rejects degenerate edges). */
export function removeCloseVertices(loop: readonly Point[], minDistance: number): Point[] {
  const out: Point[] = [];
  for (const p of loop) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= minDistance) out.push(p);
  }
  while (out.length > 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) >= minDistance) break;
    out.pop();
  }
  return out;
}

/** Even-odd point in polygon test. */
export function pointInPolygon(x: number, y: number, flat: ArrayLike<number>): boolean {
  let inside = false;
  const n = flat.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = flat[i * 2];
    const yi = flat[i * 2 + 1];
    const xj = flat[j * 2];
    const yj = flat[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
