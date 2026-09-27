import { RevoluteJoint, Vec2, type Body, type World } from 'planck';
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
  /** Fraction under water, updated every step. */
  submerged: number;
}

/** The squid: a round head with four jointed tentacles (20 bodies in total). */
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
  /** Phase of the tentacle wave (advances faster while thrashing). */
  private clock = 0;
  /** Seconds of frantic thrashing left, after a lunge or spin. */
  thrash = 0;
  /** Set when the player has lost control (game over). */
  limp = false;
  private targetAngle = 0;

  constructor(world: World, x: number, y: number) {
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
          linearDamping: 0.1,
          angularDamping: 0.3,
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
        const segment = Object.assign(new Tracked(body), { length, thickness: spec.thickness, submerged: 0 });
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
        this.propel(vx - v.x, vy - v.y, TENTACLES.swimShare);
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
        this.propel(vx - v.x, vy - v.y, TENTACLES.swimShare);
      }
      this.targetAngle = Math.atan2(uy, ux);
      const err = wrapAngle(this.targetAngle - head.getAngle());
      head.setAngularVelocity(Math.max(-22, Math.min(22, err * PLAYER.turnRate)));
    }

    if (canAct && input.lunge) this.tryLunge(steering ? Math.atan2(uy, ux) : head.getAngle(), ctx);
    if (canAct && input.spin && this.spinCooldown <= 0 && this.spinTimer <= 0) {
      this.spinTimer = PLAYER.spinDuration;
      this.spinCooldown = PLAYER.spinCooldown;
      this.thrash = TENTACLES.thrashTime;
      ctx.emit({ type: 'spin', x: this.x, y: this.y });
    }
    if (canAct && input.eggs && this.eggCooldown <= 0) {
      this.pendingEggs = PLAYER.eggCount;
      this.eggTimer = 0;
      this.eggCooldown = PLAYER.eggCooldown;
      ctx.emit({ type: 'eggs' });
    }
    this.updateEggs(dt, ctx);
    this.wiggle(dt);
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
    this.whip(Math.cos(direction) * impulse, Math.sin(direction) * impulse, ctx);
    this.thrash = TENTACLES.thrashTime;
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
    this.tentacles.forEach((chain) => {
      // Each tentacle thrashes with its own strength, the tips hardest.
      const temper = ctx.rng.range(0.6, 1.4);
      chain.forEach((seg, s) => {
        const p = seg.body.getPosition();
        const dx = p.x - hp.x;
        const dy = p.y - hp.y;
        const len = Math.hypot(dx, dy) || 1;
        const lash = boost * temper * (0.6 + (0.6 * (s + 1)) / chain.length);
        const chaos = lash * PLAYER.spinChaos;
        const fling = lash * PLAYER.spinFling;
        // Sideways (clockwise in screen space), outwards, and a random kick.
        addVelocity(
          seg.body,
          (-dy / len) * lash + (dx / len) * fling + ctx.rng.range(-chaos, chaos),
          (dx / len) * lash + (dy / len) * fling + ctx.rng.range(-chaos, chaos),
        );
      });
    });
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
   * A lunge: like the original, the head is thrown and the tentacles are left
   * nearly dead in the water, flaring out to the sides, so the joints yank them
   * after the head like a whip. The momentum they lose goes to the head, so the
   * squid as a whole moves exactly as much as before (leaps are as high).
   */
  private whip(dvx: number, dvy: number, ctx: PlayerContext): void {
    const head = this.body;
    const headMass = head.getMass();
    let tentacleMass = 0;
    let px = 0;
    let py = 0;
    const len = Math.hypot(dvx, dvy) || 1;
    const sideX = -dvy / len;
    const sideY = dvx / len;
    this.tentacles.forEach((chain, t) => {
      const side = TENTACLES.attachYs[t] / 8;
      chain.forEach((seg, s) => {
        const m = seg.body.getMass();
        const v = seg.body.getLinearVelocity();
        const keep = TENTACLES.lungeKeep;
        const flare = TENTACLES.lungeFlare * side * ((s + 1) / chain.length) * ctx.rng.range(0.6, 1.2);
        const nx = v.x * keep + toMeters(sideX * flare + ctx.rng.range(-60, 60));
        const ny = v.y * keep + toMeters(sideY * flare + ctx.rng.range(-60, 60));
        px += m * (v.x - nx);
        py += m * (v.y - ny);
        seg.body.setLinearVelocity(new Vec2(nx, ny));
        seg.body.setAngularVelocity(seg.body.getAngularVelocity() + ctx.rng.range(-10, 10));
        tentacleMass += m;
      });
    });
    // The whole squid gains (dvx, dvy); the head carries all of it plus what the tentacles gave up.
    const k = (headMass + tentacleMass) / headMass;
    const hv = head.getLinearVelocity();
    head.setLinearVelocity(new Vec2(hv.x + toMeters(dvx) * k + px / headMass, hv.y + toMeters(dvy) * k + py / headMass));
  }

  /**
   * Change the squid's velocity by (dvx, dvy) overall, but mostly through the
   * head: the tentacles get only a share, so they lag, stretch and whip in
   * behind. The head gets a correspondingly bigger kick so total momentum (and
   * so swim speed and leap height) is the same as moving everything together.
   */
  private propel(dvx: number, dvy: number, tentacleShare: number): void {
    const headMass = this.body.getMass();
    let tentacleMass = 0;
    for (const seg of this.segments) tentacleMass += seg.body.getMass();
    const k = (headMass + tentacleMass) / (headMass + tentacleMass * tentacleShare);
    addVelocity(this.body, dvx * k, dvy * k);
    if (tentacleShare <= 0) return;
    for (const seg of this.segments) addVelocity(seg.body, dvx * k * tentacleShare, dvy * k * tentacleShare);
  }

  /**
   * A wave travelling down each tentacle keeps them squirming, strongest at the
   * tips and underwater; in the air they mostly just flap and dangle.
   */
  private wiggle(dt: number): void {
    const frenzy = this.thrash / TENTACLES.thrashTime;
    this.thrash = Math.max(0, this.thrash - dt);
    this.clock += dt * (1 + (TENTACLES.thrashSpeed - 1) * frenzy);
    const headAngle = this.body.getAngle();
    // Normal pointing to the head's lower side (+y in its local frame).
    const nx = -Math.sin(headAngle);
    const ny = Math.cos(headAngle);
    const calm = this.limp ? 0.3 : 1;
    this.tentacles.forEach((chain, t) => {
      // Each tentacle keeps its own rhythm so they never move in lockstep.
      const speed = TENTACLES.wiggleSpeed * (0.8 + 0.13 * t);
      const side = TENTACLES.attachYs[t] / 8;
      chain.forEach((seg, s) => {
        const reach = (s + 1) / chain.length;
        const air = TENTACLES.wiggleInAir;
        const wild = 1 + (TENTACLES.thrashStrength - 1) * frenzy;
        const strength = TENTACLES.wiggleAccel * reach * (air + (1 - air) * seg.submerged) * calm * wild;
        const phase = this.clock * speed - s * TENTACLES.wigglePhase + t * 1.7;
        const a = seg.body.getAngle();
        const push = Math.sin(phase) * strength * dt;
        const spread = TENTACLES.spreadAccel * side * reach * seg.submerged * calm * dt;
        addVelocity(seg.body, -Math.sin(a) * push + nx * spread, Math.cos(a) * push + ny * spread);
      });
    });
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
