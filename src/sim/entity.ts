import type { Body } from 'planck';
import { PPM } from './physics';

/**
 * A physics body whose transform is snapshotted every fixed step so the
 * renderer can interpolate smoothly between steps on high refresh displays.
 */
export class Tracked {
  x = 0;
  y = 0;
  angle = 0;
  prevX = 0;
  prevY = 0;
  prevAngle = 0;

  constructor(readonly body: Body) {
    // Not via sync()/snapshot(): subclasses override those and aren't initialised yet.
    const p = body.getPosition();
    this.x = this.prevX = p.x * PPM;
    this.y = this.prevY = p.y * PPM;
    this.angle = this.prevAngle = body.getAngle();
  }

  /** Copy the current transform into the previous-step slot. */
  snapshot(): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevAngle = this.angle;
  }

  /** Read the current transform from the physics body (pixels / radians). */
  sync(): void {
    const p = this.body.getPosition();
    this.x = p.x * PPM;
    this.y = p.y * PPM;
    this.angle = this.body.getAngle();
  }

  lerpX(alpha: number): number {
    return this.prevX + (this.x - this.prevX) * alpha;
  }

  lerpY(alpha: number): number {
    return this.prevY + (this.y - this.prevY) * alpha;
  }

  lerpAngle(alpha: number): number {
    let d = this.angle - this.prevAngle;
    if (d > Math.PI) d -= Math.PI * 2;
    else if (d < -Math.PI) d += Math.PI * 2;
    return this.prevAngle + d * alpha;
  }
}

export type EntityType = 'player' | 'enemy' | 'egg' | 'crate' | 'buoy';

let nextId = 1;

export abstract class Entity extends Tracked {
  readonly id = nextId++;
  abstract readonly type: EntityType;
  alive = true;
  /** Fraction of the body below the water surface, updated every step. */
  submerged = 0;

  constructor(body: Body) {
    super(body);
    body.setUserData(this);
  }
}

/** Fixture tag used to tell squid body parts apart in contact callbacks. */
export interface PartTag {
  part: 'head' | 'tentacle';
}

export function wrapAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  else if (r < -Math.PI) r += Math.PI * 2;
  return r;
}
