/**
 * Generates the source art for the second level, "Arch Rock", in the style of
 * the original hand-drawn level: flat stones with a light rim, an outline and
 * spots, set in dark mortar, with moss caps and drips on the tops above water,
 * sand below, and the original seaweed and coral replanted on the reef.
 *
 * The layout is authored below as rock outlines; stones are cut from them with
 * a stretched Voronoi pattern so each rock gets slabs that follow its shape.
 * The output is deterministic.
 *
 * Writes art/levels/arches/worldpixel.png (terrain, whose alpha is the level
 * collision) and veggiespixel.png (decoration). Run with `npm run assets:arches`,
 * then `npm run assets:level` to rebuild the game data.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { Rand, labelDistance, maskDistance, noise1, scanCircle, scanPolygon, type Pt } from './lib/raster';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 9216;
const H = 3001;
const WATER = 1505;
const SEED = 20260926;

// --- Palette (sampled from the original art) -------------------------------------
const PALETTE: Array<readonly [number, number, number]> = [];
const color = (r: number, g: number, b: number): number => PALETTE.push([r, g, b]) - 1;
PALETTE.push([0, 0, 0]); // 0: transparent
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

// --- Layout -------------------------------------------------------------------------
interface MassDef {
  name: string;
  /** Outline, then any holes (even-odd). */
  rings: Pt[][];
  /** "packed": stones everywhere. "rubble": stones along the edges around a mortar core. */
  style: 'packed' | 'rubble';
  /** Typical stone size across its short side, in pixels. */
  size: number;
  /** Direction the stones are stretched along (radians) and by how much. */
  angle: number;
  stretch: number;
  /** Rubble only: depth of the stone band along the edges. */
  band?: number;
  moss?: boolean;
  /** Stones centred above this height use the shaded palette of the original cliff tops. */
  darkAbove?: number;
  /** Region (in world pixels) whose gaps are filled with the orange of the original seabed cracks. */
  lava?: (x: number, y: number) => boolean;
}

const HALF_PI = Math.PI / 2;

/** Seabed top profile, left to right. */
const seabedProfile: Pt[] = [
  [0, 2760], [300, 2790], [700, 2840], [1100, 2860], [1450, 2840], [1640, 2800], [1700, 2700], [1760, 2660],
  [1830, 2700], [1880, 2800], [2300, 2830], [2700, 2800], [3000, 2770], [3300, 2800], [3600, 2785],
  [3760, 2720], [3810, 2470], [3870, 2420], [3930, 2440], [3960, 2620], [4020, 2820], [4150, 2930],
  [4450, 2975], [4750, 2965], [4880, 2910], [4940, 2720], [4990, 2520], [5040, 2480], [5100, 2520],
  [5160, 2720], [5300, 2790], [5650, 2800], [6400, 2795], [6700, 2760], [7000, 2785], [7200, 2720],
  [7380, 2520], [7520, 2330], [7640, 2180], [7780, 2090], [7980, 2060], [8160, 2100], [8330, 2240],
  [8470, 2470], [8600, 2690], [8800, 2740], [9216, 2740],
];

const masses: MassDef[] = [
  {
    name: 'seabed',
    rings: [[...seabedProfile, [W, H], [0, H]]],
    style: 'packed',
    size: 140,
    angle: 0,
    stretch: 2.2,
    lava: (x, y) => x > 3780 && x < 5180 && y > 2580,
  },
  {
    // Tall headland whose mossy ledge overhangs a grotto at the waterline.
    name: 'headland',
    rings: [[
      [0, 0], [150, 0], [178, 170], [140, 400], [232, 600], [420, 760], [610, 890], [830, 1000], [905, 1062],
      [880, 1130], [760, 1185], [560, 1232], [440, 1322], [405, 1480], [430, 1650], [520, 1850], [690, 2040],
      [900, 2290], [1150, 2560], [1350, 2760], [1450, 2900], [1450, H], [0, H],
    ]],
    style: 'rubble',
    size: 135,
    angle: HALF_PI,
    stretch: 1.8,
    band: 150,
    moss: true,
    darkAbove: 520,
  },
  {
    // A floating stone arch whose legs dip into the sea.
    name: 'arch',
    rings: [[
      [2040, 1650], [2060, 1400], [2110, 1180], [2200, 1000], [2330, 850], [2500, 750], [2700, 690], [2900, 690],
      [3100, 730], [3280, 820], [3420, 960], [3510, 1150], [3560, 1400], [3580, 1660], [3400, 1650], [3380, 1400],
      [3330, 1200], [3230, 1060], [3080, 960], [2900, 915], [2700, 915], [2520, 960], [2380, 1060], [2290, 1200],
      [2240, 1400], [2225, 1645],
    ]],
    style: 'packed',
    size: 115,
    angle: 0,
    stretch: 1.7,
    moss: true,
  },
  // Stepping stones up to the sky island.
  stone('step1', [[4090, 1310], [4150, 1280], [4300, 1288], [4335, 1330], [4285, 1372], [4130, 1376]]),
  stone('step2', [[4430, 1140], [4482, 1106], [4612, 1110], [4645, 1150], [4592, 1192], [4462, 1186]]),
  stone('step3', [[4740, 955], [4800, 916], [4932, 924], [4962, 966], [4902, 1006], [4772, 1000]]),
  {
    name: 'skyIsland',
    rings: [[
      [5060, 720], [5150, 690], [5300, 702], [5450, 680], [5600, 700], [5700, 742], [5660, 800], [5560, 880],
      [5470, 962], [5380, 1062], [5320, 1070], [5250, 980], [5150, 870], [5080, 800],
    ]],
    style: 'packed',
    size: 100,
    angle: 0,
    stretch: 1.8,
    moss: true,
  },
  {
    // A sea stack broken off its base: it hangs over the seabed, leaving a gap to swim through.
    name: 'stack',
    rings: [[
      [5830, 1082], [5900, 1052], [6000, 1040], [6100, 1056], [6200, 1092], [6232, 1200], [6250, 1400],
      [6270, 1700], [6292, 2000], [6320, 2200], [6300, 2320], [6200, 2385], [6060, 2402], [5930, 2390],
      [5810, 2330], [5752, 2200], [5770, 2000], [5790, 1700], [5800, 1400], [5812, 1200],
    ]],
    style: 'packed',
    size: 125,
    angle: HALF_PI,
    stretch: 1.8,
    moss: true,
  },
  {
    // The stump the stack broke from.
    name: 'stump',
    rings: [[
      [5560, 2860], [5640, 2790], [5760, 2745], [5880, 2712], [6040, 2700], [6190, 2716], [6330, 2750],
      [6450, 2800], [6520, 2860],
    ]],
    style: 'packed',
    size: 110,
    angle: 0,
    stretch: 2,
  },
  // Rocks around the surface and one floating in the deep.
  stone('bobber1', [[6830, 1470], [6880, 1430], [6962, 1440], [6992, 1500], [6950, 1562], [6860, 1556]], false),
  stone('bobber2', [[7100, 1385], [7140, 1350], [7212, 1360], [7232, 1410], [7180, 1452], [7110, 1442]]),
  stone('deepRock', [[6570, 2130], [6620, 2080], [6722, 2090], [6762, 2150], [6700, 2212], [6600, 2202]], false),
  stone('grottoRock', [[1180, 1900], [1230, 1862], [1330, 1880], [1352, 1930], [1300, 1968], [1200, 1956]], false),
  {
    // Stepped cliff with two mossy ledges.
    name: 'cliff',
    rings: [[
      [W, 0], [9010, 0], [8990, 260], [9030, 470], [8900, 610], [8700, 640], [8660, 680], [8720, 720],
      [8880, 770], [8860, 980], [8700, 1120], [8600, 1160], [8580, 1210], [8660, 1260], [8790, 1320],
      [8760, 1480], [8720, 1700], [8640, 1950], [8560, 2250], [8520, 2550], [8480, 2800], [8450, H], [W, H],
    ]],
    style: 'rubble',
    size: 135,
    angle: HALF_PI,
    stretch: 1.8,
    band: 150,
    moss: true,
    darkAbove: 560,
  },
];

function stone(name: string, outline: Pt[], moss = true): MassDef {
  return { name, rings: [outline], style: 'packed', size: 62, angle: 0, stretch: 2, moss };
}

/** Seabed stretches that get a sandy top with seaweed and coral. */
const SAND_RANGES: Array<[number, number]> = [
  [1000, 1650],
  [1900, 2400],
  [5250, 5600],
  [6500, 7150],
  [7300, 8420],
];

// --- Rasterise rock masses ------------------------------------------------------------
const N = W * H;
const rand = new Rand(SEED);
const massId = new Uint8Array(N);
masses.forEach((mass, m) => {
  const rings = mass.rings.map((ring) => roughen(ring, rand));
  mass.rings = rings;
  scanPolygon(rings, W, H, (y, x0, x1) => massId.fill(m + 1, y * W + x0, y * W + x1));
});
const solid = new Uint8Array(N);
for (let i = 0; i < N; i++) solid[i] = massId[i] ? 1 : 0;
const massDist = maskDistance(solid, W, H);

/** Adds small kinks to long edges so outlines look hand-cut rather than ruled. */
function roughen(ring: Pt[], r: Rand): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    out.push(a);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const onEdge = (p: Pt) => p[0] <= 0 || p[0] >= W || p[1] >= H || p[1] <= 0;
    if (len < 150 || (onEdge(a) && onEdge(b))) continue;
    const steps = Math.floor(len / 110);
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    for (let s = 1; s < steps; s++) {
      const t = (s + r.range(-0.25, 0.25)) / steps;
      const k = r.range(-7, 7);
      out.push([a[0] + (b[0] - a[0]) * t + nx * k, a[1] + (b[1] - a[1]) * t + ny * k]);
    }
  }
  return out;
}

// --- Stones -----------------------------------------------------------------------------
interface Seed {
  x: number;
  y: number;
  mass: number;
  /** Largest reach in the mass's stretched frame. */
  reach: number;
  /** Rubble edge stones stop this far in from the outline, giving them a straight inner edge. */
  depth: number;
}

const seeds: Seed[] = [];
masses.forEach((mass, m) => placeSeeds(mass, m));

function placeSeeds(mass: MassDef, m: number): void {
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
  const key = (u: number, v: number) => `${Math.floor(u / cell)},${Math.floor(v / cell)}`;
  const tries = Math.ceil(((maxU - minU) * (maxV - minV)) / (mass.size * mass.size)) * 30;
  for (let t = 0; t < tries; t++) {
    const u = rand.range(minU, maxU);
    const v = rand.range(minV, maxV);
    const [x, y] = toWorld(u, v);
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= W || yi >= H || massId[yi * W + xi] !== m + 1) continue;
    const depth0 = massDist[yi * W + xi];
    const core = mass.style === 'rubble' && depth0 > (mass.band ?? 0);
    // Rubble cores are mortar with shards (drawn later), not stones.
    if (core) continue;
    const r = mass.size * rand.range(0.55, 1.2);
    let ok = true;
    const cu = Math.floor(u / cell);
    const cv = Math.floor(v / cell);
    const span = Math.ceil((mass.size * 1.2) / cell);
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
    const k = key(u, v);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push(accepted.length);
    accepted.push({ u, v, r });
    const band = mass.band ?? 0;
    const depth = mass.style === 'rubble' ? Math.max(depth0 + mass.size * 0.4, band * rand.range(0.6, 1.15)) : Infinity;
    seeds.push({ x, y, mass: m, reach: mass.size * 1.6, depth });
  }
}

// Each pixel joins the nearest seed of its own mass (in that mass's stretched frame).
const label = new Int32Array(N).fill(-1);
{
  const best = new Float32Array(N).fill(Infinity);
  seeds.forEach((seed, s) => {
    const mass = masses[seed.mass];
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
        if (massId[i] !== id || massDist[i] > seed.depth) continue;
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
}
// Angular stones embedded in the rubble cores, clear of their neighbours.
masses.forEach((mass, m) => {
  if (mass.style !== 'rubble') return;
  const id = m + 1;
  const [bx0, by0, bx1, by1] = bounds(mass.rings[0]);
  const count = Math.round(((bx1 - bx0) * (by1 - by0)) / 9000);
  for (let n = 0; n < count; n++) {
    const cx = rand.range(bx0, bx1);
    const cy = rand.range(by0, by1);
    const r = rand.chance(0.3) ? rand.range(30, 58) : rand.range(13, 30);
    const a0 = mass.angle + rand.range(-0.6, 0.6);
    const corners = rand.int(4, 7);
    const angles = Array.from({ length: corners }, (_, k) => (k * Math.PI * 2) / corners + rand.range(-0.3, 0.3));
    const radii = angles.map(() => rand.range(0.7, 1.15));
    const shape = (scale: number): Pt[] => {
      const pts: Pt[] = [];
      for (let k = 0; k < corners; k++) {
        const ang = angles[k];
        const u = Math.cos(ang) * r * radii[k] * 1.6 * scale;
        const v = Math.sin(ang) * r * radii[k] * 0.8 * scale;
        pts.push([cx + u * Math.cos(a0) - v * Math.sin(a0), cy + u * Math.sin(a0) + v * Math.cos(a0)]);
      }
      return pts;
    };
    let clash = false;
    scanPolygon([shape(1.5)], W, H, (y, x0, x1) => {
      for (let i = y * W + x0; i < y * W + x1; i++) if (massId[i] !== id || label[i] !== -1) clash = true;
    });
    if (clash) continue;
    const s = seeds.length;
    seeds.push({ x: cx, y: cy, mass: m, reach: 0, depth: 0 });
    scanPolygon([shape(1)], W, H, (y, x0, x1) => label.fill(s, y * W + x0, y * W + x1));
  }
});
let stoneDist = labelDistance(label, W, H);
{
  // Drop slivers too thin to read as stones; they become mortar.
  const thickness = new Float32Array(seeds.length);
  for (let i = 0; i < N; i++) if (label[i] >= 0 && stoneDist[i] > thickness[label[i]]) thickness[label[i]] = stoneDist[i];
  let dropped = 0;
  for (let i = 0; i < N; i++) {
    if (label[i] >= 0 && thickness[label[i]] < 9) {
      label[i] = -1;
      dropped++;
    }
  }
  if (dropped) stoneDist = labelDistance(label, W, H);
}

// Per-stone properties: its most interior point, size, palette and gap.
const S = seeds.length;
const poleD = new Float32Array(S);
const poleX = new Float32Array(S);
const poleY = new Float32Array(S);
for (let i = 0; i < N; i++) {
  const s = label[i];
  if (s >= 0 && stoneDist[i] > poleD[s]) {
    poleD[s] = stoneDist[i];
    poleX[s] = i % W;
    poleY[s] = (i - (i % W)) / W;
  }
}
const dark = new Uint8Array(S);
const lava = new Uint8Array(S);
const gap = new Float32Array(S);
const rimWidth = new Float32Array(S);
for (let s = 0; s < S; s++) {
  const mass = masses[seeds[s].mass];
  dark[s] = mass.darkAbove !== undefined && poleY[s] < mass.darkAbove + rand.range(-60, 60) ? 1 : 0;
  lava[s] = mass.lava?.(poleX[s], poleY[s]) ? 1 : 0;
  gap[s] = lava[s] ? 10 : poleD[s] < 14 ? 2 : rand.chance(0.3) ? 4.5 : 3;
  rimWidth[s] = Math.max(3, Math.min(9, (poleD[s] - gap[s]) * 0.24));
}

// --- Mortar texture for rubble cores and orange cracks -----------------------------------
const mortar = new Uint8Array(N); // palette index, 0 = plain mortar
masses.forEach((mass, m) => {
  if (mass.style !== 'rubble') return;
  const id = m + 1;
  const inCore = (i: number) => massId[i] === id;
  const [bx0, by0, bx1, by1] = bounds(mass.rings[0]);
  const area = (bx1 - bx0) * (by1 - by0);
  const put = (value: number) => (y: number, x0: number, x1: number) => {
    for (let i = y * W + x0; i < y * W + x1; i++) if (inCore(i)) mortar[i] = value;
  };
  // Strata: zig-zag bands running along the rock.
  for (let n = Math.round(area / 45000); n > 0; n--) {
    let x = rand.range(bx0, bx1);
    let y = rand.range(by0, by1);
    let a = mass.angle + rand.range(-0.45, 0.45) + (rand.chance(0.5) ? Math.PI : 0);
    let thick = rand.range(14, 42);
    for (let seg = rand.int(2, 5); seg > 0; seg--) {
      const len = rand.range(70, 180);
      const nx = x + Math.cos(a) * len;
      const ny = y + Math.sin(a) * len;
      const next = Math.max(4, thick * rand.range(0.5, 1.1));
      const px = -Math.sin(a) / 2;
      const py = Math.cos(a) / 2;
      // Tapering quads that meet at sharp angles, like the chevrons in the original.
      scanPolygon(
        [[[x + px * thick, y + py * thick], [nx + px * next, ny + py * next], [nx - px * next, ny - py * next], [x - px * thick, y - py * thick]]],
        W,
        H,
        put(MORTAR_LIGHT),
      );
      x = nx;
      y = ny;
      thick = next;
      a += rand.range(-0.9, 0.9);
    }
  }
  for (let n = Math.round(area / 6000); n > 0; n--) {
    scanCircle(rand.range(bx0, bx1), rand.range(by0, by1), rand.range(4, 14), W, H, put(rand.chance(0.5) ? MORTAR_LIGHT : MORTAR));
  }
  for (let n = Math.round(area / 16000); n > 0; n--) {
    const cx = rand.range(bx0, bx1);
    const cy = rand.range(by0, by1);
    const r = rand.chance(0.3) ? rand.range(14, 26) : rand.range(6, 14);
    const a = mass.angle + rand.range(-0.6, 0.6);
    const corners = rand.chance(0.5) ? 3 : 4;
    const shard: Pt[] = [];
    for (let k = 0; k < corners; k++) {
      const ang = (k * Math.PI * 2) / corners + rand.range(-0.4, 0.4);
      const rr = r * rand.range(0.6, 1.1);
      const u = Math.cos(ang) * rr * 1.7;
      const v = Math.sin(ang) * rr * 0.6;
      shard.push([cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)]);
    }
    scanPolygon([shard], W, H, put(rand.pick([RIM, RIM, FACE, OUTLINE])));
  }
});

function bounds(ring: readonly Pt[]): [number, number, number, number] {
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
  return [Math.max(0, x0), Math.max(0, y0), Math.min(W, x1), Math.min(H, y1)];
}

// --- Paint the terrain --------------------------------------------------------------------
const paint = new Uint8Array(N);
const EDGE_INSET = 8;
for (let i = 0; i < N; i++) {
  if (!massId[i]) continue;
  const s = label[i];
  const ds = stoneDist[i];
  if (s >= 0 && ds > gap[s]) {
    const e = ds - gap[s];
    if (e <= 1.5) paint[i] = dark[s] ? DARK_OUTLINE : OUTLINE;
    else if (e <= 1.5 + rimWidth[s]) paint[i] = dark[s] ? DARK_RIM : RIM;
    else paint[i] = dark[s] ? DARK_FACE : FACE;
    continue;
  }
  if (massDist[i] <= EDGE_INSET) continue;
  if (s >= 0) {
    // Gap between stones.
    if (lava[s]) paint[i] = ds <= gap[s] - 5 ? ORANGE : ds <= gap[s] - 2.5 ? MORTAR : MORTAR_LIGHT;
    else if (dark[s]) paint[i] = DARK_OUTLINE;
    else paint[i] = ds <= 1.5 ? MORTAR : MORTAR_LIGHT;
  } else {
    paint[i] = mortar[i] || MORTAR;
  }
}

// Spots on the stones: a big blot with a scatter of small ones, like the original.
for (let s = 0; s < S; s++) {
  const inner = poleD[s] - gap[s];
  if (inner < 9) continue;
  const clipTo = (value: number) => (y: number, x0: number, x1: number) => {
    for (let i = y * W + x0; i < y * W + x1; i++) if (label[i] === s && stoneDist[i] > gap[s] + 2.5) paint[i] = value;
  };
  const darkSpot = dark[s] ? DARK_SPOT : OUTLINE;
  const lightSpot = dark[s] ? DARK_SPOT_LIGHT : RIM;
  const spots = rand.int(1, 2);
  for (let k = 0; k < spots; k++) {
    const r = inner * rand.range(0.25, 0.5);
    const a = rand.range(0, Math.PI * 2);
    const off = Math.max(0, inner - r - 4) * rand.range(0.2, 0.9);
    const cx = poleX[s] + Math.cos(a) * off;
    const cy = poleY[s] + Math.sin(a) * off;
    scanCircle(cx, cy, r, W, H, clipTo(rand.chance(0.7) ? darkSpot : lightSpot));
    for (let n = rand.int(1, 4); n > 0; n--) {
      const b = rand.range(0, Math.PI * 2);
      const rr = rand.range(2.5, Math.max(3, r * 0.4));
      const dist = r + rr + rand.range(1, 10);
      scanCircle(cx + Math.cos(b) * dist, cy + Math.sin(b) * dist, rr, W, H, clipTo(rand.chance(0.65) ? darkSpot : lightSpot));
    }
  }
}

// Orange bubbles in the seabed cracks.
for (let n = 0; n < 2500; n++) {
  const x = rand.range(3780, 5180);
  const y = rand.range(2580, H);
  const i = Math.floor(y) * W + Math.floor(x);
  if (paint[i] !== ORANGE) continue;
  scanCircle(x, y, rand.range(2, 7), W, H, (yy, x0, x1) => {
    for (let j = yy * W + x0; j < yy * W + x1; j++) if (paint[j] === ORANGE) paint[j] = ORANGE_SPOT;
  });
}

// --- Moss and sand on the tops --------------------------------------------------------------
interface Surface {
  x: number;
  y: number;
}

/** Top edges of the painted rock (with a gentle enough slope) for a mass, inside a y range. */
function tops(
  m: number | null,
  yMin: number,
  yMax: number,
  maxSlope: number,
  xMin = 0,
  xMax = W,
  layer: Uint8Array = paint,
): Surface[] {
  const out: Surface[] = [];
  const isTop = (x: number, y: number) => {
    const i = y * W + x;
    return layer[i] !== 0 && (y === 0 || layer[i - W] === 0);
  };
  const near = (x: number, y: number): number | null => {
    for (let d = 0; d <= 16; d++) {
      if (y - d >= 0 && isTop(x, y - d)) return y - d;
      if (y + d < H && isTop(x, y + d)) return y + d;
    }
    return null;
  };
  for (let x = Math.max(6, xMin); x < Math.min(W - 6, xMax); x++) {
    for (let y = Math.max(1, yMin); y < Math.min(H, yMax); y++) {
      const i = y * W + x;
      if (!isTop(x, y)) continue;
      if (m !== null && massId[i] !== m + 1 && massId[i + 2 * W] !== m + 1) continue;
      const left = near(x - 6, y);
      const right = near(x + 6, y);
      if (left === null || right === null) continue;
      if (Math.abs(left - y) > maxSlope || Math.abs(right - y) > maxSlope) continue;
      out.push({ x, y });
    }
  }
  return out;
}

const mossThickness = (m: number, x: number) => 18 + 24 * noise1(SEED + m, x / 80);

/** Groups surface points into continuous runs and drops short ones (tiny bumps and corners). */
function surfaceRuns(points: Surface[], minRun: number): Surface[][] {
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

// Moss caps: 1 = cap, 2 = drip, 3/4 = drip highlights.
const mossMask = new Uint8Array(N);
// Follow the rock outline rather than the painted stones, so caps bridge the notches between them.
const mossRuns = masses.map((mass, m) => (mass.moss ? surfaceRuns(tops(m, 0, WATER - 25, 10, 0, W, solid), 24) : []));
/** Cap thickness, tapering towards the ends of a run so caps thin out instead of ending in a blob. */
const capAt = (m: number, run: Surface[], k: number) =>
  mossThickness(m, run[k].x) * Math.min(1, 0.3 + Math.min(k, run.length - 1 - k) / 45);
mossRuns.forEach((runs, m) => {
  const setMoss = (y: number, x0: number, x1: number) => {
    for (let i = y * W + x0; i < y * W + x1; i++) if (!mossMask[i]) mossMask[i] = 1;
  };
  for (const run of runs) {
    run.forEach(({ x, y }, k) => {
      const t = capAt(m, run, k);
      const bump = (t / 9) * noise1(SEED + 99, x / 13);
      scanCircle(x + 0.5, y + t * 0.4, t * 0.6 + bump, W, H, setMoss);
    });
  }
  // Drips over the rock face below the cap.
  for (const run of runs) {
    run.forEach(({ x, y }, k) => {
      if (!rand.chance(1 / 6)) return;
      const t = capAt(m, run, k);
      const top = y + t * 0.8;
      const w = rand.range(3, 8) * Math.min(1, t / 20);
      const len = (rand.chance(0.3) ? rand.range(26, 64) : rand.range(8, 24)) * Math.min(1, t / 24);
      const tip = x + rand.range(-4, 4);
      const onRock = (value: number) => (yy: number, x0: number, x1: number) => {
        for (let i = yy * W + x0; i < yy * W + x1; i++) if (paint[i] !== 0 && (mossMask[i] === 0 || mossMask[i] >= 2)) mossMask[i] = value;
      };
      scanPolygon([[[x - w, top - 4], [x + w, top - 4], [tip, top + len]]], W, H, onRock(2));
      if (len > 16) scanPolygon([[[x - w * 0.3, top - 4], [x + w * 0.3, top - 4], [tip, top + len * 0.8]]], W, H, onRock(rand.chance(0.5) ? 3 : 4));
    });
  }
});
for (let i = 0; i < N; i++) {
  if (mossMask[i] === 1 || mossMask[i] === 2) paint[i] = MOSS;
  else if (mossMask[i] === 3) paint[i] = MOSS_LIGHT;
  else if (mossMask[i] === 4) paint[i] = MOSS_HIGHLIGHT;
}
// Light blobs in the caps, big and small.
mossRuns.forEach((runs, m) => {
  for (const run of runs) {
    run.forEach(({ x, y }, k) => {
      if (!rand.chance(1 / 6)) return;
      const t = capAt(m, run, k);
      const r = rand.chance(0.35) ? rand.range(t * 0.2, t * 0.42) : rand.range(2.5, Math.max(3, t * 0.16));
      scanCircle(x + rand.range(-3, 3), y + rand.range(t * 0.1, t * 0.65), r, W, H, (yy, x0, x1) => {
        for (let i = yy * W + x0; i < yy * W + x1; i++) if (mossMask[i] === 1) paint[i] = MOSS_LIGHT;
      });
    });
  }
});
// A darker fringe of moss where the caps meet the rock.
for (let i = W; i < N - W; i++) {
  if (paint[i] === MOSS && mossMask[i] === 1 && mossMask[i + W] === 0 && paint[i + W] !== 0 && (i * 7919) % 5 < 2) paint[i] = MOSS_DARK;
}

// Sand on the seabed in the planted stretches.
const sandTops: Surface[] = [];
const sandy = new Set(['seabed', 'headland', 'cliff', 'stump'].map((n) => masses.findIndex((m) => m.name === n)));
for (const [x0, x1] of SAND_RANGES) {
  sandTops.push(...tops(null, WATER + 200, H, 7, x0, x1).filter(({ x, y }) => sandy.has(massId[(y + 3) * W + x] - 1)));
}
for (const { x, y } of sandTops) {
  const t = 7 + 9 * noise1(SEED + 7, x / 60);
  scanCircle(x + 0.5, y + t * 0.45, t * 0.55 + 1.5 * noise1(SEED + 8, x / 9), W, H, (yy, x0, x1) => {
    for (let i = yy * W + x0; i < yy * W + x1; i++) {
      if (paint[i] !== 0 || yy < y + 2) paint[i] = SAND;
    }
  });
}

// --- Vegetation: replant the original seaweed and coral ----------------------------------------
const veg = new PNG({ width: W, height: H });
const plants = extractPlants();
{
  const byColumn = new Map<number, number>();
  for (const { x, y } of sandTops) if (!byColumn.has(x) || y < byColumn.get(x)!) byColumn.set(x, y);
  for (const [x0, x1] of SAND_RANGES) {
    let x = x0 + rand.range(10, 60);
    while (x < x1 - 20) {
      const plant = rand.pick(plants);
      const cx = Math.round(x);
      const top = byColumn.get(cx);
      if (top !== undefined) stampPlant(plant, cx, top);
      x += rand.range(18, 70) + plant.width * 0.35;
    }
  }
}

interface Plant {
  width: number;
  /** Pixels relative to the plant's base (bottom centre), and their colours. */
  pixels: Array<[number, number, number, number, number, number]>;
  /** How far the base sits below the sand surface in the original. */
  rootDepth: number;
}

/** Cuts every seabed plant out of the original vegetation layer. */
function extractPlants(): Plant[] {
  const v = PNG.sync.read(readFileSync(join(root, 'art/levels/cove/veggiespixel.png')));
  const t = PNG.sync.read(readFileSync(join(root, 'art/levels/cove/worldpixel.png')));
  const vw = v.width;
  const seen = new Uint8Array(vw * v.height);
  const result: Plant[] = [];
  // The seabed plants of the original live below y=2500 (the vines higher up are shaped to their rocks).
  for (let y = 2500; y < v.height; y++) {
    for (let x = 0; x < vw; x++) {
      const i = y * vw + x;
      if (seen[i] || v.data[i * 4 + 3] === 0) continue;
      const stack = [i];
      seen[i] = 1;
      const px: number[] = [];
      while (stack.length) {
        const j = stack.pop()!;
        px.push(j);
        const jx = j % vw;
        const jy = (j - jx) / vw;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = jx + dx;
            const ny = jy + dy;
            if (nx < 0 || ny < 0 || nx >= vw || ny >= v.height) continue;
            const k = ny * vw + nx;
            if (!seen[k] && v.data[k * 4 + 3] !== 0) {
              seen[k] = 1;
              stack.push(k);
            }
          }
        }
      }
      if (px.length < 40) continue;
      let minX = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const j of px) {
        minX = Math.min(minX, j % vw);
        maxX = Math.max(maxX, j % vw);
        maxY = Math.max(maxY, Math.floor(j / vw));
      }
      const baseX = Math.round((minX + maxX) / 2);
      let surface = maxY;
      for (let yy = maxY - 40; yy <= maxY + 10; yy++) {
        if (t.data[(yy * vw + baseX) * 4 + 3] !== 0) {
          surface = yy;
          break;
        }
      }
      result.push({
        width: maxX - minX + 1,
        rootDepth: maxY - surface,
        pixels: px.map((j) => {
          const o = j * 4;
          return [(j % vw) - baseX, Math.floor(j / vw) - maxY, v.data[o], v.data[o + 1], v.data[o + 2], v.data[o + 3]];
        }),
      });
    }
  }
  if (result.length === 0) throw new Error('No plants found in the original vegetation layer');
  return result;
}

function stampPlant(plant: Plant, x: number, surfaceY: number): void {
  const baseY = surfaceY + plant.rootDepth;
  for (const [dx, dy, r, g, b, a] of plant.pixels) {
    const px = x + dx;
    const py = baseY + dy;
    if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const o = (py * W + px) * 4;
    if (veg.data[o + 3] !== 0) continue;
    veg.data[o] = r;
    veg.data[o + 1] = g;
    veg.data[o + 2] = b;
    veg.data[o + 3] = a;
  }
}

// --- Write -------------------------------------------------------------------------------------
const world = new PNG({ width: W, height: H });
for (let i = 0; i < N; i++) {
  const p = paint[i];
  if (!p) continue;
  const [r, g, b] = PALETTE[p];
  const o = i * 4;
  world.data[o] = r;
  world.data[o + 1] = g;
  world.data[o + 2] = b;
  world.data[o + 3] = 255;
}
const outDir = join(root, 'art/levels/arches');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'worldpixel.png'), PNG.sync.write(world, { deflateLevel: 9 }));
writeFileSync(join(outDir, 'veggiespixel.png'), PNG.sync.write(veg, { deflateLevel: 9 }));
console.log(`Arch Rock ${W}x${H}: ${masses.length} rock masses, ${S} stones, ${plants.length} plant cut-outs`);
