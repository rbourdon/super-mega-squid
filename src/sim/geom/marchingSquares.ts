/**
 * Marching squares contour extraction over a sampled scalar field.
 *
 * The field is sampled on an `nx` x `ny` grid; anything outside the grid is
 * treated as empty so every contour is closed. Returned loops are oriented so
 * that, walking from one vertex to the next along direction `d`, the solid
 * region lies on the `(-d.y, d.x)` side. In raw (y-down) coordinates this makes
 * loops around solid regions have a positive shoelace area and loops around
 * holes a negative one, which is the winding Box2D expects for outward normals.
 */

export interface Point {
  x: number;
  y: number;
}

type Sampler = (i: number, j: number) => number;

// Corner bits
const TL = 8;
const TR = 4;
const BR = 2;
const BL = 1;

// Edge identifiers within a cell
const T = 0;
const R = 1;
const B = 2;
const L = 3;

interface SegmentSpec {
  a: number;
  b: number;
  /** Corner used as orientation reference. */
  ref: number;
}

function specsFor(caseIndex: number, centerSolid: boolean): SegmentSpec[] {
  switch (caseIndex) {
    case 1:
      return [{ a: L, b: B, ref: BL }];
    case 2:
      return [{ a: B, b: R, ref: BR }];
    case 3:
      return [{ a: L, b: R, ref: BL }];
    case 4:
      return [{ a: T, b: R, ref: TR }];
    case 5:
      return centerSolid
        ? [
            { a: T, b: L, ref: TL },
            { a: B, b: R, ref: BR },
          ]
        : [
            { a: T, b: R, ref: TR },
            { a: L, b: B, ref: BL },
          ];
    case 6:
      return [{ a: T, b: B, ref: TR }];
    case 7:
      return [{ a: T, b: L, ref: TL }];
    case 8:
      return [{ a: T, b: L, ref: TL }];
    case 9:
      return [{ a: T, b: B, ref: TL }];
    case 10:
      return centerSolid
        ? [
            { a: T, b: R, ref: TR },
            { a: L, b: B, ref: BL },
          ]
        : [
            { a: T, b: L, ref: TL },
            { a: B, b: R, ref: BR },
          ];
    case 11:
      return [{ a: T, b: R, ref: TR }];
    case 12:
      return [{ a: L, b: R, ref: TL }];
    case 13:
      return [{ a: B, b: R, ref: BR }];
    case 14:
      return [{ a: L, b: B, ref: BL }];
    default:
      return [];
  }
}

export function marchingSquares(sample: Sampler, nx: number, ny: number, threshold: number): Point[][] {
  const value = (i: number, j: number): number => (i < 0 || j < 0 || i >= nx || j >= ny ? 0 : sample(i, j));

  // Cache samples (with a one-cell empty border) so each grid point is read once.
  const w = nx + 2;
  const h = ny + 2;
  const field = new Float32Array(w * h);
  for (let j = -1; j <= ny; j++) {
    for (let i = -1; i <= nx; i++) {
      field[(j + 1) * w + (i + 1)] = value(i, j);
    }
  }
  const at = (i: number, j: number) => field[(j + 1) * w + (i + 1)];

  // Edge ids: horizontal edge (i,j)-(i+1,j) and vertical edge (i,j)-(i,j+1).
  const hId = (i: number, j: number) => ((j + 1) * w + (i + 1)) * 2;
  const vId = (i: number, j: number) => ((j + 1) * w + (i + 1)) * 2 + 1;

  const points = new Map<number, Point>();
  const crossing = (id: number, x0: number, y0: number, x1: number, y1: number, v0: number, v1: number): Point => {
    let p = points.get(id);
    if (!p) {
      const t = v1 === v0 ? 0.5 : Math.min(1, Math.max(0, (threshold - v0) / (v1 - v0)));
      p = { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
      points.set(id, p);
    }
    return p;
  };

  // Directed segments keyed by start edge id -> end edge id.
  const next = new Map<number, number>();

  for (let j = -1; j < ny; j++) {
    for (let i = -1; i < nx; i++) {
      const vTL = at(i, j);
      const vTR = at(i + 1, j);
      const vBR = at(i + 1, j + 1);
      const vBL = at(i, j + 1);
      const caseIndex =
        (vTL > threshold ? TL : 0) | (vTR > threshold ? TR : 0) | (vBR > threshold ? BR : 0) | (vBL > threshold ? BL : 0);
      if (caseIndex === 0 || caseIndex === 15) continue;

      const centerSolid = (vTL + vTR + vBR + vBL) / 4 > threshold;
      const edge = (e: number): [number, Point] => {
        switch (e) {
          case T: {
            const id = hId(i, j);
            return [id, crossing(id, i, j, i + 1, j, vTL, vTR)];
          }
          case R: {
            const id = vId(i + 1, j);
            return [id, crossing(id, i + 1, j, i + 1, j + 1, vTR, vBR)];
          }
          case B: {
            const id = hId(i, j + 1);
            return [id, crossing(id, i, j + 1, i + 1, j + 1, vBL, vBR)];
          }
          default: {
            const id = vId(i, j);
            return [id, crossing(id, i, j, i, j + 1, vTL, vBL)];
          }
        }
      };

      for (const spec of specsFor(caseIndex, centerSolid)) {
        let [idA, pA] = edge(spec.a);
        let [idB, pB] = edge(spec.b);
        const refX = spec.ref === TL || spec.ref === BL ? i : i + 1;
        const refY = spec.ref === TL || spec.ref === TR ? j : j + 1;
        const refSolid = (caseIndex & spec.ref) !== 0;
        const cross = (pB.x - pA.x) * (refY - pA.y) - (pB.y - pA.y) * (refX - pA.x);
        if (cross > 0 !== refSolid) {
          [idA, idB] = [idB, idA];
          [pA, pB] = [pB, pA];
        }
        next.set(idA, idB);
      }
    }
  }

  const loops: Point[][] = [];
  const visited = new Set<number>();
  for (const start of next.keys()) {
    if (visited.has(start)) continue;
    const loop: Point[] = [];
    let id: number | undefined = start;
    while (id !== undefined && !visited.has(id)) {
      visited.add(id);
      loop.push(points.get(id)!);
      id = next.get(id);
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}
