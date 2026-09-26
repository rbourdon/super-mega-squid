import { PROJECTILES } from '../config';

let nextProjectileId = 1;

/**
 * Enemy fire. Projectiles are simple kinematic points (not physics bodies) so
 * fast bullets can never tunnel through thin terrain: movement is ray-tested
 * against the level every step.
 */
export class Projectile {
  readonly id = nextProjectileId++;
  alive = true;
  prevX: number;
  prevY: number;
  life: number;
  angle: number;

  constructor(
    readonly kind: 'bullet' | 'torpedo',
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
  ) {
    this.prevX = x;
    this.prevY = y;
    this.life = kind === 'bullet' ? PROJECTILES.bulletLife : PROJECTILES.torpedoLife;
    this.angle = Math.atan2(vy, vx);
  }

  get damage(): number {
    return this.kind === 'bullet' ? PROJECTILES.bulletDamage : PROJECTILES.torpedoDamage;
  }

  get radius(): number {
    return this.kind === 'bullet' ? 3 : 7;
  }

  /** Steer a torpedo toward a target with a limited turn rate. */
  home(targetX: number, targetY: number, dt: number): void {
    const desired = Math.atan2(targetY - this.y, targetX - this.x);
    let diff = desired - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = PROJECTILES.torpedoTurnRate * dt;
    this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
    this.vx = Math.cos(this.angle) * PROJECTILES.torpedoSpeed;
    this.vy = Math.sin(this.angle) * PROJECTILES.torpedoSpeed;
  }

  advance(dt: number): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.kind === 'bullet') this.angle = Math.atan2(this.vy, this.vx);
  }

  lerpX(alpha: number): number {
    return this.prevX + (this.x - this.prevX) * alpha;
  }

  lerpY(alpha: number): number {
    return this.prevY + (this.y - this.prevY) * alpha;
  }
}
