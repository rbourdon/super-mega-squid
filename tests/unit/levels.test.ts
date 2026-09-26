import { describe, expect, it } from 'vitest';
import { WORLD } from '../../src/config';
import { LEVELS, levelById } from '../../src/level/levels';
import { NO_INPUT, type InputFrame } from '../../src/sim/events';
import { Simulation } from '../../src/sim/simulation';
import { Terrain } from '../../src/sim/terrain';

const arches = levelById('arches');

function run(sim: Simulation, seconds: number, input: InputFrame | ((step: number) => InputFrame) = NO_INPUT): void {
  for (let i = 0, steps = Math.round(seconds * 60); i < steps; i++) {
    sim.step(typeof input === 'function' ? input(i) : input);
    sim.drainEvents();
  }
}

const move = (x: number, y: number, extra: Partial<InputFrame> = {}): InputFrame => ({ ...NO_INPUT, moveX: x, moveY: y, ...extra });

describe.each(LEVELS)('level $name', (level) => {
  const terrain = new Terrain(level.data);

  it('has tiles that cover the whole map', () => {
    const { width, height, tileSize, tiles } = level.data;
    expect(tiles.length).toBeGreaterThan(20);
    for (const [tx, ty, w, h] of tiles) {
      expect(tx * tileSize + w).toBeLessThanOrEqual(width);
      expect(ty * tileSize + h).toBeLessThanOrEqual(height);
    }
    expect(height).toBeGreaterThan(WORLD.waterLevel + 1000);
  });

  it('drops the squid into open water at the start', () => {
    const sim = new Simulation({ seed: 3, spawning: false, level });
    expect(terrain.isClear(level.spawn.x, level.spawn.y, 60)).toBe(true);
    run(sim, 6);
    expect(sim.player.hasBeenWet).toBe(true);
    expect(sim.player.wet).toBe(true);
  });

  it('moors every buoy in open water', () => {
    const sim = new Simulation({ seed: 3, spawning: false, level });
    expect(sim.buoys.length).toBe(level.buoys.length);
  });

  it('has no sealed-off pockets of sea', () => {
    // Flood the sea from the spawn column on a coarse grid; every open cell below the waves must be reached.
    const cell = 12;
    const top = WORLD.waterLevel + 70;
    const cols = Math.floor(level.data.width / cell);
    const rows = Math.floor((level.data.height - top) / cell);
    const open = (c: number, r: number) => terrain.isClear(c * cell + cell / 2, top + r * cell + cell / 2, 3);
    const seen = new Uint8Array(cols * rows);
    const start = Math.floor(level.spawn.x / cell);
    const queue = [start];
    seen[start] = 1;
    while (queue.length) {
      const i = queue.pop()!;
      const c = i % cols;
      const r = (i - c) / cols;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = r + dr;
        const j = nr * cols + nc;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen[j] || !open(nc, nr)) continue;
        seen[j] = 1;
        queue.push(j);
      }
    }
    let sealed = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!seen[r * cols + c] && open(c, r)) sealed++;
    expect(sealed * cell * cell).toBeLessThan(2000);
  });
});

describe('Arch Rock', () => {
  const makeSim = () => new Simulation({ seed: 11, spawning: false, level: arches });

  it('is a different map from the cove', () => {
    const cove = new Terrain(levelById('cove').data);
    const rock = new Terrain(arches.data);
    expect(rock.width).not.toBe(cove.width);
    expect(rock.isSolid(2800, 800)).toBe(true); // the arch's span
    expect(rock.isSolid(2800, 1300)).toBe(false); // under the arch
    expect(rock.isSolid(6050, 1600)).toBe(true); // the sea stack
    expect(rock.isSolid(6050, 2550)).toBe(false); // the gap under it
    expect(rock.isSolid(5380, 760)).toBe(true); // the sky island
  });

  it('lets the squid swim through the gap under the sea stack', () => {
    const sim = makeSim();
    sim.teleportPlayer(5450, 2550, 300, 0);
    run(sim, 4, move(1, -0.08));
    expect(sim.player.x).toBeGreaterThan(6500);
  });

  it('lets the squid dive under the legs of the arch', () => {
    const sim = makeSim();
    sim.teleportPlayer(1850, 1820, 300, 0);
    run(sim, 3, move(1, -0.05));
    expect(sim.player.x).toBeGreaterThan(2500);
  });

  it('lets the squid land on the sky island, which restores its air lunge', () => {
    const sim = makeSim();
    sim.teleportPlayer(5380, 560);
    sim.player.canAirLunge = false;
    run(sim, 2);
    expect(sim.player.wet).toBe(false);
    expect(sim.player.y).toBeLessThan(720);
    expect(sim.player.canAirLunge).toBe(true);
  });
});
