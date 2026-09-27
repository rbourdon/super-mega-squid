import { WAVES, WORLD } from '../config';
import type { Rng } from './rng';

interface SwellPoint {
  base: number;
  range: number;
  angle: number;
  speed: number;
  y: number;
}

/**
 * The sea surface: the original's slow sinusoidal swell (control points every
 * 200px, each bobbing independently) smoothed with Catmull-Rom interpolation,
 * plus a spring-column ripple layer so things splash when they cross it.
 */
export class Water {
  readonly level = WORLD.waterLevel;
  readonly width: number;
  private readonly swell: SwellPoint[] = [];
  private readonly rippleHeight: Float32Array;
  private readonly rippleVelocity: Float32Array;
  private readonly rippleLaplacianGain: number;

  constructor(width: number, rng: Rng) {
    this.width = width;
    const count = Math.ceil(width / WAVES.swellSpacing) + 2;
    for (let i = 0; i < count; i++) {
      const base = this.level + rng.range(-4, 6);
      const point: SwellPoint = {
        base,
        range: rng.range(WAVES.swellRange[0], WAVES.swellRange[1]),
        angle: rng.range(0, Math.PI * 2),
        speed: rng.range(WAVES.swellSpeed[0], WAVES.swellSpeed[1]),
        y: base,
      };
      point.y = point.base + Math.sin(point.angle) * point.range;
      this.swell.push(point);
    }
    const columns = Math.ceil(width / WAVES.rippleSpacing) + 1;
    this.rippleHeight = new Float32Array(columns);
    this.rippleVelocity = new Float32Array(columns);
    // Wave speed ~400px/s along the surface; stable for the fixed 60Hz step.
    this.rippleLaplacianGain = (400 * 400) / (WAVES.rippleSpacing * WAVES.rippleSpacing);
  }

  update(dt: number): void {
    for (const p of this.swell) {
      p.angle += p.speed * dt;
      p.y = p.base + Math.sin(p.angle) * p.range;
    }
    const h = this.rippleHeight;
    const v = this.rippleVelocity;
    const n = h.length;
    for (let i = 0; i < n; i++) {
      const left = i > 0 ? h[i - 1] : h[i];
      const right = i < n - 1 ? h[i + 1] : h[i];
      const accel =
        this.rippleLaplacianGain * (left + right - 2 * h[i]) - WAVES.rippleStiffness * h[i] - WAVES.rippleDamping * v[i];
      v[i] += accel * dt;
    }
    for (let i = 0; i < n; i++) {
      h[i] = Math.max(-WAVES.rippleMax, Math.min(WAVES.rippleMax, h[i] + v[i] * dt));
    }
  }

  /** Height of the slow swell at x. */
  swellY(x: number): number {
    const s = x / WAVES.swellSpacing;
    const i = Math.max(0, Math.min(this.swell.length - 2, Math.floor(s)));
    const t = Math.max(0, Math.min(1, s - i));
    const p0 = this.swell[Math.max(0, i - 1)].y;
    const p1 = this.swell[i].y;
    const p2 = this.swell[i + 1].y;
    const p3 = this.swell[Math.min(this.swell.length - 1, i + 2)].y;
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  /** Displacement from splashes at x. */
  rippleY(x: number): number {
    const s = x / WAVES.rippleSpacing;
    const i = Math.max(0, Math.min(this.rippleHeight.length - 2, Math.floor(s)));
    const t = Math.max(0, Math.min(1, s - i));
    return this.rippleHeight[i] * (1 - t) + this.rippleHeight[i + 1] * t;
  }

  surfaceY(x: number): number {
    return this.swellY(x) + this.rippleY(x);
  }

  /** Depth of a point below the surface (negative when above water). */
  depth(x: number, y: number): number {
    return y - this.surfaceY(x);
  }

  /**
   * Push the surface around x. Positive `impulse` (px/s) pushes it down, as
   * when something falls in; negative pulls it up, as when something leaps out.
   */
  disturb(x: number, radius: number, impulse: number): void {
    const spacing = WAVES.rippleSpacing;
    const from = Math.max(0, Math.floor((x - radius) / spacing));
    const to = Math.min(this.rippleVelocity.length - 1, Math.ceil((x + radius) / spacing));
    for (let i = from; i <= to; i++) {
      const d = Math.abs(i * spacing - x) / Math.max(radius, 1);
      if (d > 1) continue;
      this.rippleVelocity[i] += impulse * (1 - d * d);
    }
  }
}
