/** Shared constants and shape helpers for the generated level layouts. */
import { Rand, type Pt } from '../lib/raster';
import type { MassDef } from '../lib/rock-art';

export const W = 9216;
/** Level height and mean water line, shared by every level (enemy spawn heights depend on them). */
export const H = 3001;
export const WATER = 1505;
export const HALF_PI = Math.PI / 2;

/** What a generated level is made of. */
export interface LevelLayout {
  id: string;
  width: number;
  seed: number;
  masses: MassDef[];
  /** Seabed stretches (x ranges) that get a sandy top with seaweed and coral. */
  sand: Array<[number, number]>;
  /** Gap between plants on the sand, in px. */
  plantSpacing?: [number, number];
}

/** A floating rock above (or at) the water, mossy with vines hanging off it. */
export function floater(name: string, outline: Pt[], moss = true): MassDef {
  return { name, rings: [outline], style: 'packed', size: 62, angle: 0, stretch: 2, moss, fringe: moss, hangingVines: moss ? 9 : 0 };
}

/** A bare chunk of rock. */
export function fragment(name: string, outline: Pt[]): MassDef {
  return { name, rings: [outline], style: 'packed', size: 55, angle: 0, stretch: 1.8, crag: false };
}

/** A boulder resting on the seabed. */
export function boulder(name: string, outline: Pt[]): MassDef {
  return { name, rings: [outline], style: 'packed', size: 70, angle: 0, stretch: 1.6, crag: false };
}

/** The seabed: a profile left to right, closed along the bottom of the level. */
export function seabed(width: number, profile: Pt[], extra: Partial<MassDef> = {}): MassDef {
  return { name: 'seabed', rings: [[...profile, [width, H], [0, H]]], style: 'packed', size: 120, angle: 0, stretch: 2.8, sand: true, ...extra };
}

/** Stable seed from a name, so each shape's randomness is its own. */
function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface IslandOptions {
  /** Stalactites hanging from the underside. */
  spikes?: number;
  /** Height of a rocky crown rising from the top. */
  crown?: number;
  /** Top slopes by this much from left to right. */
  tilt?: number;
  moss?: boolean;
  trees?: number;
  vines?: number;
  /** Anything else for the mass (palette, lava...). */
  extra?: Partial<MassDef>;
}

/**
 * A floating island: a lumpy top (optionally with a crown), rounded shoulders and a
 * bowl-shaped underside with stalactites. Big islands get the original island's
 * layering (moss, then mortar and shards, then big stones underneath).
 */
export function island(name: string, cx: number, top: number, halfWidth: number, depth: number, o: IslandOptions = {}): MassDef {
  const r = new Rand(hashName(name));
  const pts: Pt[] = [];
  const n = Math.max(4, Math.round(halfWidth / 70));
  const crownAt = o.crown ? r.int(1, n - 1) : -1;
  for (let k = 0; k <= n; k++) {
    const edge = k === 0 || k === n;
    const x = cx - halfWidth + (2 * halfWidth * k) / n + (edge ? 0 : r.range(-15, 15));
    let y = top + (edge ? r.range(14, 34) : r.range(-10, 10)) + (o.tilt ?? 0) * (k / n - 0.5);
    if (k === crownAt) y -= o.crown ?? 0;
    pts.push([x, y]);
  }
  pts.push([cx + halfWidth * 0.97, top + depth * 0.28 + r.range(-8, 8)]);
  const m = Math.max(5, Math.round(halfWidth / 55));
  const spikes = new Set<number>();
  while (spikes.size < Math.min(o.spikes ?? 1, m - 2)) spikes.add(r.int(1, m - 1));
  for (let k = 1; k < m; k++) {
    const u = 1 - (2 * k) / m;
    const x = cx + halfWidth * 0.93 * u;
    const y = top + depth * (0.3 + 0.7 * Math.pow(1 - u * u, 0.7)) + r.range(-12, 12);
    if (spikes.has(k)) {
      // Stalactites grow with the island, but stay stubby.
      const w = r.range(14, 28) * (depth > 250 ? 1.7 : 1);
      pts.push([x + w, y], [x + r.range(-6, 6), y + 30 + Math.min(depth, 280) * r.range(0.2, 0.42)], [x - w, y]);
    } else pts.push([x, y]);
  }
  pts.push([cx - halfWidth * 0.97, top + depth * 0.28 + r.range(-8, 8)]);
  const big = depth >= 220;
  return {
    name,
    rings: [pts],
    style: big ? 'rubble' : 'packed',
    size: big ? 95 : 62,
    angle: 0,
    stretch: big ? 1.7 : 2,
    ...(big ? { band: 150, bandTop: 30, core: Math.round(depth * 0.3) } : {}),
    moss: o.moss ?? true,
    fringe: o.moss ?? true,
    hangingVines: o.vines ?? 9,
    trees: o.trees ?? 0,
    ...o.extra,
  };
}

export interface NeedleOptions {
  /** How far the bottom sits to the right of the top. */
  lean?: number;
  /** A jagged crown with a spire, as if broken off. */
  broken?: boolean;
  trees?: number;
  extra?: Partial<MassDef>;
}

/**
 * A tall, thin stack of vertical slabs, floating (it ends in a jagged point): a
 * mossy crown that overhangs the shaft, and mossy ledges down its sides above water.
 */
export function needle(name: string, cx: number, top: number, bottom: number, halfWidth: number, o: NeedleOptions = {}): MassDef {
  const r = new Rand(hashName(name));
  const lean = o.lean ?? 0;
  const span = bottom - top;
  const cap = halfWidth * 1.3;
  const shaftTop = top + 90;
  const phase = r.range(0, Math.PI * 2);
  const centre = (y: number) => cx + (lean * (y - top)) / span;
  const half = (y: number) => halfWidth * (0.8 + 0.22 * Math.sin(((y - top) / span) * Math.PI * 1.6 + phase));
  // Ledges on alternating sides, down to just above the water.
  const ledges = new Map<number, number[]>([[1, []], [-1, []]]);
  let side = r.chance(0.5) ? 1 : -1;
  for (let y = shaftTop + r.range(150, 260); y < Math.min(bottom - 200, WATER - 120); y += r.range(240, 380)) {
    ledges.get(side)!.push(y);
    side = -side;
  }
  /** One side of the shaft, top to bottom. */
  const flank = (s: number): Pt[] => {
    const pts: Pt[] = [];
    const at = ledges.get(s)!;
    let y = shaftTop;
    while (y < bottom - 110) {
      const edge = centre(y) + s * (half(y) + r.range(-12, 12));
      const ledge = at.find((ly) => ly >= y && ly < y + 120);
      if (ledge !== undefined) {
        const e = centre(ledge) + s * half(ledge);
        const out = r.range(45, 85);
        pts.push([e, ledge], [e + s * out, ledge + r.range(-4, 8)], [e + s * (out + 6), ledge + 22], [e + s * out * 0.35, ledge + 48 + out * 0.5]);
        y = ledge + 70 + out * 0.5;
      } else {
        pts.push([edge, y]);
        y += r.range(90, 130);
      }
    }
    return pts;
  };
  const pts: Pt[] = [];
  // The crown, left to right.
  const spireAt = o.broken ? r.int(1, 3) : -1;
  for (let k = 0; k <= 4; k++) {
    const x = cx - cap + (cap * 2 * k) / 4 + (k % 4 ? r.range(-12, 12) : 0);
    let y = top + (k % 4 ? r.range(-10, 10) : r.range(16, 28));
    if (k === spireAt) {
      pts.push([x - 22, y]);
      y -= r.range(60, 90);
      pts.push([x + r.range(-8, 8), y], [x + 22, y + r.range(60, 90)]);
      continue;
    }
    pts.push([x, y]);
  }
  // Right shoulder overhanging the shaft, down the right side, the jagged point
  // it broke off at, back up the left side and under the left shoulder.
  pts.push([cx + cap + 6, top + 48], [cx + cap - 18, top + 74]);
  pts.push(...flank(1));
  pts.push([cx + lean + halfWidth * 0.5, bottom - r.range(50, 80)], [cx + lean + r.range(-10, 10), bottom], [cx + lean - halfWidth * 0.45, bottom - r.range(40, 70)]);
  pts.push(...flank(-1).reverse());
  pts.push([cx - cap + 18, top + 74], [cx - cap - 6, top + 48]);
  const inWater = bottom > WATER;
  return {
    name,
    rings: [pts],
    style: 'packed',
    size: 80,
    angle: HALF_PI + Math.atan2(lean, span) * 0.8,
    stretch: 3.2,
    moss: true,
    fringe: true,
    crawlingVines: 6,
    hangingVines: 14,
    vinesUnderwater: inWater,
    trees: o.trees ?? (halfWidth > 110 ? 1 : 0),
    ...o.extra,
  };
}

/** A mound on the seabed, such as the stump a needle broke from. */
export function stump(name: string, cx: number, halfWidth: number, top: number, extra: Partial<MassDef> = {}): MassDef {
  const r = new Rand(hashName(name));
  return {
    name,
    rings: [[
      [cx - halfWidth, 2920], [cx - halfWidth * 0.75, top + r.range(50, 90)], [cx - halfWidth * 0.35, top + r.range(10, 30)],
      [cx + halfWidth * 0.1, top], [cx + halfWidth * 0.45, top + r.range(15, 40)], [cx + halfWidth * 0.8, top + r.range(60, 100)],
      [cx + halfWidth, 2920],
    ]],
    style: 'packed',
    size: 90,
    angle: 0,
    stretch: 2,
    sand: true,
    ...extra,
  };
}
