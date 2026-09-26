import { ChainShape, EdgeShape, type World } from 'planck';
import { WORLD } from '../config';
import { pointInPolygon } from './geom/polygon';
import { Cat, Mask, vecM } from './physics';

export interface TerrainData {
  width: number;
  height: number;
  /** Closed outlines as flat [x0, y0, x1, y1, ...] arrays in pixels. */
  loops: number[][];
}

interface Loop {
  points: number[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const TERRAIN_TAG = { type: 'terrain' } as const;

/** Static level collision built from outlines extracted from the level art. */
export class Terrain {
  readonly width: number;
  readonly height: number;
  private readonly loops: Loop[];

  constructor(data: TerrainData) {
    this.width = data.width;
    this.height = data.height;
    this.loops = data.loops.map((points) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < points.length; i += 2) {
        minX = Math.min(minX, points[i]);
        maxX = Math.max(maxX, points[i]);
        minY = Math.min(minY, points[i + 1]);
        maxY = Math.max(maxY, points[i + 1]);
      }
      return { points, minX, minY, maxX, maxY };
    });
  }

  /** True when the point lies inside rock (or outside the playable area). */
  isSolid(x: number, y: number): boolean {
    if (x < 0 || x > this.width || y > this.height) return true;
    let inside = false;
    for (const loop of this.loops) {
      if (x < loop.minX || x > loop.maxX || y < loop.minY || y > loop.maxY) continue;
      if (pointInPolygon(x, y, loop.points)) inside = !inside;
    }
    return inside;
  }

  /** True when a circle of the given radius around the point is clear of rock. */
  isClear(x: number, y: number, radius: number): boolean {
    if (this.isSolid(x, y)) return false;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (this.isSolid(x + Math.cos(a) * radius, y + Math.sin(a) * radius)) return false;
    }
    return true;
  }

  createBodies(world: World): void {
    const body = world.createBody({ type: 'static', userData: TERRAIN_TAG });
    const opt = { friction: 0.6, restitution: 0.05, filterCategoryBits: Cat.TERRAIN, filterMaskBits: Mask.TERRAIN };
    for (const loop of this.loops) {
      const vertices = [];
      for (let i = 0; i < loop.points.length; i += 2) vertices.push(vecM(loop.points[i], loop.points[i + 1]));
      body.createFixture(new ChainShape(vertices, true), opt);
    }
    // Invisible walls keep everything inside the map, including high above the cliffs.
    const top = WORLD.ceiling;
    const edges: Array<[number, number, number, number]> = [
      [0, top, 0, this.height],
      [this.width, top, this.width, this.height],
      [0, top, this.width, top],
      [0, this.height, this.width, this.height],
    ];
    for (const [x1, y1, x2, y2] of edges) body.createFixture(new EdgeShape(vecM(x1, y1), vecM(x2, y2)), opt);
  }
}
