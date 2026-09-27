import { describe, expect, it } from 'vitest';
import { marchingSquares } from '../../src/sim/geom/marchingSquares';
import { pointInPolygon, removeCloseVertices, signedArea, simplifyLoop, simplifyPolyline } from '../../src/sim/geom/polygon';

/** Build a sampler from an ASCII mask ('#' = solid). */
function maskSampler(rows: string[]) {
  return {
    nx: rows[0].length,
    ny: rows.length,
    sample: (i: number, j: number) => (rows[j][i] === '#' ? 255 : 0),
  };
}

describe('marchingSquares', () => {
  it('traces a single closed loop around a solid block with positive winding', () => {
    const { nx, ny, sample } = maskSampler(['......', '.####.', '.####.', '.####.', '......']);
    const loops = marchingSquares(sample, nx, ny, 127.5);
    expect(loops).toHaveLength(1);
    const area = signedArea(loops[0]);
    expect(area).toBeGreaterThan(0);
    // A 4x3 block of samples, contour halfway between samples: ~4x3 area.
    expect(area).toBeCloseTo(4 * 3 - 0.5, 0);
  });

  it('closes contours at the grid border', () => {
    const { nx, ny, sample } = maskSampler(['###', '###']);
    const loops = marchingSquares(sample, nx, ny, 127.5);
    expect(loops).toHaveLength(1);
    expect(signedArea(loops[0])).toBeGreaterThan(0);
  });

  it('gives holes the opposite winding', () => {
    const { nx, ny, sample } = maskSampler(['#######', '#######', '##...##', '##...##', '#######', '#######']);
    const loops = marchingSquares(sample, nx, ny, 127.5);
    expect(loops).toHaveLength(2);
    const areas = loops.map(signedArea).sort((a, b) => a - b);
    expect(areas[0]).toBeLessThan(0);
    expect(areas[1]).toBeGreaterThan(0);
  });

  it('separates distinct blobs', () => {
    const { nx, ny, sample } = maskSampler(['........', '.##..##.', '.##..##.', '........']);
    expect(marchingSquares(sample, nx, ny, 127.5)).toHaveLength(2);
  });
});

describe('polygon helpers', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('computes signed area', () => {
    expect(signedArea(square)).toBe(100);
    expect(signedArea([...square].reverse())).toBe(-100);
  });

  it('simplifies collinear points', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 1, y: 0.01 },
      { x: 2, y: 0 },
      { x: 3, y: 5 },
    ];
    expect(simplifyPolyline(line, 0.5)).toHaveLength(3);
    const loop = simplifyLoop(square, 0.5);
    expect(loop).toHaveLength(4);
    expect(signedArea(loop)).toBe(100);
  });

  it('drops vertices that are too close together', () => {
    const loop = removeCloseVertices(
      [
        { x: 0, y: 0 },
        { x: 0.2, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0.1 },
      ],
      1,
    );
    expect(loop).toHaveLength(4);
  });

  it('tests points against polygons', () => {
    const flat = [0, 0, 10, 0, 10, 10, 0, 10];
    expect(pointInPolygon(5, 5, flat)).toBe(true);
    expect(pointInPolygon(15, 5, flat)).toBe(false);
  });
});
