import { RevoluteJoint, type Body, type World } from 'planck';
import { PLAYER, TENTACLES } from '../config';
import { Entity, Tracked, wrapAngle, type PartTag } from './entity';
import type { InputFrame, SimEvent } from './events';
import { Cat, Mask, PLAYER_GROUP, addVelocity, boxFixture, circleFixture, setVelocity, toMeters, vecM, velocity } from './physics';
import type { Rng } from './rng';

export interface PlayerContext {
  rng: Rng;
  emit(event: SimEvent): void;
  launchEgg(x: number, y: number, vx: number, vy: number): void;
}

export interface TentacleSegment extends Tracked {
  length: number;
  thickness: number;
}

/** The squid: a round head with four jointed tentacles (16 bodies in total). */
export class Player extends Entity {
  readonly type = 'player';
  readonly tentacles: TentacleSegment[][] = [];
  readonly segments: TentacleSegment[] = [];

  wet = false;
  /** True once the squid has been underwater (it starts in the sky). */
  hasBeenWet = false;
  /** One lunge per airtime; restored by water or ground. Available at spawn for a dramatic dive. */
  canAirLunge = true;
  lungeCooldown = 0;
  spinTimer = 0;
  spinCooldown = 0;
  eggCooldown = 0;
  pendingEggs = 0;
  private eggTimer = 0;
  stunTimer = 0;
  hurtTimer = 0;
  mouthOpen = false;
  /** Set when the player has lost control (game over). */
  limp = false;
  private targetAngle = 0;

  constructor(world: World, x: number = PLAYER.spawn.x, y: number = PLAYER.spawn.y) {
    super(world.createBody({ type: 'dynamic', position: vecM(x, y), bullet: true, allowSleep: false }));
    const head = this.body;
    const headTag: PartTag = { part: 'head' };
    circleFixture(head, PLAYER.radius, {
      density: PLAYER.density,
      friction: PLAYER.friction,
      restitution: PLAYER.restitution,
      filterCategoryBits: Cat.HEAD,
      filterMaskBits: Mask.HEAD,
      filterGroupIndex: PLAYER_GROUP,
      userData: headTag,
    });
    this.createTentacles(world, x, y);
  }

  private createTentacles(world: World, x: number, y: number): void {
    const tag: PartTag = { part: 'tentacle' };
    TENTACLES.attachYs.forEach((attachY, t) => {
      const chain: TentacleSegment[] = [];
      let prevBody: Body = this.body;
      let anchorX = x + TENTACLES.attachX;
      let prevLocalAnchor: { x: number; y: number } = { x: TENTACLES.attachX, y: attachY };
      TENTACLES.segments.forEach((spec, s) => {
        const length = s === 0 ? TENTACLES.firstSegmentLengths[t] : spec.length;
        const inset = 1.5;
        // Segments start trailing behind the head (pointing left, angle PI).
        const cx = anchorX - length / 2 + inset;
        const body = world.createBody({
          type: 'dynamic',
          position: vecM(cx, y + attachY),
          angle: Math.PI,
          linearDamping: 0.4,
          angularDamping: 1.5,
          allowSleep: false,
        });
        boxFixture(body, length, spec.thickness, {
          density: spec.density,
          friction: 0.2,
          restitution: 0.1,
          filterCategoryBits: Cat.TENTACLE,
          filterMaskBits: Mask.TENTACLE,
          filterGroupIndex: PLAYER_GROUP,
          userData: tag,
        });
        body.setUserData(this);
        world.createJoint(
          new RevoluteJoint({
            bodyA: prevBody,
            bodyB: body,
            localAnchorA: vecM(prevLocalAnchor.x, prevLocalAnchor.y),
            localAnchorB: vecM(-length / 2 + inset, 0),
            collideConnected: false,
          }),
        );
        const segment = Object.assign(new Tracked(body), { length, thickness: spec.thickness });
        chain.push(segment);
        this.segments.push(segment);
        prevBody = body;
        prevLocalAnchor = { x: length / 2 - inset, y: 0 };
        anchorX = cx - length / 2 + inset;
      });
      this.tentacles.push(chain);
    });
  }

  get speed(): number {
    const v = velocity(this.body);
    return Math.hypot(v.x, v.y);
  }

  get facing(): number {
    return this.angle;
  }

  /** Apply one step of player control. */
  control(dt: number, input: InputFrame, ctx: PlayerContext): void {
    this.lungeCooldown = Math.max(0, this.lungeCooldown - dt);
    this.spinCooldown = Math.max(0, this.spinCooldown - dt);
    this.eggCooldown = Math.max(0, this.eggCooldown - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    const head = this.body;
    const canAct = !this.limp && this.stunTimer <= 0;
    const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const steering = canAct && mag > 0.15;
    const ux = steering ? input.moveX / Math.hypot(input.moveX, input.moveY) : 0;
    const uy = steering ? input.moveY / Math.hypot(input.moveX, input.moveY) : 0;

    if (this.spinTimer > 0) {
      this.updateSpin(dt, ctx);
    } else if (steering) {
      const v = velocity(head);
      if (this.wet) {
        const target = PLAYER.swimSpeed * mag;
        const along = v.x * ux + v.y * uy;
        let vx = v.x;
        let vy = v.y;
        if (along < target) {
          const dv = Math.min(PLAYER.swimAccel * dt, target - along);
          vx += ux * dv;
          vy += uy * dv;
        }
        // Bleed off sideways drift so turning feels crisp.
        const along2 = vx * ux + vy * uy;
        const damp = Math.min(1, PLAYER.swimTurnDamping * dt);
        vx -= (vx - ux * along2) * damp;
        vy -= (vy - uy * along2) * damp;
        this.propel(vx - v.x, vy - v.y);
      } else {
        // Limited air control: steer sideways and dive, but no flying upwards.
        let vx = v.x;
        let vy = v.y;
        if (Math.abs(ux) > 0.2) {
          const target = PLAYER.airSpeed * Math.abs(input.moveX);
          const along = vx * Math.sign(ux);
          if (along < target) vx += Math.sign(ux) * Math.min(PLAYER.airAccel * dt, target - along);
        }
        if (uy > 0.2 && vy < PLAYER.airSpeed) vy += PLAYER.airAccel * dt * uy;
        this.propel(vx - v.x, vy - v.y);
      }
      this.targetAngle = Math.atan2(uy, ux);
      const err = wrapAngle(this.targetAngle - head.getAngle());
      head.setAngularVelocity(Math.max(-22, Math.min(22, err * PLAYER.turnRate)));
    }

    if (canAct && input.lunge) this.tryLunge(steering ? Math.atan2(uy, ux) : head.getAngle(), ctx);
    if (canAct && input.spin && this.spinCooldown <= 0 && this.spinTimer <= 0) {
      this.spinTimer = PLAYER.spinDuration;
      this.spinCooldown = PLAYER.spinCooldown;
      ctx.emit({ type: 'spin', x: this.x, y: this.y });
    }
    if (canAct && input.eggs && this.eggCooldown <= 0) {
      this.pendingEggs = PLAYER.eggCount;
      this.eggTimer = 0;
      this.eggCooldown = PLAYER.eggCooldown;
      ctx.emit({ type: 'eggs' });
    }
    this.updateEggs(dt, ctx);
    this.clampSpeed();
  }

  private tryLunge(direction: number, ctx: PlayerContext): void {
    let impulse: number;
    if (this.wet) {
      if (this.lungeCooldown > 0) return;
      impulse = PLAYER.lungeImpulseWater;
      this.lungeCooldown = PLAYER.lungeCooldown;
    } else {
      if (!this.canAirLunge) return;
      impulse = PLAYER.lungeImpulseAir;
      this.canAirLunge = false;
    }
    this.propel(Math.cos(direction) * impulse, Math.sin(direction) * impulse);
    this.body.setAngle(direction);
    this.body.setAngularVelocity(0);
    ctx.emit({ type: 'lunge', x: this.x, y: this.y, wet: this.wet });
  }

  private updateSpin(dt: number, ctx: PlayerContext): void {
    const head = this.body;
    const v = velocity(head);
    // A spin briefly cancels falling, letting the squid hang in the air.
    if (v.y > 0) setVelocity(head, v.x, v.y * 0.2);
    head.setAngularVelocity(PLAYER.spinAngularSpeed);
    const boost = this.wet ? PLAYER.spinTentacleBoostWet : PLAYER.spinTentacleBoostDry;
    const hp = head.getPosition();
    for (const seg of this.segments) {
      const p = seg.body.getPosition();
      const dx = p.x - hp.x;
      const dy = p.y - hp.y;
      const len = Math.hypot(dx, dy) || 1;
      // Tangential (clockwise in screen space) push plus a little chaos.
      const jitter = boost * 0.3;
      addVelocity(
        seg.body,
        (-dy / len) * boost + ctx.rng.range(-jitter, jitter),
        (dx / len) * boost + ctx.rng.range(-jitter, jitter),
      );
    }
    this.spinTimer = Math.max(0, this.spinTimer - dt);
  }

  private updateEggs(dt: number, ctx: PlayerContext): void {
    if (this.pendingEggs <= 0) return;
    this.eggTimer -= dt;
    if (this.eggTimer > 0) return;
    this.eggTimer = PLAYER.eggInterval;
    this.pendingEggs--;
    const v = velocity(this.body);
    const back = this.body.getAngle() + Math.PI + ctx.rng.range(-0.6, 0.6);
    const kick = ctx.rng.range(90, 170);
    ctx.launchEgg(
      this.x + Math.cos(back) * (PLAYER.radius + 8),
      this.y + Math.sin(back) * (PLAYER.radius + 8),
      v.x * 0.4 + Math.cos(back) * kick,
      v.y * 0.4 + Math.sin(back) * kick,
    );
  }

  /**
   * Change the whole squid's velocity. The tentacles outweigh the head (as in
   * the original), so pushing only the head would have them drag it back.
   */
  private propel(dvx: number, dvy: number): void {
    addVelocity(this.body, dvx, dvy);
    for (const seg of this.segments) addVelocity(seg.body, dvx, dvy);
  }

  private clampSpeed(): void {
    const v = velocity(this.body);
    const s = Math.hypot(v.x, v.y);
    if (s > PLAYER.maxSpeed) setVelocity(this.body, (v.x / s) * PLAYER.maxSpeed, (v.y / s) * PLAYER.maxSpeed);
  }

  /** Push the squid away from a point (used when it gets hurt). */
  knockback(fromX: number, fromY: number, strength: number): void {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    addVelocity(this.body, (dx / len) * strength, (dy / len) * strength);
  }

  /** Radius used for overlap tests against projectiles. */
  get hitRadius(): number {
    return PLAYER.radius + 3;
  }

  get radiusMeters(): number {
    return toMeters(PLAYER.radius);
  }

  override snapshot(): void {
    super.snapshot();
    for (const seg of this.segments) seg.snapshot();
  }

  override sync(): void {
    super.sync();
    for (const seg of this.segments) seg.sync();
  }
}
