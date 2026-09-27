/**
 * Paints level art in the style of the original Super Mega Squid level.
 *
 * Rocks are authored as outlines. The painter cuts them into craggy stones
 * (a stretched Voronoi pattern), paints each stone like the original (outline,
 * a bevel of face colour, a light rim, the face and a scatter of spots) in dark
 * mortar, and then decorates them: thick moss caps with flame-shaped drips and
 * light blobs, hanging grass under overhangs, vines that crawl over the rock and
 * hang from it, sand on the seabed, and seaweed, coral and trees cut out of the
 * original art.
 *
 * The terrain layer (whose alpha becomes the level collision) only gets rock,
 * moss caps and sand. Anything thin or hanging in the air goes in the
 * decoration layer so it never snags the squid.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { Rand, labelDistance, maskDistance, noise1, scanCircle, scanPolygon, type Pt, type SpanFn } from './raster';

type RGB = readonly [number, number, number];

// --- Palette (sampled from the original art) -------------------------------------
const PALETTE: RGB[] = [[0, 0, 0]]; // 0: empty
const color = (r: number, g: number, b: number): number => PALETTE.push([r, g, b]) - 1;
const OUTLINE = color(169, 162, 135);
const RIM = color(198, 192, 162);
const FACE = color(183, 177, 144);
const MORTAR = color(142, 132, 91);
const MORTAR_LIGHT = color(164, 152, 113);
const DARK_OUTLINE = color(112, 106, 91);
const DARK_RIM = color(155, 150, 129);
const DARK_FACE = color(142, 136, 112);
const DARK_SPOT = color(119, 113, 95);
const DARK_SPOT_LIGHT = color(158, 152, 130);
const ORANGE = color(210, 133, 65);
const ORANGE_SPOT = color(215, 147, 58);
const MOSS = color(110, 159, 65);
const MOSS_LIGHT = color(130, 195, 65);
const MOSS_HIGHLIGHT = color(188, 209, 94);
const MOSS_DARK = color(101, 140, 59);
const SAND = color(215, 198, 128);

export interface MassDef {
  name: string;
  /** Outline, then any holes (even-odd). */
  rings: Pt[][];
  /** "packed": stones everywhere. "rubble": stones along the edges around a core of mortar and shards. */
  style: 'packed' | 'rubble';
  /** Typical stone size across its short side, in pixels. */
  size: number;
  /** Direction the stones are stretched along (radians) and by how much. */
  angle: number;
  stretch: number;
  /** Rubble only: depth of the stone band along the edges... */
  band?: number;
  /** ...and along the tops, which can be shallower so the mortar shows under the moss (default: band). */
  bandTop?: number;
  /**
   * A layer of mortar and shards this deep below the top band, as in the original's
   * floating island (moss, then mortar and shards, then big stones underneath).
   */
  core?: number;
  /** Break long edges into angular crags (default true). */
  crag?: boolean;
  moss?: boolean;
  /** Stones centred above this height use the shaded palette of the original cliff tops. */
  darkAbove?: number;
  /** Region whose gaps are filled with the orange of the original seabed cracks. */
  lava?: (x: number, y: number) => boolean;
  /** Hanging grass under the overhangs. */
  fringe?: boolean;
  /** Vines hanging from the underside, per 1000 px of underside. */
  hangingVines?: number;
  /** Vines crawling down the rock faces, per 1000 px of face. */
  crawlingVines?: number;
  /** Let vines grow below the water line too (they start from the sides as well as under the moss). */
  vinesUnderwater?: boolean;
  /** Trees that may grow on its moss. */
  trees?: number;
  /** Sand, seaweed and coral on its tops below water. */
  sand?: boolean;
}

interface Surface {
  x: number;
  y: number;
}

interface Seed {
  x: number;
  y: number;
  mass: number;
  /** Largest reach in the mass's stretched frame. */
  reach: number;
  /** Rubble edge stones stop this far in from the outline, giving them a straight inner edge. */
  depth: number;
}

/** A stretch of outline with a moss cap: its ends, outward normal and cap thickness at each end. */
interface MossEdge {
  mass: number;
  a: Pt;
  b: Pt;
  len: number;
  nx: number;
  ny: number;
  t0: number;
  t1: number;
}

/** A picture cut out of the original art, positioned relative to its base (bottom centre). */
export interface Stamp {
  width: number;
  /** How far the base sits below the ground it grows from. */
  rootDepth: number;
  pixels: Array<[number, number, number, number, number, number]>;
}

export class RockArt {
  readonly n: number;
  readonly massId: Uint8Array;
  readonly solid: Uint8Array;
  /** Terrain layer as palette indices (0 = empty). */
  readonly paint: Uint8Array;
  /** Decoration layer, RGBA. */
  readonly veg: PNG;
  massDist!: Float32Array;
  label!: Int32Array;
  stoneDist!: Float32Array;
  private readonly seeds: Seed[] = [];
  private poleD!: Float32Array;
  private poleX!: Float32Array;
  private poleY!: Float32Array;
  private gap!: Float32Array;
  private dark!: Uint8Array;
  private lava!: Uint8Array;
  private readonly mossCap: Uint8Array;
  private readonly mossEdges: MossEdge[] = [];
  private undersides: Surface[] | null = null;

  constructor(
    readonly width: number,
    readonly height: number,
    /** Mean water line: moss grows above it, sand below. */
    readonly water: number,
    readonly rand: Rand,
    readonly masses: MassDef[],
    private readonly seed: number,
  ) {
    this.n = width * height;
    this.massId = new Uint8Array(this.n);
    this.solid = new Uint8Array(this.n);
    this.paint = new Uint8Array(this.n);
    this.mossCap = new Uint8Array(this.n);
    this.veg = new PNG({ width, height });
  }

  // --- Rock ---------------------------------------------------------------------------

  /** Rasterise the outlines, cut the stones and paint them. */
  paintRocks(): void {
    const { width: W, height: H } = this;
    this.masses.forEach((mass, m) => {
      if (mass.crag !== false) mass.rings = mass.rings.map((ring) => this.crag(ring));
      scanPolygon(mass.rings, W, H, (y, x0, x1) => this.massId.fill(m + 1, y * W + x0, y * W + x1));
    });
    for (let i = 0; i < this.n; i++) this.solid[i] = this.massId[i] ? 1 : 0;
    this.massDist = maskDistance(this.solid, W, H);
    this.cutStones();
    this.paintStones();
  }

  /** Breaks long edges into angular facets with the odd step, like the original's hand-cut outlines. */
  private crag(ring: Pt[]): Pt[] {
    const { rand } = this;
    const onBorder = (p: Pt) => p[0] <= 0 || p[0] >= this.width || p[1] >= this.height || p[1] <= 0;
    const out: Pt[] = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      out.push(a);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 70 || (onBorder(a) && onBorder(b))) continue;
      const steps = Math.max(2, Math.round(len / rand.range(45, 80)));
      const nx = -(b[1] - a[1]) / len;
      const ny = (b[0] - a[0]) / len;
      for (let s = 1; s < steps; s++) {
        const t = (s + rand.range(-0.2, 0.2)) / steps;
        const px = a[0] + (b[0] - a[0]) * t;
        const py = a[1] + (b[1] - a[1]) * t;
        if (rand.chance(0.18)) {
          // A step: the edge jogs out (or in) and carries on.
          const k = rand.range(10, 22) * (rand.chance(0.6) ? 1 : -1);
          const along = rand.range(4, 10);
          out.push([px - ((b[0] - a[0]) / len) * along, py - ((b[1] - a[1]) / len) * along]);
          out.push([px + nx * k, py + ny * k]);
        } else {
          const k = rand.range(-9, 9);
          out.push([px + nx * k, py + ny * k]);
        }
      }
    }
    return out;
  }

  private cutStones(): void {
    const { width: W, height: H, rand } = this;
    this.masses.forEach((mass, m) => this.placeSeeds(mass, m));

    // Each pixel joins the nearest seed of its own mass (in that mass's stretched frame).
    const label = new Int32Array(this.n).fill(-1);
    const best = new Float32Array(this.n).fill(Infinity);
    this.seeds.forEach((seed, s) => {
      const mass = this.masses[seed.mass];
      const cos = Math.cos(mass.angle);
      const sin = Math.sin(mass.angle);
      const hx = Math.abs(cos) * seed.reach * mass.stretch + Math.abs(sin) * seed.reach;
      const hy = Math.abs(sin) * seed.reach * mass.stretch + Math.abs(cos) * seed.reach;
      const x0 = Math.max(0, Math.floor(seed.x - hx));
      const x1 = Math.min(W - 1, Math.ceil(seed.x + hx));
      const y0 = Math.max(0, Math.floor(seed.y - hy));
      const y1 = Math.min(H - 1, Math.ceil(seed.y + hy));
      const id = seed.mass + 1;
      for (let y = y0; y <= y1; y++) {
        const dy = y + 0.5 - seed.y;
        for (let x = x0; x <= x1; x++) {
          const i = y * W + x;
          if (this.massId[i] !== id || this.massDist[i] > seed.depth) continue;
          const dx = x + 0.5 - seed.x;
          const u = (dx * cos + dy * sin) / mass.stretch;
          const v = -dx * sin + dy * cos;
          const d = Math.sqrt(u * u + v * v);
          if (d <= seed.reach && d < best[i]) {
            best[i] = d;
            label[i] = s;
          }
        }
      }
    });

    // A layer of mortar under the tops of rubble rocks that ask for one. Only edges
    // facing well upwards count as tops, not the steep sides.
    if (this.masses.some((mass) => mass.core)) {
      const notTop = new Uint8Array(this.n).fill(1);
      this.masses.forEach((mass, m) => {
        if (!mass.core) return;
        for (const e of this.outlineEdges(m)) {
          if (e.ny > -0.7) continue;
          for (let d = 0; d <= e.len; d += 1) {
            const x = Math.round(e.a[0] + ((e.b[0] - e.a[0]) * d) / e.len);
            const y = Math.round(e.a[1] + ((e.b[1] - e.a[1]) * d) / e.len);
            if (x >= 0 && y >= 0 && x < W && y < H) notTop[y * W + x] = 0;
          }
        }
      });
      const fromTop = maskDistance(notTop, W, H);
      for (let i = 0; i < this.n; i++) {
        const mass = this.masses[this.massId[i] - 1];
        if (!mass?.core) continue;
        const top = mass.bandTop ?? mass.band ?? 0;
        if (fromTop[i] > top && fromTop[i] < top + mass.core && this.massDist[i] > 25) label[i] = -1;
      }
    }

    // Angular stones set into the rubble cores, clear of their neighbours.
    this.masses.forEach((mass, m) => {
      if (mass.style !== 'rubble' && !mass.core) return;
      const id = m + 1;
      const [bx0, by0, bx1, by1] = this.bounds(mass.rings[0]);
      const count = Math.round(((bx1 - bx0) * (by1 - by0)) / 20000);
      for (let k = 0; k < count; k++) {
        const cx = rand.range(bx0, bx1);
        const cy = rand.range(by0, by1);
        const r = rand.range(38, 85);
        const shape = this.shard(cx, cy, r, mass.angle + rand.range(-0.7, 0.7), rand.int(5, 7));
        let clash = false;
        scanPolygon([shape(1.5)], W, H, (y, x0, x1) => {
          for (let i = y * W + x0; i < y * W + x1; i++) if (this.massId[i] !== id || label[i] !== -1) clash = true;
        });
        if (clash) continue;
        const s = this.seeds.length;
        this.seeds.push({ x: cx, y: cy, mass: m, reach: 0, depth: 0 });
        scanPolygon([shape(1)], W, H, (y, x0, x1) => label.fill(s, y * W + x0, y * W + x1));
      }
    });

    let stoneDist = labelDistance(label, W, H);
    // Drop slivers too thin to read as stones; they become mortar.
    const thickness = new Float32Array(this.seeds.length);
    for (let i = 0; i < this.n; i++) if (label[i] >= 0 && stoneDist[i] > thickness[label[i]]) thickness[label[i]] = stoneDist[i];
    let dropped = false;
    for (let i = 0; i < this.n; i++) {
      if (label[i] >= 0 && thickness[label[i]] < 9) {
        label[i] = -1;
        dropped = true;
      }
    }
    if (dropped) stoneDist = labelDistance(label, W, H);
    this.label = label;
    this.stoneDist = stoneDist;

    // Per-stone properties: its most interior point, palette and gap.
    const S = this.seeds.length;
    this.poleD = new Float32Array(S);
    this.poleX = new Float32Array(S);
    this.poleY = new Float32Array(S);
    for (let i = 0; i < this.n; i++) {
      const s = label[i];
      if (s >= 0 && stoneDist[i] > this.poleD[s]) {
        this.poleD[s] = stoneDist[i];
        this.poleX[s] = i % W;
        this.poleY[s] = (i - (i % W)) / W;
      }
    }
    this.dark = new Uint8Array(S);
    this.lava = new Uint8Array(S);
    this.gap = new Float32Array(S);
    for (let s = 0; s < S; s++) {
      const mass = this.masses[this.seeds[s].mass];
      this.dark[s] = mass.darkAbove !== undefined && this.poleY[s] < mass.darkAbove + rand.range(-60, 60) ? 1 : 0;
      this.lava[s] = mass.lava?.(this.poleX[s], this.poleY[s]) ? 1 : 0;
      this.gap[s] = this.lava[s] ? 10 : this.poleD[s] < 14 ? 2 : rand.chance(0.3) ? 4.5 : 3;
    }
  }

  private placeSeeds(mass: MassDef, m: number): void {
    const { width: W, height: H, rand } = this;
    const cos = Math.cos(mass.angle);
    const sin = Math.sin(mass.angle);
    const toFrame = (x: number, y: number): Pt => [(x * cos + y * sin) / mass.stretch, -x * sin + y * cos];
    const toWorld = (u: number, v: number): Pt => [u * mass.stretch * cos - v * sin, u * mass.stretch * sin + v * cos];
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const [x, y] of mass.rings[0]) {
      const [u, v] = toFrame(x, y);
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    const accepted: Array<{ u: number; v: number; r: number }> = [];
    const cell = mass.size * 0.5;
    const grid = new Map<string, number[]>();
    const tries = Math.ceil(((maxU - minU) * (maxV - minV)) / (mass.size * mass.size)) * 30;
    const band = mass.band ?? 0;
    for (let t = 0; t < tries; t++) {
      const u = rand.range(minU, maxU);
      const v = rand.range(minV, maxV);
      const [x, y] = toWorld(u, v);
      const xi = Math.round(x);
      const yi = Math.round(y);
      if (xi < 0 || yi < 0 || xi >= W || yi >= H || this.massId[yi * W + xi] !== m + 1) continue;
      const depth0 = this.massDist[yi * W + xi];
      // Is the nearest edge above (a top) or below/beside? Rubble tops can get a shallower band.
      const up = this.massDist[Math.max(0, yi - 6) * W + xi];
      const down = this.massDist[Math.min(H - 1, yi + 6) * W + xi];
      const limit = down > up ? (mass.bandTop ?? band) : band;
      // Rubble cores are mortar with shards, not stones.
      if (mass.style === 'rubble' && depth0 > limit) continue;
      const r = mass.size * rand.range(0.55, 1.2);
      const cu = Math.floor(u / cell);
      const cv = Math.floor(v / cell);
      const span = Math.ceil((mass.size * 1.2) / cell);
      let ok = true;
      for (let du = -span; du <= span && ok; du++) {
        for (let dv = -span; dv <= span && ok; dv++) {
          for (const j of grid.get(`${cu + du},${cv + dv}`) ?? []) {
            const o = accepted[j];
            if (Math.hypot(o.u - u, o.v - v) < (o.r + r) * 0.5) {
              ok = false;
              break;
            }
          }
        }
      }
      if (!ok) continue;
      const key = `${cu},${cv}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(accepted.length);
      accepted.push({ u, v, r });
      const depth = mass.style === 'rubble' ? Math.max(depth0 + mass.size * 0.4, limit * rand.range(0.6, 1.15)) : Infinity;
      this.seeds.push({ x, y, mass: m, reach: mass.size * 1.6, depth });
    }
  }

  /** An angular shard shape around a point, returned as a function of scale. */
  private shard(cx: number, cy: number, r: number, angle: number, corners: number): (scale: number) => Pt[] {
    const { rand } = this;
    const angles = Array.from({ length: corners }, (_, k) => (k * Math.PI * 2) / corners + rand.range(-0.35, 0.35));
    const radii = angles.map(() => rand.range(0.55, 1.2));
    return (scale) =>
      angles.map((ang, k) => {
        const u = Math.cos(ang) * r * radii[k] * 1.6 * scale;
        const v = Math.sin(ang) * r * radii[k] * 0.8 * scale;
        return [cx + u * Math.cos(angle) - v * Math.sin(angle), cy + u * Math.sin(angle) + v * Math.cos(angle)] as Pt;
      });
  }

  private paintStones(): void {
    const { width: W, height: H, rand, label, stoneDist, massDist, gap, dark, lava } = this;
    const mortar = this.mortarTexture();
    const EDGE_INSET = 8;
    for (let i = 0; i < this.n; i++) {
      if (!this.massId[i]) continue;
      const s = label[i];
      const ds = stoneDist[i];
      if (s >= 0 && ds > gap[s]) {
        // Outline, a bevel of face colour, the light rim, then the face.
        const inner = this.poleD[s] - gap[s];
        const bevel = inner > 22 ? 4 : 0;
        const rim = Math.max(3, Math.min(9, inner * 0.24));
        const e = ds - gap[s];
        if (e <= 1.5) this.paint[i] = dark[s] ? DARK_OUTLINE : OUTLINE;
        else if (e <= 1.5 + bevel) this.paint[i] = dark[s] ? DARK_FACE : FACE;
        else if (e <= 1.5 + bevel + rim) this.paint[i] = dark[s] ? DARK_RIM : RIM;
        else this.paint[i] = dark[s] ? DARK_FACE : FACE;
        continue;
      }
      if (massDist[i] <= EDGE_INSET) continue;
      if (s >= 0) {
        if (lava[s]) this.paint[i] = ds <= gap[s] - 5 ? ORANGE : ds <= gap[s] - 2.5 ? MORTAR : MORTAR_LIGHT;
        else if (dark[s]) this.paint[i] = DARK_OUTLINE;
        else this.paint[i] = ds <= 1.5 ? MORTAR : MORTAR_LIGHT;
      } else {
        this.paint[i] = mortar[i] || MORTAR;
      }
    }

    // Spots: a big blot with a scatter of small ones.
    for (let s = 0; s < this.seeds.length; s++) {
      const inner = this.poleD[s] - gap[s];
      if (inner < 9) continue;
      const clipTo = (value: number): SpanFn => (y, x0, x1) => {
        for (let i = y * W + x0; i < y * W + x1; i++) if (label[i] === s && stoneDist[i] > gap[s] + 2.5) this.paint[i] = value;
      };
      const darkSpot = dark[s] ? DARK_SPOT : OUTLINE;
      const lightSpot = dark[s] ? DARK_SPOT_LIGHT : RIM;
      for (let k = rand.int(1, 2); k > 0; k--) {
        const r = inner * rand.range(0.25, 0.5);
        const a = rand.range(0, Math.PI * 2);
        const off = Math.max(0, inner - r - 4) * rand.range(0.2, 0.9);
        const cx = this.poleX[s] + Math.cos(a) * off;
        const cy = this.poleY[s] + Math.sin(a) * off;
        scanCircle(cx, cy, r, W, H, clipTo(rand.chance(0.7) ? darkSpot : lightSpot));
        for (let c = rand.int(1, 4); c > 0; c--) {
          const b = rand.range(0, Math.PI * 2);
          const rr = rand.range(2.5, Math.max(3, r * 0.4));
          const dist = r + rr + rand.range(1, 10);
          scanCircle(cx + Math.cos(b) * dist, cy + Math.sin(b) * dist, rr, W, H, clipTo(rand.chance(0.65) ? darkSpot : lightSpot));
        }
      }
    }

    // Bubbles in the orange cracks.
    this.masses.forEach((mass) => {
      if (!mass.lava) return;
      const [bx0, by0, bx1, by1] = this.bounds(mass.rings[0]);
      for (let k = Math.round(((bx1 - bx0) * (by1 - by0)) / 1500); k > 0; k--) {
        const x = rand.range(bx0, bx1);
        const y = rand.range(by0, by1);
        if (this.paint[Math.floor(y) * W + Math.floor(x)] !== ORANGE) continue;
        scanCircle(x, y, rand.range(2, 7), W, H, (yy, x0, x1) => {
          for (let j = yy * W + x0; j < yy * W + x1; j++) if (this.paint[j] === ORANGE) this.paint[j] = ORANGE_SPOT;
        });
      }
    });
  }

  /** Strata, dots and shards in the mortar of rubble cores. */
  private mortarTexture(): Uint8Array {
    const { width: W, height: H, rand } = this;
    const mortar = new Uint8Array(this.n);
    this.masses.forEach((mass, m) => {
      if (mass.style !== 'rubble' && !mass.core) return;
      const id = m + 1;
      const [bx0, by0, bx1, by1] = this.bounds(mass.rings[0]);
      const area = (bx1 - bx0) * (by1 - by0);
      const put = (value: number): SpanFn => (y, x0, x1) => {
        for (let i = y * W + x0; i < y * W + x1; i++) if (this.massId[i] === id) mortar[i] = value;
      };
      // Tapering bands that meet at sharp angles, like the chevrons in the original.
      for (let k = Math.round(area / 30000); k > 0; k--) {
        let x = rand.range(bx0, bx1);
        let y = rand.range(by0, by1);
        let a = mass.angle + rand.range(-0.45, 0.45) + (rand.chance(0.5) ? Math.PI : 0);
        let thick = rand.range(12, 40);
        const tone = rand.chance(0.75) ? MORTAR_LIGHT : MORTAR;
        for (let seg = rand.int(2, 6); seg > 0; seg--) {
          const len = rand.range(60, 170);
          const nx = x + Math.cos(a) * len;
          const ny = y + Math.sin(a) * len;
          const next = Math.max(4, thick * rand.range(0.5, 1.1));
          const px = -Math.sin(a) / 2;
          const py = Math.cos(a) / 2;
          scanPolygon(
            [[[x + px * thick, y + py * thick], [nx + px * next, ny + py * next], [nx - px * next, ny - py * next], [x - px * thick, y - py * thick]]],
            W,
            H,
            put(tone),
          );
          x = nx;
          y = ny;
          thick = next;
          a += rand.range(-0.9, 0.9);
        }
      }
      for (let k = Math.round(area / 4000); k > 0; k--) {
        scanCircle(rand.range(bx0, bx1), rand.range(by0, by1), rand.range(4, 14), W, H, put(rand.chance(0.5) ? MORTAR_LIGHT : MORTAR));
      }
      // Slivers and chips of stone.
      for (let k = Math.round(area / 7000); k > 0; k--) {
        const cx = rand.range(bx0, bx1);
        const cy = rand.range(by0, by1);
        const len = rand.chance(0.3) ? rand.range(24, 50) : rand.range(8, 24);
        const wid = len * rand.range(0.18, 0.45);
        const a = mass.angle + rand.range(-0.8, 0.8);
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const skew = rand.range(-0.4, 0.4) * len;
        const tri: Pt[] = [
          [cx - ca * len, cy - sa * len],
          [cx + ca * len * rand.range(0.4, 1) - sa * wid, cy + sa * len * rand.range(0.4, 1) + ca * wid],
          [cx + ca * (len * 0.6 + skew) + sa * wid * rand.range(0.2, 1), cy + sa * (len * 0.6 + skew) - ca * wid * rand.range(0.2, 1)],
        ];
        scanPolygon([tri], W, H, put(rand.pick([RIM, RIM, FACE, OUTLINE])));
      }
    });
    return mortar;
  }

  // --- Moss ---------------------------------------------------------------------------

  /**
   * Thick moss caps along every upward-facing stretch of outline above water, with
   * light blobs and flame-shaped drips. Caps follow the outline's facets, so their
   * tops are as crisp as the rock's, and bridge the small steps in it.
   */
  addMoss(): void {
    const { width: W, height: H, rand } = this;
    this.masses.forEach((mass, m) => {
      if (!mass.moss) return;
      const edges = this.outlineEdges(m);
      const dry = this.water - 25;
      const up = (e: MossEdge) => e.ny < -0.34 && e.a[1] < dry && e.b[1] < dry;
      // Short edges (the steps in a craggy outline) join the chain on either side of them.
      const keep = edges.map((e, k) => {
        if (up(e)) return true;
        const prev = edges[(k - 1 + edges.length) % edges.length];
        const next = edges[(k + 1) % edges.length];
        return e.len < 34 && up(prev) && up(next) && e.a[1] < dry && e.b[1] < dry;
      });
      const first = keep.indexOf(false);
      if (first < 0) return;
      let chain: MossEdge[] = [];
      for (let k = 1; k <= edges.length; k++) {
        const j = (first + k) % edges.length;
        if (keep[j]) chain.push(edges[j]);
        else if (chain.length) {
          this.mossChain(chain);
          chain = [];
        }
      }
    });

    // Light blobs, big and small, mostly towards the top of the cap.
    for (const e of this.mossEdges) {
      for (let k = Math.round((e.len / 9) * rand.range(0.5, 1.5)); k > 0; k--) {
        const u = rand.next();
        const t = e.t0 + (e.t1 - e.t0) * u;
        const roll = rand.next();
        const r = (roll < 0.55 ? rand.range(2, 5) : roll < 0.88 ? rand.range(6, 12) : rand.range(13, 20)) * Math.min(1, t / 38);
        const d = rand.range(r * 0.6, Math.max(r, t * 0.6));
        const cx = e.a[0] + (e.b[0] - e.a[0]) * u - e.nx * d;
        const cy = e.a[1] + (e.b[1] - e.a[1]) * u - e.ny * d;
        scanCircle(cx, cy, r, W, H, (yy, x0, x1) => {
          for (let i = yy * W + x0; i < yy * W + x1; i++) if (this.mossCap[i]) this.paint[i] = MOSS_LIGHT;
        });
      }
    }
    // Flame drips below the cap. Over rock they are terrain; in the air, decoration.
    for (const e of this.mossEdges) {
      for (let along = rand.range(0, 12); along < e.len; along += rand.range(5, 14)) {
        const u = along / e.len;
        const t = e.t0 + (e.t1 - e.t0) * u;
        const scale = Math.min(1, t / 34);
        const roll = rand.next();
        const len = (roll < 0.5 ? rand.range(8, 24) : roll < 0.85 ? rand.range(24, 60) : rand.range(60, 110)) * scale;
        const x = e.a[0] + (e.b[0] - e.a[0]) * u - e.nx * (t - 4);
        const y = e.a[1] + (e.b[1] - e.a[1]) * u - e.ny * (t - 4);
        this.flame(x, y, rand.range(3, 9) * scale, len);
      }
    }
  }

  /** Paints the cap along one chain of edges, tapering at both ends. */
  private mossChain(chain: MossEdge[]): void {
    const { width: W, height: H } = this;
    const total = chain.reduce((sum, e) => sum + e.len, 0);
    if (total < 30) return;
    const m = chain[0].mass;
    const thickness = (x: number, s: number, ny: number) => {
      const taper = Math.min(1, 0.3 + Math.min(s, total - s) / 55);
      const slope = ny < -0.34 ? 0.55 + 0.45 * -ny : 0.8;
      return (22 + 26 * noise1(this.seed + m, x / 90)) * taper * slope;
    };
    const setCap = (inside: boolean): SpanFn => (y, x0, x1) => {
      for (let i = y * W + x0; i < y * W + x1; i++) {
        if (inside && !this.solid[i]) continue;
        this.paint[i] = MOSS;
        this.mossCap[i] = 1;
      }
    };
    let s = 0;
    for (const e of chain) {
      e.t0 = thickness(e.a[0], s, e.ny);
      e.t1 = thickness(e.b[0], s + e.len, e.ny);
      s += e.len;
      const lift = 2;
      const [ax, ay] = e.a;
      const [bx, by] = e.b;
      scanPolygon(
        [[
          [ax + e.nx * lift, ay + e.ny * lift],
          [bx + e.nx * lift, by + e.ny * lift],
          [bx - e.nx * e.t1, by - e.ny * e.t1],
          [ax - e.nx * e.t0, ay - e.ny * e.t0],
        ]],
        W,
        H,
        setCap(false),
      );
      // Round off the joint with the next edge, inside the rock.
      scanCircle(bx - e.nx * e.t1 * 0.5, by - e.ny * e.t1 * 0.5, e.t1 * 0.55, W, H, setCap(true));
      this.mossEdges.push(e);
    }
  }

  private flame(x: number, top: number, halfWidth: number, length: number): void {
    const { width: W, height: H, rand } = this;
    const bend = rand.range(-0.3, 0.3) * length;
    const shape = (w: number, l: number): Pt[] => [
      [x - w, top],
      [x + w, top],
      [x + w * 0.45 + bend * 0.45, top + l * 0.55],
      [x + bend, top + l],
      [x - w * 0.45 + bend * 0.5, top + l * 0.5],
    ];
    const fill = (value: number, rgb: RGB): SpanFn => (y, x0, x1) => {
      for (let i = y * W + x0; i < y * W + x1; i++) {
        if (this.paint[i] !== 0 && !this.mossCap[i]) this.paint[i] = value;
        else if (this.paint[i] === 0) this.setVeg(i, rgb);
      }
    };
    scanPolygon([shape(halfWidth, length)], W, H, fill(MOSS, PALETTE[MOSS]));
    if (length > 14) {
      const light = rand.chance(0.6) ? MOSS_LIGHT : MOSS_HIGHLIGHT;
      scanPolygon([shape(halfWidth * 0.3, length * rand.range(0.5, 0.85))], W, H, fill(light, PALETTE[light]));
    }
  }

  // --- Hanging grass and vines --------------------------------------------------------

  /** Tufts of dark grass hanging from overhangs above the water, in patches. */
  addFringes(): void {
    const { width: W, height: H, rand } = this;
    this.masses.forEach((mass, m) => {
      if (!mass.fringe) return;
      for (const run of this.runs(this.underside(m, this.water - 30), 16)) {
        let next = 0;
        run.forEach(({ x, y }, k) => {
          if (k < next || noise1(this.seed + 31 + m, x / 110) < 0.36) return;
          next = k + rand.range(2, 6);
          const len = rand.chance(0.25) ? rand.range(22, 42) : rand.range(8, 22);
          const w = rand.range(2, 4.5);
          const tip = x + rand.range(-0.4, 0.4) * len;
          const rgb = PALETTE[rand.chance(0.7) ? MOSS_DARK : MOSS];
          scanPolygon([[[x - w, y - rand.range(3, 9)], [x + w, y - rand.range(3, 9)], [tip, y + len]]], W, H, (yy, x0, x1) => {
            for (let i = yy * W + x0; i < yy * W + x1; i++) this.setVeg(i, rgb);
          });
        });
      }
    });
  }

  /** Branching vines hanging from undersides and crawling down rock faces. */
  addVines(): void {
    const { rand } = this;
    this.masses.forEach((mass, m) => {
      if (mass.hangingVines) {
        const runs = this.runs(this.underside(m, mass.vinesUnderwater ? this.height : this.water - 10), 12);
        for (const run of runs) {
          const count = Math.floor((run.length / 1000) * mass.hangingVines + rand.next());
          for (let k = 0; k < count; k++) {
            const { x, y } = run[rand.int(0, run.length - 1)];
            this.vine(x, y - 3, Math.PI / 2, rand.range(60, 320), rand.range(4.5, 8), 3);
          }
        }
      }
      if (mass.crawlingVines) {
        // Start under the moss caps and wander down the rock.
        const edges = this.mossEdges.filter((e) => e.mass === m);
        const length = edges.reduce((sum, e) => sum + e.len, 0);
        for (let k = Math.round((length / 1000) * mass.crawlingVines); k > 0 && edges.length; k--) {
          const e = rand.pick(edges);
          const u = rand.next();
          const t = e.t0 + (e.t1 - e.t0) * u;
          this.creeper(e.a[0] + (e.b[0] - e.a[0]) * u - e.nx * t, e.a[1] + (e.b[1] - e.a[1]) * u - e.ny * t + 4, rand.range(80, 300), !!mass.vinesUnderwater);
        }
        if (mass.vinesUnderwater) {
          // And from anywhere along the sides.
          const sides = this.outlineEdges(m).filter((e) => Math.abs(e.nx) > 0.7);
          const height = sides.reduce((sum, e) => sum + e.len, 0);
          for (let k = Math.round((height / 1000) * mass.crawlingVines); k > 0 && sides.length; k--) {
            const e = rand.pick(sides);
            const u = rand.next();
            this.creeper(e.a[0] + (e.b[0] - e.a[0]) * u - e.nx * 8, e.a[1] + (e.b[1] - e.a[1]) * u, rand.range(100, 400), true);
          }
        }
      }
    });
  }

  /** A lightning-like branching vine, like the ones hanging off the original's rocks. */
  private vine(x: number, y: number, angle: number, length: number, width: number, depth: number): void {
    const { rand } = this;
    const rgb = PALETTE[MOSS];
    let a = angle;
    let kink = rand.range(8, 22);
    let nextBranch = rand.range(15, 40);
    for (let d = 0; d < length; d += 1.5) {
      const w = Math.max(1.6, width * (1 - 0.75 * (d / length)));
      this.vegDisc(x, y, w / 2, rgb);
      if (d >= kink) {
        kink = d + rand.range(8, 24);
        a = angle + rand.range(-0.65, 0.65);
      }
      if (depth > 0 && d >= nextBranch) {
        nextBranch = d + rand.range(15, 45);
        const side = rand.chance(0.5) ? 1 : -1;
        this.vine(x, y, a + side * rand.range(0.5, 1.2), (length - d) * rand.range(0.25, 0.6), w * 0.7, depth - 1);
      } else if (rand.chance(0.015)) {
        // A short twig.
        this.vine(x, y, a + (rand.chance(0.5) ? 1 : -1) * rand.range(0.8, 1.4), rand.range(6, 14), 2, 0);
      }
      x += Math.cos(a) * 1.5;
      y += Math.sin(a) * 1.5;
    }
  }

  /** A thin dark vine with spiky leaves creeping down over the rock. */
  private creeper(x: number, y: number, length: number, underwater: boolean): void {
    const { width: W, height: H, rand } = this;
    const stem = PALETTE[MOSS_DARK];
    let a = Math.PI / 2 + rand.range(-0.5, 0.5);
    for (let d = 0; d < length; d += 2) {
      const i = Math.floor(y) * W + Math.floor(x);
      if (x < 0 || y < 0 || x >= W || y >= H || this.paint[i] === 0 || (!underwater && y > this.water)) return;
      this.vegDisc(x, y, 1.3, stem);
      if (rand.chance(0.22)) {
        const side = rand.chance(0.5) ? 1 : -1;
        const la = a + side * rand.range(0.6, 1.3);
        const ll = rand.range(4, 11);
        const rgb = PALETTE[rand.chance(0.7) ? MOSS_DARK : MOSS];
        scanPolygon(
          [[[x - 1.5, y], [x + 1.5, y], [x + Math.cos(la) * ll, y + Math.sin(la) * ll]]],
          W,
          H,
          (yy, x0, x1) => {
            for (let j = yy * W + x0; j < yy * W + x1; j++) this.setVeg(j, rgb);
          },
        );
      }
      a += rand.range(-0.25, 0.25);
      a = Math.min(Math.PI * 0.85, Math.max(Math.PI * 0.15, a));
      x += Math.cos(a) * 2;
      y += Math.sin(a) * 2;
    }
  }

  // --- Sand, plants and trees ---------------------------------------------------------

  /** Sand on the tops below water in the given x ranges; returns the sand surface by column. */
  addSand(ranges: Array<[number, number]>): Map<number, number> {
    const { width: W, height: H } = this;
    const surface = new Map<number, number>();
    const inRange = (x: number) => ranges.some(([x0, x1]) => x >= x0 && x < x1);
    {
      const tops = this.tops(this.paint, (x, y) => inRange(x) && y > this.water + 200 && !!this.masses[this.owner(x, y + 3)]?.sand, 7);
      for (const { x, y } of tops) {
        if (!surface.has(x) || y < surface.get(x)!) surface.set(x, y);
        const t = 7 + 9 * noise1(this.seed + 7, x / 60);
        scanCircle(x + 0.5, y + t * 0.45, t * 0.55 + 1.5 * noise1(this.seed + 8, x / 9), W, H, (yy, a, b) => {
          for (let i = yy * W + a; i < yy * W + b; i++) if (this.paint[i] !== 0 || yy < y + 2) this.paint[i] = SAND;
        });
      }
    }
    return surface;
  }

  /** Scatter stamps along a surface (column -> ground height) in the given x ranges. */
  scatter(stamps: Stamp[], surface: Map<number, number>, ranges: Array<[number, number]>, spacing: [number, number]): void {
    const { rand } = this;
    for (const [x0, x1] of ranges) {
      let x = x0 + rand.range(10, 60);
      while (x < x1 - 20) {
        const stamp = rand.pick(stamps);
        const cx = Math.round(x);
        const ground = surface.get(cx);
        if (ground !== undefined) this.stamp(stamp, cx, ground, rand.chance(0.5));
        x += rand.range(spacing[0], spacing[1]) + stamp.width * 0.35;
      }
    }
  }

  /** Grow trees on flat stretches of moss. */
  addTrees(trees: Stamp[]): void {
    const { rand } = this;
    this.masses.forEach((mass, m) => {
      if (!mass.trees) return;
      const spots = this.mossEdges.filter((e) => e.mass === m && e.ny < -0.93 && e.len >= 36 && Math.min(e.t0, e.t1) > 14);
      const placed: number[] = [];
      for (let tries = 0; tries < 40 && placed.length < mass.trees && spots.length; tries++) {
        const e = rand.pick(spots);
        const x = Math.round((e.a[0] + e.b[0]) / 2);
        if (placed.some((px) => Math.abs(px - x) < 110)) continue;
        placed.push(x);
        this.stamp(rand.pick(trees), x, Math.round((e.a[1] + e.b[1]) / 2) + 2, rand.chance(0.5));
      }
    });
  }

  private stamp(stamp: Stamp, x: number, ground: number, flip: boolean): void {
    const baseY = ground + stamp.rootDepth;
    for (const [dx, dy, r, g, b, a] of stamp.pixels) {
      const px = x + (flip ? -dx : dx);
      const py = baseY + dy;
      if (px < 0 || py < 0 || px >= this.width || py >= this.height) continue;
      const o = (py * this.width + px) * 4;
      this.veg.data[o] = r;
      this.veg.data[o + 1] = g;
      this.veg.data[o + 2] = b;
      this.veg.data[o + 3] = a;
    }
  }

  // --- Output -------------------------------------------------------------------------

  terrainPng(): PNG {
    const png = new PNG({ width: this.width, height: this.height });
    for (let i = 0; i < this.n; i++) {
      const p = this.paint[i];
      if (!p) continue;
      const [r, g, b] = PALETTE[p];
      png.data[i * 4] = r;
      png.data[i * 4 + 1] = g;
      png.data[i * 4 + 2] = b;
      png.data[i * 4 + 3] = 255;
    }
    return png;
  }

  // --- Helpers ------------------------------------------------------------------------

  /** The edges of a mass's outline with their outward normals. */
  private outlineEdges(m: number): MossEdge[] {
    const ring = this.masses[m].rings[0];
    return ring.map((a, k): MossEdge => {
      const b = ring[(k + 1) % ring.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let nx = (b[1] - a[1]) / len;
      let ny = -(b[0] - a[0]) / len;
      // Make the normal point out of the rock.
      if (this.owner((a[0] + b[0]) / 2 + nx * 3, (a[1] + b[1]) / 2 + ny * 3) === m) {
        nx = -nx;
        ny = -ny;
      }
      return { mass: m, a, b, len, nx, ny, t0: 0, t1: 0 };
    });
  }

  /** Which mass a pixel belongs to (-1 for none). */
  private owner(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return this.massId[Math.floor(y) * this.width + Math.floor(x)] - 1;
  }

  private setVeg(i: number, rgb: RGB): void {
    const o = i * 4;
    this.veg.data[o] = rgb[0];
    this.veg.data[o + 1] = rgb[1];
    this.veg.data[o + 2] = rgb[2];
    this.veg.data[o + 3] = 255;
  }

  private vegDisc(x: number, y: number, r: number, rgb: RGB): void {
    scanCircle(x, y, Math.max(0.75, r), this.width, this.height, (yy, x0, x1) => {
      for (let i = yy * this.width + x0; i < yy * this.width + x1; i++) this.setVeg(i, rgb);
    });
  }

  /** Top edges of a layer with a gentle enough slope, where `keep` allows. */
  private tops(layer: Uint8Array, keep: (x: number, y: number) => boolean, maxSlope: number): Surface[] {
    const { width: W, height: H } = this;
    const isTop = (x: number, y: number) => layer[y * W + x] !== 0 && (y === 0 || layer[(y - 1) * W + x] === 0);
    const near = (x: number, y: number): number | null => {
      for (let d = 0; d <= 16; d++) {
        if (y - d >= 0 && isTop(x, y - d)) return y - d;
        if (y + d < H && isTop(x, y + d)) return y + d;
      }
      return null;
    };
    const out: Surface[] = [];
    for (let x = 6; x < W - 6; x++) {
      for (let y = 1; y < H; y++) {
        if (!isTop(x, y) || !keep(x, y)) continue;
        const left = near(x - 6, y);
        const right = near(x + 6, y);
        if (left === null || right === null || Math.abs(left - y) > maxSlope || Math.abs(right - y) > maxSlope) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  /** Bottom edges of a mass's outline (the first empty pixel below its rock) above a height. */
  private underside(m: number, above: number): Surface[] {
    const { width: W, height: H } = this;
    if (!this.undersides) {
      this.undersides = [];
      for (let x = 0; x < W; x++) {
        for (let y = 1; y < H; y++) {
          const i = y * W + x;
          if (this.solid[i] === 0 && this.solid[i - W] !== 0) this.undersides.push({ x, y });
        }
      }
    }
    return this.undersides.filter(({ x, y }) => y < above && this.owner(x, y - 1) === m);
  }

  /** Groups surface points into continuous runs, dropping short ones (tiny bumps and corners). */
  private runs(points: Surface[], minRun: number): Surface[][] {
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const done: Surface[][] = [];
    let previous: Surface[][] = [];
    let current: Surface[][] = [];
    let column = -Infinity;
    for (const p of sorted) {
      if (p.x !== column) {
        // Runs that did not reach this column are finished.
        done.push(...previous);
        previous = p.x === column + 1 ? current : (done.push(...current), []);
        current = [];
        column = p.x;
      }
      const k = previous.findIndex((r) => Math.abs(r[r.length - 1].y - p.y) <= 3);
      if (k >= 0) {
        const [run] = previous.splice(k, 1);
        run.push(p);
        current.push(run);
      } else current.push([p]);
    }
    done.push(...previous, ...current);
    return done.filter((r) => r.length >= minRun);
  }

  private bounds(ring: readonly Pt[]): [number, number, number, number] {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return [Math.max(0, x0), Math.max(0, y0), Math.min(this.width, x1), Math.min(this.height, y1)];
  }
}

// --- Cut-outs from the original art ---------------------------------------------------

/** Every seabed plant (and shell) of the original vegetation layer, as stamps. */
export function cutPlants(dir: string): Stamp[] {
  const v = PNG.sync.read(readFileSync(join(dir, 'veggiespixel.png')));
  const t = PNG.sync.read(readFileSync(join(dir, 'worldpixel.png')));
  const vw = v.width;
  const seen = new Uint8Array(vw * v.height);
  const stamps: Stamp[] = [];
  // The seabed plants live below y=2500 (the vines higher up are shaped to their rocks).
  for (let y = 2500; y < v.height; y++) {
    for (let x = 0; x < vw; x++) {
      const i = y * vw + x;
      if (seen[i] || v.data[i * 4 + 3] === 0) continue;
      const component = flood(i, vw, v.height, seen, (k) => v.data[k * 4 + 3] !== 0);
      if (component.length < 12) continue;
      let minX = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const k of component) {
        minX = Math.min(minX, k % vw);
        maxX = Math.max(maxX, k % vw);
        maxY = Math.max(maxY, Math.floor(k / vw));
      }
      const baseX = Math.round((minX + maxX) / 2);
      let ground = maxY;
      for (let yy = maxY - 40; yy <= maxY + 10; yy++) {
        if (t.data[(yy * vw + baseX) * 4 + 3] !== 0) {
          ground = yy;
          break;
        }
      }
      stamps.push(toStamp(v, component, baseX, maxY, maxX - minX + 1, maxY - ground));
    }
  }
  if (stamps.length === 0) throw new Error('No plants found in the original vegetation layer');
  return stamps;
}

/**
 * The little trees on the original's left cliff top, cut out by colour from
 * their trunks up. Each entry is the area to search, the row of the trunk's
 * base, and a test for moss that touches the tree and must be left behind.
 */
const TREES: Array<{ box: [number, number, number, number]; base: number; skip: (x: number, y: number) => boolean }> = [
  { box: [0, 495, 125, 610], base: 603, skip: (x, y) => x < 48 && y >= 555 },
  { box: [140, 605, 250, 700], base: 686, skip: (x, y) => x < 158 || (x < 166 && y >= 679) },
  { box: [195, 690, 250, 750], base: 748, skip: (x, y) => x < 206 || y < 698 },
];

export function cutTrees(dir: string): Stamp[] {
  const w = PNG.sync.read(readFileSync(join(dir, 'worldpixel.png')));
  const ww = w.width;
  const at = (k: number) => [w.data[k * 4], w.data[k * 4 + 1], w.data[k * 4 + 2], w.data[k * 4 + 3]];
  const isTrunk = (k: number) => {
    const [r, g, b, a] = at(k);
    return a !== 0 && r > 150 && g > 130 && b < 100 && r - b > 70;
  };
  const isTree = (k: number) => {
    const [r, g, b, a] = at(k);
    return a !== 0 && ((g > r + 15 && g > b + 30) || isTrunk(k));
  };
  return TREES.map(({ box: [x0, y0, x1, y1], base, skip }) => {
    const seen = new Uint8Array(ww * w.height);
    const inside = (k: number) => {
      const x = k % ww;
      const y = Math.floor(k / ww);
      return x >= x0 && x < x1 && y >= y0 && y < Math.min(y1, base) && !skip(x, y) && isTree(k);
    };
    const pixels: number[] = [];
    for (let y = base - 6; y < base; y++) {
      for (let x = x0; x < x1; x++) {
        const k = y * ww + x;
        if (!seen[k] && isTrunk(k) && inside(k)) pixels.push(...flood(k, ww, w.height, seen, inside));
      }
    }
    let minX = Infinity;
    let maxX = -Infinity;
    for (const k of pixels) {
      minX = Math.min(minX, k % ww);
      maxX = Math.max(maxX, k % ww);
    }
    // Trunk base x: the middle of the trunk on its bottom row.
    const bottom = pixels.filter((k) => Math.floor(k / ww) === base - 1 && isTrunk(k)).map((k) => k % ww);
    const baseX = bottom.length ? Math.round(bottom.reduce((a, b) => a + b, 0) / bottom.length) : Math.round((minX + maxX) / 2);
    return toStamp(w, pixels, baseX, base - 1, maxX - minX + 1, 3);
  });
}

function toStamp(png: PNG, pixels: number[], baseX: number, baseY: number, width: number, rootDepth: number): Stamp {
  return {
    width,
    rootDepth,
    pixels: pixels.map((k) => {
      const o = k * 4;
      return [(k % png.width) - baseX, Math.floor(k / png.width) - baseY, png.data[o], png.data[o + 1], png.data[o + 2], png.data[o + 3]];
    }),
  };
}

function flood(start: number, w: number, h: number, seen: Uint8Array, inside: (k: number) => boolean): number[] {
  const stack = [start];
  const out: number[] = [];
  seen[start] = 1;
  while (stack.length) {
    const k = stack.pop()!;
    out.push(k);
    const x = k % w;
    const y = (k - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!seen[j] && inside(j)) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  return out;
}
