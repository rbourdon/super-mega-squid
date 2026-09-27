import type { World } from 'planck';
import { PROJECTILES, CRATE, type EnemyDef } from '../config';
import { Entity } from './entity';
import type { SimEvent } from './events';
import { Cat, Mask, boxFixture, polygonFixture, setVelocity, vecM, velocity } from './physics';
import type { Player } from './player';
import type { Rng } from './rng';
import type { Water } from './water';

export interface EnemyContext {
  rng: Rng;
  water: Water;
  player: Player;
  alertLevel: number;
  playerAlive: boolean;
  emit(event: SimEvent): void;
  fireBullet(x: number, y: number, vx: number, vy: number): void;
  fireTorpedo(x: number, y: number, angle: number): void;
  dropCrate(x: number, y: number, vx: number, vy: number): void;
}

export class Enemy extends Entity {
  readonly type = 'enemy';
  readonly texture: string;
  dir: 1 | -1 = 1;
  readonly maxSpeed: number;
  hp: number;
  anim: string | null;
  /** Invulnerability after a non-lethal hit (multi-hit enemies). */
  hitCooldown = 0;
  private turnCooldown = 0;
  private fireTimer: number;
  private burstLeft = 0;
  private burstTimer = 0;
  private shockTimer = 0;
  private shockCooldown = 1.5;
  private crateTimer: number;
  private readonly homeY: number;

  constructor(
    world: World,
    readonly def: EnemyDef,
    x: number,
    y: number,
    rng: Rng,
    maxSpeed?: number,
  ) {
    super(
      world.createBody({
        type: 'dynamic',
        position: vecM(x, y),
        fixedRotation: def.fixedRotation,
        gravityScale: def.flying ? 0 : 1,
        angularDamping: def.fixedRotation ? 0 : 4,
        linearDamping: 0.05,
      }),
    );
    this.texture = rng.pick(def.textures);
    this.maxSpeed = maxSpeed ?? rng.range(def.maxSpeed[0], def.maxSpeed[1]);
    this.hp = def.hp;
    this.homeY = y;
    this.anim = def.animations ? Object.keys(def.animations)[0] : null;
    this.fireTimer = rng.range(1, 2.5);
    this.crateTimer = rng.range(CRATE.dropInterval[0], CRATE.dropInterval[1]);

    const opt = {
      density: def.density,
      friction: 0.3,
      restitution: 0.1,
      filterCategoryBits: Cat.ENEMY,
      filterMaskBits: Mask.ENEMY,
    };
    if (def.hull) {
      for (const part of def.hull) polygonFixture(this.body, part, opt);
    } else {
      boxFixture(this.body, def.frameWidth * def.hitbox[0], def.frameHeight * def.hitbox[1], opt);
    }
  }

  get human(): boolean {
    return this.def.human;
  }

  /** Eels are dangerous to touch while their electric animation plays. */
  get electrified(): boolean {
    return this.shockTimer > 0;
  }

  electrify(duration: number): void {
    this.shockTimer = duration;
    this.shockCooldown = duration + 1.5;
  }

  get width(): number {
    return this.def.frameWidth;
  }

  get height(): number {
    return this.def.frameHeight;
  }

  turn(): void {
    if (this.turnCooldown > 0) return;
    this.dir = this.dir === 1 ? -1 : 1;
    this.turnCooldown = 0.6;
    const v = velocity(this.body);
    // Original behaviour: stop dead when changing direction.
    setVelocity(this.body, 0, v.y);
  }

  /** Called when the body bumps terrain; flips direction on mostly-horizontal hits. */
  onTerrainContact(normalX: number): void {
    if (Math.abs(normalX) > 0.5) this.turn();
  }

  update(dt: number, ctx: EnemyContext): void {
    this.turnCooldown = Math.max(0, this.turnCooldown - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    const def = this.def;
    if (ctx.rng.chance(def.turnChance * dt)) this.turn();
    if (def.human && ctx.playerAlive) this.flee(ctx.player);

    const v = velocity(this.body);
    let vx = v.x;
    let vy = v.y;
    const canPropel =
      def.habitat === 'air' ? true : def.habitat === 'surface' ? this.submerged > 0.05 : this.submerged > 0.5;
    if (canPropel && vx * this.dir < this.maxSpeed) {
      vx += this.dir * Math.min(def.accel * dt, this.maxSpeed - vx * this.dir);
    }

    if (def.flying) {
      let targetY = this.homeY;
      if (def.kind === 'chopper' && ctx.alertLevel >= 1 && ctx.playerAlive) {
        targetY = Math.max(420, Math.min(ctx.water.level - 170, ctx.player.y - 230));
      }
      vy += (targetY - this.y) * 1.5 * dt;
      vy *= Math.exp(-4 * dt);
    } else if (def.habitat === 'water' && this.submerged > 0.5) {
      // Hold depth and stay clear of the surface.
      vy *= Math.exp(-2 * dt);
      if (ctx.water.depth(this.x, this.y) < 70) vy += 260 * dt;
    }
    setVelocity(this.body, vx, vy);

    switch (def.kind) {
      case 'chopper':
        this.updateChopper(dt, ctx);
        break;
      case 'sub':
        this.updateSub(dt, ctx);
        break;
      case 'eel':
        this.updateEel(dt, ctx);
        break;
      case 'swimmer':
        this.anim = this.distanceTo(ctx.player) < 260 && ctx.playerAlive ? 'panic' : 'wade';
        break;
      case 'plane':
        this.updatePlane(dt, ctx);
        break;
      default:
        break;
    }
  }

  /** Humans try to get away from a nearby squid. */
  private flee(player: Player): void {
    const range = this.def.kind === 'swimmer' ? 260 : 320;
    if (this.turnCooldown > 0 || this.distanceTo(player) > range) return;
    const away = this.x >= player.x ? 1 : -1;
    if (away !== this.dir) {
      this.dir = away;
      this.turnCooldown = 0.8;
    }
  }

  distanceTo(p: { x: number; y: number }): number {
    return Math.hypot(p.x - this.x, p.y - this.y);
  }

  private updateChopper(dt: number, ctx: EnemyContext): void {
    // Tilt into the direction of travel like the original.
    const tilt = 0.4 * this.dir;
    this.body.setAngularVelocity((tilt - this.body.getAngle()) * 6);
    if (ctx.alertLevel < 1 || !ctx.playerAlive) return;

    const player = ctx.player;
    const dx = player.x - this.x;
    if (Math.abs(dx) > 260 && Math.sign(dx) !== this.dir) this.turn();

    this.fireTimer -= dt;
    const playerExposed = ctx.water.depth(player.x, player.y) < 12;
    if (this.burstLeft === 0 && this.fireTimer <= 0) {
      if (playerExposed && this.distanceTo(player) < PROJECTILES.chopperRange) {
        this.burstLeft = PROJECTILES.burstSize;
        this.burstTimer = 0;
      }
      const [lo, hi] = PROJECTILES.chopperFireInterval;
      this.fireTimer = ctx.rng.range(lo, hi) / (1 + 0.25 * (ctx.alertLevel - 1));
    }
    if (this.burstLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.burstTimer = PROJECTILES.burstInterval;
        this.burstLeft--;
        const muzzleX = this.x + this.dir * 20;
        const muzzleY = this.y + 12;
        const pv = velocity(player.body);
        const lead = this.distanceTo(player) / PROJECTILES.bulletSpeed;
        const aim =
          Math.atan2(player.y + pv.y * lead * 0.5 - muzzleY, player.x + pv.x * lead * 0.5 - muzzleX) +
          ctx.rng.range(-0.07, 0.07);
        ctx.fireBullet(
          muzzleX,
          muzzleY,
          Math.cos(aim) * PROJECTILES.bulletSpeed,
          Math.sin(aim) * PROJECTILES.bulletSpeed,
        );
      }
    }
  }

  private updateSub(dt: number, ctx: EnemyContext): void {
    if (ctx.alertLevel < 2 || !ctx.playerAlive) return;
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;
    const [lo, hi] = PROJECTILES.subFireInterval;
    this.fireTimer = ctx.rng.range(lo, hi);
    const player = ctx.player;
    if (this.distanceTo(player) > PROJECTILES.subRange || ctx.water.depth(player.x, player.y) < 20) return;
    const noseX = this.x + this.dir * (this.width / 2 + 6);
    ctx.fireTorpedo(noseX, this.y + 4, this.dir === 1 ? 0 : Math.PI);
  }

  private updateEel(dt: number, ctx: EnemyContext): void {
    this.shockCooldown = Math.max(0, this.shockCooldown - dt);
    if (this.shockTimer > 0) {
      this.shockTimer = Math.max(0, this.shockTimer - dt);
    } else if (this.shockCooldown <= 0) {
      const near = ctx.playerAlive && this.distanceTo(ctx.player) < 180;
      if (ctx.rng.chance((near ? 1.2 : 0.3) * dt)) this.electrify(1.1);
    }
    this.anim = this.shockTimer > 0 ? 'shock' : 'swim';
  }

  private updatePlane(dt: number, ctx: EnemyContext): void {
    this.crateTimer -= dt;
    if (this.crateTimer > 0) return;
    this.crateTimer = ctx.rng.range(CRATE.dropInterval[0], CRATE.dropInterval[1]);
    if (!ctx.playerAlive || Math.abs(ctx.player.x - this.x) > 900) return;
    const v = velocity(this.body);
    ctx.dropCrate(this.x - this.dir * 10, this.y + 22, v.x * 0.8, 40);
  }
}
