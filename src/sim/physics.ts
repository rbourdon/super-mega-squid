import { Body, BoxShape, CircleShape, PolygonShape, Vec2, World, type Fixture, type FixtureOpt } from 'planck';
import { PHYSICS, WORLD } from '../config';

/**
 * Game code works in pixels; Box2D prefers bodies roughly 0.1-10 m in size, so
 * everything is converted with a fixed pixels-per-meter ratio at this boundary.
 */
export const PPM = PHYSICS.ppm;
export const toMeters = (px: number): number => px / PPM;
export const toPixels = (m: number): number => m * PPM;
export const vecM = (xPx: number, yPx: number): Vec2 => new Vec2(xPx / PPM, yPx / PPM);

/** Collision categories. */
export const Cat = {
  TERRAIN: 0x0001,
  HEAD: 0x0002,
  TENTACLE: 0x0004,
  ENEMY: 0x0008,
  EGG: 0x0010,
  PROP: 0x0020,
} as const;

export const Mask = {
  TERRAIN: 0xffff,
  HEAD: Cat.TERRAIN | Cat.ENEMY | Cat.PROP,
  TENTACLE: Cat.TERRAIN | Cat.ENEMY | Cat.PROP,
  // Enemies never collide with each other (original: shared ignore group).
  ENEMY: Cat.TERRAIN | Cat.HEAD | Cat.TENTACLE | Cat.EGG | Cat.PROP,
  EGG: Cat.TERRAIN | Cat.ENEMY | Cat.PROP,
  PROP: Cat.TERRAIN | Cat.HEAD | Cat.TENTACLE | Cat.ENEMY | Cat.EGG | Cat.PROP,
} as const;

/** Negative group: squid head and tentacles never collide with each other. */
export const PLAYER_GROUP = -1;

export function createWorld(): World {
  return new World({ gravity: new Vec2(0, toMeters(WORLD.gravity)) });
}

export function position(body: Body): { x: number; y: number } {
  const p = body.getPosition();
  return { x: p.x * PPM, y: p.y * PPM };
}

export function velocity(body: Body): { x: number; y: number } {
  const v = body.getLinearVelocity();
  return { x: v.x * PPM, y: v.y * PPM };
}

export function speed(body: Body): number {
  const v = body.getLinearVelocity();
  return Math.hypot(v.x, v.y) * PPM;
}

export function setVelocity(body: Body, vxPx: number, vyPx: number): void {
  body.setLinearVelocity(new Vec2(vxPx / PPM, vyPx / PPM));
}

/** Change velocity by a delta in px/s regardless of mass. */
export function addVelocity(body: Body, dvxPx: number, dvyPx: number): void {
  const v = body.getLinearVelocity();
  body.setLinearVelocity(new Vec2(v.x + dvxPx / PPM, v.y + dvyPx / PPM));
}

export function applyForcePx(body: Body, fx: number, fy: number, atXPx?: number, atYPx?: number): void {
  const force = new Vec2(fx, fy);
  if (atXPx === undefined || atYPx === undefined) body.applyForceToCenter(force, true);
  else body.applyForce(force, vecM(atXPx, atYPx), true);
}

export function boxFixture(body: Body, wPx: number, hPx: number, opt: FixtureOpt, centerPx = { x: 0, y: 0 }): Fixture {
  return body.createFixture(new BoxShape(toMeters(wPx) / 2, toMeters(hPx) / 2, vecM(centerPx.x, centerPx.y)), opt);
}

export function circleFixture(body: Body, radiusPx: number, opt: FixtureOpt): Fixture {
  return body.createFixture(new CircleShape(toMeters(radiusPx)), opt);
}

export function polygonFixture(body: Body, pointsPx: ReadonlyArray<readonly [number, number]>, opt: FixtureOpt): Fixture {
  return body.createFixture(new PolygonShape(pointsPx.map(([x, y]) => vecM(x, y))), opt);
}

/** Axis-aligned bounds of all fixtures of a body, in pixels. */
export function bodyBounds(body: Body): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let f = body.getFixtureList(); f; f = f.getNext()) {
    const aabb = f.getAABB(0);
    minX = Math.min(minX, aabb.lowerBound.x);
    minY = Math.min(minY, aabb.lowerBound.y);
    maxX = Math.max(maxX, aabb.upperBound.x);
    maxY = Math.max(maxY, aabb.upperBound.y);
  }
  return { minX: minX * PPM, minY: minY * PPM, maxX: maxX * PPM, maxY: maxY * PPM };
}
