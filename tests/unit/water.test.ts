import { describe, expect, it } from 'vitest';
import { WAVES, WORLD } from '../../src/config';
import { Rng } from '../../src/sim/rng';
import { Water } from '../../src/sim/water';

describe('Water', () => {
  it('keeps the swell around the water level', () => {
    const water = new Water(WORLD.width, new Rng(3));
    for (let t = 0; t < 600; t++) {
      water.update(1 / 60);
      for (let x = 0; x <= WORLD.width; x += 97) {
        const y = water.surfaceY(x);
        expect(Number.isFinite(y)).toBe(true);
        expect(Math.abs(y - WORLD.waterLevel)).toBeLessThan(WAVES.swellRange[1] + 20);
      }
    }
  });

  it('ripples from a splash spread and die down without blowing up', () => {
    const water = new Water(WORLD.width, new Rng(1));
    const x = 4000;
    water.disturb(x, 40, 900);
    let peak = 0;
    for (let t = 0; t < 30; t++) {
      water.update(1 / 60);
      peak = Math.max(peak, Math.abs(water.rippleY(x)));
    }
    expect(peak).toBeGreaterThan(3);
    expect(Math.abs(water.rippleY(x + 200))).toBeGreaterThan(0);
    for (let t = 0; t < 60 * 20; t++) water.update(1 / 60);
    for (let px = 3000; px < 5000; px += 12) expect(Math.abs(water.rippleY(px))).toBeLessThan(1);
  });

  it('reports depth below the surface', () => {
    const water = new Water(WORLD.width, new Rng(1));
    const surface = water.surfaceY(1000);
    expect(water.depth(1000, surface + 50)).toBeCloseTo(50);
    expect(water.depth(1000, surface - 50)).toBeCloseTo(-50);
  });
});
