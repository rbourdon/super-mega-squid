/**
 * Generates the source art for the new levels in the style of the original
 * hand-drawn level. Each level's layout (rock outlines and which decorations each
 * rock gets) lives in scripts/levels/; scripts/lib/rock-art.ts paints them.
 *
 * Writes art/levels/<id>/worldpixel.png (terrain, whose alpha is the level
 * collision) and veggiespixel.png (decoration). Run with `npm run assets:generate`
 * (optionally followed by level ids to generate only those), then
 * `npm run assets:level` to rebuild the game data. The output is deterministic.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { Rand } from './lib/raster';
import { RockArt, cutPlants, cutTrees } from './lib/rock-art';
import { H, WATER } from './levels/common';
import { LAYOUTS } from './levels/index';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINAL = join(root, 'art/levels/cove');
const wanted = process.argv.slice(2);
const plants = cutPlants(ORIGINAL);
const trees = cutTrees(ORIGINAL);

for (const layout of LAYOUTS) {
  if (wanted.length && !wanted.includes(layout.id)) continue;
  const started = Date.now();
  const art = new RockArt(layout.width, H, WATER, new Rand(layout.seed), layout.masses, layout.seed);
  art.paintRocks();
  art.addMoss();
  art.addFringes();
  art.addVines();
  const sand = art.addSand(layout.sand);
  art.scatter(plants, sand, layout.sand, layout.plantSpacing ?? [10, 50]);
  art.addTrees(trees);
  const outDir = join(root, 'art/levels', layout.id);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'worldpixel.png'), PNG.sync.write(art.terrainPng(), { deflateLevel: 9 }));
  writeFileSync(join(outDir, 'veggiespixel.png'), PNG.sync.write(art.veg, { deflateLevel: 9 }));
  console.log(`${layout.id} ${layout.width}x${H}: ${layout.masses.length} rock masses (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}
