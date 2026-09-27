import { describe, expect, it } from 'vitest';
import { circleSegmentBelow, clipBelowLine, polygonAreaCentroid } from '../../src/sim/buoyancy';

describe('buoyancy geometry', () => {
  const box = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];

  it('computes polygon area and centroid', () => {
    const { area, cx, cy } = polygonAreaCentroid(box);
    expect(area).toBeCloseTo(4);
    expect(cx).toBeCloseTo(1);
    expect(cy).toBeCloseTo(1);
  });

  it('clips the part of a polygon below a water line (y grows downwards)', () => {
    const clipped = clipBelowLine(box, { x: -1, y: 1.5 }, { x: 3, y: 1.5 });
    const { area, cy } = polygonAreaCentroid(clipped);
    expect(area).toBeCloseTo(1); // 2 wide x 0.5 deep
    expect(cy).toBeCloseTo(1.75);
  });

  it('handles sloped water lines', () => {
    const clipped = clipBelowLine(box, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(polygonAreaCentroid(clipped).area).toBeCloseTo(2);
  });

  it('returns nothing when fully above the water', () => {
    expect(clipBelowLine(box, { x: -1, y: 5 }, { x: 3, y: 5 })).toHaveLength(0);
  });

  it('computes circle segments', () => {
    const r = 2;
    expect(circleSegmentBelow(0, r, 0).area).toBeCloseTo((Math.PI * r * r) / 2);
    expect(circleSegmentBelow(0, r, 0).cy).toBeCloseTo((4 * r) / (3 * Math.PI));
    expect(circleSegmentBelow(0, r, -5).area).toBeCloseTo(Math.PI * r * r);
    expect(circleSegmentBelow(0, r, 5).area).toBe(0);
  });
});
