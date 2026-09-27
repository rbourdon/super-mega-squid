import { Vec2, type Body, type CircleShape, type PolygonShape } from 'planck';
import { PHYSICS, WORLD } from '../config';
import { PPM, toMeters } from './physics';
import type { Water } from './water';

export interface Submersion {
  /** Submerged area in m^2. */
  area: number;
  /** Total area in m^2. */
  totalArea: number;
  /** Centroid of the submerged part in meters (world space). */
  cx: number;
  cy: number;
}

interface P {
  x: number;
  y: number;
}

/**
 * Clip a convex polygon against the half-plane below the line through a and b
 * (y-down, "below" means larger y than the line). Sutherland-Hodgman.
 */
export function clipBelowLine(poly: readonly P[], a: P, b: P): P[] {
  const side = (p: P) => {
    // Line y at p.x (the line is never vertical: a.x < b.x).
    const t = (p.x - a.x) / (b.x - a.x);
    const lineY = a.y + (b.y - a.y) * t;
    return p.y - lineY;
  };
  const out: P[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const sc = side(cur);
    const sp = side(prev);
    if (sc >= 0) {
      if (sp < 0) out.push(intersect(prev, cur, sp, sc));
      out.push(cur);
    } else if (sp >= 0) {
      out.push(intersect(prev, cur, sp, sc));
    }
  }
  return out;
}

function intersect(p: P, q: P, sp: number, sq: number): P {
  const t = sp / (sp - sq);
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

export function polygonAreaCentroid(poly: readonly P[]): { area: number; cx: number; cy: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    area += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-12) return { area: 0, cx: 0, cy: 0 };
  return { area: Math.abs(area), cx: cx / (6 * area), cy: cy / (6 * area) };
}

/** Area and centroid of the part of a circle below a horizontal line y = h. */
export function circleSegmentBelow(cy: number, r: number, h: number): { area: number; cy: number } {
  const d = h - cy; // distance from centre to the line (positive: line below centre)
  if (d >= r) return { area: 0, cy };
  if (d <= -r) return { area: Math.PI * r * r, cy };
  // Segment below the line: height = r - d
  const angle = 2 * Math.acos(d / r);
  const area = (r * r * (angle - Math.sin(angle))) / 2;
  const centroidDist = (4 * r * Math.pow(Math.sin(angle / 2), 3)) / (3 * (angle - Math.sin(angle)));
  return { area, cy: cy + centroidDist };
}

/** Compute how much of a body is under the water surface. */
export function submersion(body: Body, water: Water): Submersion {
  const xf = body.getTransform();
  let area = 0;
  let totalArea = 0;
  let mx = 0;
  let my = 0;
  for (let f = body.getFixtureList(); f; f = f.getNext()) {
    if (f.isSensor()) continue;
    const shape = f.getShape();
    if (shape.getType() === 'circle') {
      const circle = shape as CircleShape;
      const c = circle.getCenter();
      const wx = xf.p.x + xf.q.c * c.x - xf.q.s * c.y;
      const wy = xf.p.y + xf.q.s * c.x + xf.q.c * c.y;
      const r = circle.getRadius();
      const h = water.surfaceY(wx * PPM) / PPM;
      const seg = circleSegmentBelow(wy, r, h);
      totalArea += Math.PI * r * r;
      area += seg.area;
      mx += wx * seg.area;
      my += seg.cy * seg.area;
    } else if (shape.getType() === 'polygon') {
      const polygon = shape as PolygonShape;
      const verts: P[] = [];
      let minX = Infinity;
      let maxX = -Infinity;
      for (let i = 0; i < polygon.m_count; i++) {
        const v = polygon.m_vertices[i];
        const x = xf.p.x + xf.q.c * v.x - xf.q.s * v.y;
        const y = xf.p.y + xf.q.s * v.x + xf.q.c * v.y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        verts.push({ x, y });
      }
      totalArea += polygonAreaCentroid(verts).area;
      const a = { x: minX - 0.01, y: water.surfaceY((minX - 0.01) * PPM) / PPM };
      const b = { x: maxX + 0.01, y: water.surfaceY((maxX + 0.01) * PPM) / PPM };
      const clipped = clipBelowLine(verts, a, b);
      if (clipped.length >= 3) {
        const ac = polygonAreaCentroid(clipped);
        area += ac.area;
        mx += ac.cx * ac.area;
        my += ac.cy * ac.area;
      }
    }
  }
  if (area <= 0) return { area: 0, totalArea, cx: 0, cy: 0 };
  return { area, totalArea, cx: mx / area, cy: my / area };
}

const GRAVITY_M = toMeters(WORLD.gravity);

/**
 * Apply buoyancy and water drag. Returns the submerged fraction (0..1).
 * The buoyant force is applied at the centre of the submerged area, which gives
 * boats a natural righting moment.
 */
/**
 * Water forces for long, thin, neutrally buoyant bodies (tentacle segments):
 * buoyancy exactly cancels gravity when submerged, and drag is much stronger
 * across the segment than along it, so a chain of them streams behind the
 * squid and curls through turns. Returns the submerged fraction.
 */
export function applyStreamlinedWaterForces(body: Body, water: Water, dragAcross: number, dragAlong: number): number {
  const sub = submersion(body, water);
  if (sub.area <= 0 || sub.totalArea <= 0) return 0;
  const fraction = Math.min(1, sub.area / sub.totalArea);
  const mass = body.getMass();
  body.applyForceToCenter(new Vec2(0, -mass * GRAVITY_M * fraction), true);

  const angle = body.getAngle();
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  const v = body.getLinearVelocity();
  const along = v.x * ax + v.y * ay;
  const px = v.x - along * ax;
  const py = v.y - along * ay;
  const k = mass * fraction;
  body.applyForceToCenter(
    new Vec2(-(px * dragAcross + along * ax * dragAlong) * k, -(py * dragAcross + along * ay * dragAlong) * k),
    true,
  );
  const w = body.getAngularVelocity();
  body.applyTorque(-w * PHYSICS.waterAngularDrag * fraction * body.getInertia(), true);
  return fraction;
}

export function applyWaterForces(body: Body, water: Water, dragScale = 1): number {
  const sub = submersion(body, water);
  if (sub.area <= 0 || sub.totalArea <= 0) return 0;
  const fraction = Math.min(1, sub.area / sub.totalArea);
  const buoyancy = PHYSICS.fluidDensity * sub.area * GRAVITY_M * PHYSICS.fluidGravityScale;
  body.applyForce(new Vec2(0, -buoyancy), new Vec2(sub.cx, sub.cy), true);

  // Linear drag proportional to submersion, independent of mass.
  const mass = body.getMass();
  const v = body.getLinearVelocity();
  const k = PHYSICS.waterLinearDrag * dragScale * fraction * mass;
  body.applyForceToCenter(new Vec2(-v.x * k, -v.y * k), true);
  const w = body.getAngularVelocity();
  body.applyTorque(-w * PHYSICS.waterAngularDrag * fraction * body.getInertia(), true);
  return fraction;
}
