/**
 * Tiny software rasteriser for the level art generators: aliased polygons and
 * circles (the original art has no anti-aliasing), chamfer distance transforms
 * and a seeded random generator. Everything works on flat typed arrays.
 */

export type Pt = readonly [number, number];

/** Deterministic PRNG (mulberry32). */
export class Rand {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

export type SpanFn = (y: number, x0: number, x1: number) => void;

/**
 * Calls `span(y, x0, x1)` for every run of pixels (x0 inclusive, x1 exclusive)
 * whose centre lies inside the rings, using the even-odd rule so later rings cut holes.
 */
export function scanPolygon(rings: readonly (readonly Pt[])[], width: number, height: number, span: SpanFn): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [, y] of ring) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(height - 1, Math.ceil(maxY));
  const xs: number[] = [];
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5;
    xs.length = 0;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [ax, ay] = ring[j];
        const [bx, by] = ring[i];
        if (ay <= cy !== by <= cy) xs.push(ax + ((cy - ay) * (bx - ax)) / (by - ay));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i] - 0.5));
      const x1 = Math.min(width, Math.ceil(xs[i + 1] - 0.5));
      if (x1 > x0) span(y, x0, x1);
    }
  }
}

export function scanCircle(cx: number, cy: number, r: number, width: number, height: number, span: SpanFn): void {
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(height - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    if (Math.abs(dy) > r) continue;
    const half = Math.sqrt(r * r - dy * dy);
    const x0 = Math.max(0, Math.ceil(cx - half - 0.5));
    const x1 = Math.min(width, Math.floor(cx + half - 0.5) + 1);
    if (x1 > x0) span(y, x0, x1);
  }
}

const SQRT2 = Math.SQRT2;

/**
 * Distance from every pixel with `mask[i] !== 0` to the nearest pixel outside
 * the mask (chamfer approximation). Pixels outside get 0. The image border is
 * not a boundary: shapes are assumed to continue past it.
 */
export function maskDistance(mask: Uint8Array, width: number, height: number): Float32Array {
  const d = new Float32Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 1e9 : 0;
  chamfer(d, width, height, null);
  return d;
}

/**
 * Distance from every labelled pixel (label >= 0) to the nearest pixel with a
 * different label (or no label). Unlabelled pixels get 0.
 */
export function labelDistance(label: Int32Array, width: number, height: number): Float32Array {
  const d = new Float32Array(width * height);
  for (let i = 0; i < d.length; i++) d[i] = label[i] >= 0 ? 1e9 : 0;
  chamfer(d, width, height, label);
  return d;
}

function chamfer(d: Float32Array, width: number, height: number, label: Int32Array | null): void {
  // A neighbour with a different label is itself a boundary at distance `w`.
  const relax = (i: number, j: number, w: number) => {
    const via = label && label[j] !== label[i] ? w : d[j] + w;
    if (via < d[i]) d[i] = via;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (d[i] === 0) continue;
      if (x > 0) relax(i, i - 1, 1);
      if (y > 0) {
        relax(i, i - width, 1);
        if (x > 0) relax(i, i - width - 1, SQRT2);
        if (x < width - 1) relax(i, i - width + 1, SQRT2);
      }
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (d[i] === 0) continue;
      if (x < width - 1) relax(i, i + 1, 1);
      if (y < height - 1) {
        relax(i, i + width, 1);
        if (x < width - 1) relax(i, i + width + 1, SQRT2);
        if (x > 0) relax(i, i + width - 1, SQRT2);
      }
    }
  }
}

/** Smooth 1D value noise in [0, 1]. */
export function noise1(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    let t = Math.imul(n ^ seed, 0x27d4eb2d);
    t ^= t >>> 15;
    t = Math.imul(t, 0x85ebca6b);
    t ^= t >>> 13;
    return ((t >>> 0) % 10000) / 10000;
  };
  const s = f * f * (3 - 2 * f);
  return h(i) * (1 - s) + h(i + 1) * s;
}
