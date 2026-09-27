/**
 * Builds game-ready data for every level from its source art in art/levels/<id>/.
 *
 *  - Composites the vegetation layer over the terrain art and slices it into
 *    small tiles (a whole level image is too large for many GPUs). Fully
 *    transparent tiles are skipped.
 *  - Extracts terrain collision outlines from the terrain alpha channel with
 *    marching squares (vegetation is decorative only, like the original).
 *  - Renders a small preview for the level select screen.
 *  - Flattens the translucent sky gradient over white into an opaque strip.
 *
 * Run with `npm run assets:level` (optionally followed by level ids). Outputs are
 * committed, so this only needs to be re-run when the source art in `art/` changes.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { WORLD } from '../src/config';
import { marchingSquares, type Point } from '../src/sim/geom/marchingSquares';
import { removeCloseVertices, signedArea, simplifyLoop } from '../src/sim/geom/polygon';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Every level in art/levels/<id>/{worldpixel,veggiespixel}.png, or just the ids given on the command line. */
const LEVEL_IDS = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(join(root, 'art/levels')).sort();
/** Big enough to keep the file count down, small enough for any GPU. */
const TILE = 1024;
/** Tiles overlap their right/bottom neighbours so no seams show when the camera zooms. */
const TILE_OVERLAP = 2;
const GRID = 4; // sampling step for collision extraction, in pixels
const ALPHA_THRESHOLD = 127.5;
const SIMPLIFY_TOLERANCE = 1.25;
const MIN_LOOP_AREA = 120;
const MIN_VERTEX_DISTANCE = 1.5;
const PREVIEW_HEIGHT = 180;
/** Matches the water overlay drawn in game (WaterView). */
const WATER_RGB = [0x26, 0x8c, 0xda];
const WATER_ALPHA = 0.64;

function readPng(path: string): PNG {
  return PNG.sync.read(readFileSync(join(root, path)));
}

function writePng(path: string, png: PNG): void {
  writeFileSync(join(root, path), PNG.sync.write(png, { deflateLevel: 9 }));
}

// --- Sky gradient -------------------------------------------------------------
const skySlice = readPng('art/sky/skyslice2.png');
const SKY_WIDTH = 4;
const sky = new PNG({ width: SKY_WIDTH, height: skySlice.height });
for (let y = 0; y < skySlice.height; y++) {
  const i = y * skySlice.width * 4;
  const a = skySlice.data[i + 3] / 255;
  for (let x = 0; x < SKY_WIDTH; x++) {
    const o = (y * SKY_WIDTH + x) * 4;
    for (let c = 0; c < 3; c++) sky.data[o + c] = Math.round(skySlice.data[i + c] * a + 255 * (1 - a));
    sky.data[o + 3] = 255;
  }
}
mkdirSync(join(root, 'public/assets/levels'), { recursive: true });
writePng('public/assets/levels/sky.png', sky);

for (const id of LEVEL_IDS) buildLevel(id);

function buildLevel(id: string): void {
  const world = readPng(`art/levels/${id}/worldpixel.png`);
  const veggies = readPng(`art/levels/${id}/veggiespixel.png`);
  const { width, height } = world;
  if (veggies.width !== width || veggies.height !== height) {
    throw new Error('Terrain and vegetation layers must have identical dimensions');
  }

  // --- Collision outlines (from terrain alpha only) --------------------------
  const nx = Math.ceil(width / GRID) + 1;
  const ny = Math.ceil(height / GRID) + 1;
  const alphaAt = (i: number, j: number): number => {
    const x = Math.min(width - 1, i * GRID);
    const y = Math.min(height - 1, j * GRID);
    return world.data[(y * width + x) * 4 + 3];
  };
  const rawLoops = marchingSquares(alphaAt, nx, ny, ALPHA_THRESHOLD);
  const loops: number[][] = [];
  let vertexCount = 0;
  for (const raw of rawLoops) {
    const scaled: Point[] = raw.map((p) => ({ x: Math.min(width, p.x * GRID), y: Math.min(height, p.y * GRID) }));
    if (Math.abs(signedArea(scaled)) < MIN_LOOP_AREA) continue;
    const simplified = removeCloseVertices(simplifyLoop(scaled, SIMPLIFY_TOLERANCE), MIN_VERTEX_DISTANCE);
    if (simplified.length < 3 || Math.abs(signedArea(simplified)) < MIN_LOOP_AREA) continue;
    vertexCount += simplified.length;
    loops.push(simplified.flatMap((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]));
  }

  // --- Composite + tiles ------------------------------------------------------
  const composite = new PNG({ width, height });
  for (let i = 0; i < width * height * 4; i += 4) {
    const sa = veggies.data[i + 3] / 255;
    const da = world.data[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    for (let c = 0; c < 3; c++) {
      const s = veggies.data[i + c];
      const d = world.data[i + c];
      composite.data[i + c] = oa === 0 ? 0 : Math.round((s * sa + d * da * (1 - sa)) / oa);
    }
    composite.data[i + 3] = Math.round(oa * 255);
  }

  const tileDir = `public/assets/levels/${id}`;
  rmSync(join(root, tileDir), { recursive: true, force: true });
  mkdirSync(join(root, tileDir), { recursive: true });
  const tiles: Array<[number, number, number, number]> = [];
  for (let ty = 0; ty * TILE < height; ty++) {
    for (let tx = 0; tx * TILE < width; tx++) {
      const w = Math.min(TILE + TILE_OVERLAP, width - tx * TILE);
      const h = Math.min(TILE + TILE_OVERLAP, height - ty * TILE);
      const tile = new PNG({ width: w, height: h });
      let opaque = false;
      for (let y = 0; y < h; y++) {
        const src = ((ty * TILE + y) * width + tx * TILE) * 4;
        composite.data.copy(tile.data, y * w * 4, src, src + w * 4);
        if (!opaque) {
          for (let x = 0; x < w; x++) {
            if (tile.data[(y * w + x) * 4 + 3] > 0) {
              opaque = true;
              break;
            }
          }
        }
      }
      if (!opaque) continue;
      writePng(`${tileDir}/tile_${tx}_${ty}.png`, tile);
      tiles.push([tx, ty, w, h]);
    }
  }

  // --- Preview for the level select screen --------------------------------------
  const scale = PREVIEW_HEIGHT / height;
  const pw = Math.round(width * scale);
  const sums = new Float64Array(pw * PREVIEW_HEIGHT * 4);
  for (let y = 0; y < height; y++) {
    const py = Math.min(PREVIEW_HEIGHT - 1, Math.floor(y * scale));
    // The sky strip is stretched over the level height, and the sea is tinted like the game's water.
    const sy = Math.min(sky.height - 1, Math.floor((y / height) * sky.height)) * SKY_WIDTH * 4;
    const underwater = y > WORLD.waterLevel;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = composite.data[i + 3] / 255;
      const o = (py * pw + Math.min(pw - 1, Math.floor(x * scale))) * 4;
      for (let c = 0; c < 3; c++) {
        let v = composite.data[i + c] * a + sky.data[sy + c] * (1 - a);
        if (underwater) v = v * (1 - WATER_ALPHA) + WATER_RGB[c] * WATER_ALPHA;
        sums[o + c] += v;
      }
      sums[o + 3] += 1;
    }
  }
  const preview = new PNG({ width: pw, height: PREVIEW_HEIGHT });
  for (let p = 0; p < pw * PREVIEW_HEIGHT; p++) {
    const n = sums[p * 4 + 3] || 1;
    for (let c = 0; c < 3; c++) preview.data[p * 4 + c] = Math.round(sums[p * 4 + c] / n);
    preview.data[p * 4 + 3] = 255;
  }
  writePng(`${tileDir}/preview.png`, preview);

  // --- Level data -----------------------------------------------------------------
  const levelData = { width, height, tileSize: TILE, tiles, loops };
  mkdirSync(join(root, 'src/level'), { recursive: true });
  writeFileSync(join(root, `src/level/${id}.json`), JSON.stringify(levelData));

  console.log(
    `Level ${id} ${width}x${height}: ${tiles.length} tiles, ${loops.length} collision loops, ${vertexCount} vertices`,
  );
}
