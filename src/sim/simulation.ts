import { Vec2, type Contact, type Fixture, type World } from 'planck';
import { BUOYS, CRATE, ENEMIES, PHYSICS, PLAYER, PROJECTILES, RAGE, SPAWN, type EnemyKind } from '../config';
import levelData from '../level/levelData.json';
import { applyWaterForces } from './buoyancy';
import { Enemy, type EnemyContext } from './enemy';
import type { Entity, PartTag } from './entity';
import { NO_INPUT, type HurtSource, type InputFrame, type SimEvent } from './events';
import { Cat, PPM, createWorld, speed, vecM, velocity } from './physics';
import { Player, type PlayerContext } from './player';
import { Projectile } from './projectile';
import { Buoy, Crate, Egg } from './props';
import { Rng } from './rng';
import { Rules } from './rules';
import { Spawner, type SpawnContext } from './spawner';
import { TERRAIN_TAG, Terrain, type TerrainData } from './terrain';
import { Water } from './water';

export interface SimulationOptions {
  seed?: number;
  level?: TerrainData;
  population?: number;
  /** Disable automatic enemy spawning (used by tests). */
  spawning?: boolean;
  playerX?: number;
  playerY?: number;
}

interface HitInfo {
  byEgg: boolean;
}

type BodyOwner = Entity | typeof TERRAIN_TAG | null;

const isEntity = (owner: BodyOwner): owner is Entity => owner !== null && 'alive' in owner;

/**
 * The whole game world, independent of rendering. Advance it with fixed steps
 * via {@link step}; read state directly and drain {@link SimEvent}s for audio
 * and visual effects.
 */
export class Simulation {
  readonly world: World;
  readonly rng: Rng;
  readonly terrain: Terrain;
  readonly water: Water;
  readonly rules: Rules;
  readonly player: Player;
  readonly enemies: Enemy[] = [];
  readonly eggs: Egg[] = [];
  readonly crates: Crate[] = [];
  readonly buoys: Buoy[] = [];
  readonly projectiles: Projectile[] = [];
  time = 0;
  steps = 0;

  private readonly spawner = new Spawner();
  private readonly spawning: boolean;
  private events: SimEvent[] = [];
  private lastAlert = 0;
  private slowMoCooldown = 0;
  private gameOverSent = false;
  private readonly wasWet = new Map<number, boolean>();

  // Contact results queued during the physics step (bodies can't be destroyed mid-step).
  private readonly enemyHits = new Map<Enemy, HitInfo>();
  private readonly shocks = new Set<Enemy>();
  private readonly brokenCrates = new Set<Crate>();
  private readonly spentEggs = new Set<Egg>();
  private readonly terrainBumps = new Map<Enemy, number>();
  private landingSpeed = 0;

  private readonly playerCtx: PlayerContext;
  private readonly enemyCtx: EnemyContext;
  private readonly spawnCtx: SpawnContext;

  constructor(options: SimulationOptions = {}) {
    this.rng = new Rng(options.seed ?? (Date.now() & 0xffffffff));
    this.world = createWorld();
    this.terrain = new Terrain(options.level ?? (levelData as TerrainData));
    this.terrain.createBodies(this.world);
    this.water = new Water(this.terrain.width, this.rng);
    this.rules = new Rules(options.population);
    this.spawning = options.spawning ?? true;
    this.player = new Player(this.world, options.playerX, options.playerY);

    for (const x of BUOYS.positions) {
      if (this.terrain.isClear(x, this.water.level, 20)) this.buoys.push(new Buoy(this.world, x, this.water.level - 12));
    }

    this.playerCtx = {
      rng: this.rng,
      emit: (e) => this.emit(e),
      launchEgg: (x, y, vx, vy) => this.eggs.push(new Egg(this.world, x, y, vx, vy, this.rng.range(-8, 8))),
    };
    const sim = this;
    this.enemyCtx = {
      rng: this.rng,
      water: this.water,
      player: this.player,
      get alertLevel() {
        return sim.rules.alertLevel;
      },
      get playerAlive() {
        return sim.rules.state === 'playing';
      },
      emit: (e) => this.emit(e),
      fireBullet: (x, y, vx, vy) => {
        this.projectiles.push(new Projectile('bullet', x, y, vx, vy));
        this.emit({ type: 'shot', kind: 'bullet', x, y });
      },
      fireTorpedo: (x, y, angle) => {
        const s = PROJECTILES.torpedoSpeed;
        this.projectiles.push(new Projectile('torpedo', x, y, Math.cos(angle) * s, Math.sin(angle) * s));
        this.emit({ type: 'shot', kind: 'torpedo', x, y });
      },
      dropCrate: (x, y, vx, vy) => {
        if (this.terrain.isClear(x, y, 14)) this.crates.push(new Crate(this.world, x, y, vx, vy));
      },
    };
    this.spawnCtx = {
      rng: this.rng,
      terrain: this.terrain,
      water: this.water,
      get playerX() {
        return sim.player.x;
      },
      get playerY() {
        return sim.player.y;
      },
      get alertLevel() {
        return sim.rules.alertLevel;
      },
      get aliveTotal() {
        return sim.enemies.length;
      },
      aliveOfKind: (kind) => this.countKind(kind),
      get humansActive() {
        return sim.humansActive;
      },
      get humansAvailable() {
        return sim.rules.humansLeft - sim.humansActive;
      },
      spawn: (kind, x, y, maxSpeed) => this.spawnEnemy(kind, x, y, maxSpeed),
    };

    this.world.on('pre-solve', (contact) => this.onPreSolve(contact));
    this.world.on('begin-contact', (contact) => this.onBeginContact(contact));

    if (this.spawning) this.spawner.prewarm(this.spawnCtx);
  }

  get humansActive(): number {
    let n = 0;
    for (const e of this.enemies) if (e.def.human) n++;
    return n;
  }

  countKind(kind: EnemyKind): number {
    let n = 0;
    for (const e of this.enemies) if (e.def.kind === kind) n++;
    return n;
  }

  spawnEnemy(kind: EnemyKind, x: number, y: number, maxSpeed?: number): Enemy {
    const enemy = new Enemy(this.world, ENEMIES[kind], x, y, this.rng, maxSpeed);
    this.enemies.push(enemy);
    return enemy;
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(event: SimEvent): void {
    this.events.push(event);
  }

  /** Advance the world by one fixed step. */
  step(input: InputFrame = NO_INPUT): void {
    const dt = PHYSICS.step;
    this.time += dt;
    this.steps++;
    this.slowMoCooldown = Math.max(0, this.slowMoCooldown - dt);

    this.forEachEntity((e) => e.snapshot());
    const playing = this.rules.state === 'playing';

    this.player.control(dt, playing ? input : NO_INPUT, this.playerCtx);
    for (const enemy of this.enemies) enemy.update(dt, this.enemyCtx);
    for (const buoy of this.buoys) buoy.moor(dt);

    this.applyWater();
    this.world.step(dt, PHYSICS.velocityIterations, PHYSICS.positionIterations);
    this.forEachEntity((e) => e.sync());

    this.resolveContacts();
    this.updateSplashes();
    this.updateMouth();
    this.updateProjectiles(dt);
    this.updateEggs(dt);
    this.updateCrates(dt);
    this.water.update(dt);
    this.rules.update(dt);
    this.checkProgress();

    if (this.spawning && this.rules.state === 'playing') this.spawner.update(dt, this.spawnCtx);
    this.despawnDistant();
    this.removeDead();
  }

  private forEachEntity(fn: (e: Entity) => void): void {
    fn(this.player);
    for (const e of this.enemies) fn(e);
    for (const e of this.eggs) fn(e);
    for (const e of this.crates) fn(e);
    for (const e of this.buoys) fn(e);
  }

  private applyWater(): void {
    const player = this.player;
    player.submerged = applyWaterForces(player.body, this.water, PLAYER.headWaterDrag);
    for (const seg of player.segments) applyWaterForces(seg.body, this.water, PLAYER.tentacleWaterDrag);
    for (const e of this.enemies) e.submerged = applyWaterForces(e.body, this.water);
    for (const e of this.eggs) e.submerged = applyWaterForces(e.body, this.water);
    for (const e of this.crates) e.submerged = applyWaterForces(e.body, this.water);
    for (const e of this.buoys) e.submerged = applyWaterForces(e.body, this.water, BUOYS.waterDrag);
  }

  // --- Contacts ------------------------------------------------------------

  private onPreSolve(contact: Contact): void {
    const fa = contact.getFixtureA();
    const fb = contact.getFixtureB();
    const a = fa.getBody().getUserData() as BodyOwner;
    const b = fb.getBody().getUserData() as BodyOwner;
    if (!isEntity(a) || !isEntity(b)) return;

    let partFixture: Fixture | null = null;
    let other: Entity | null = null;
    if (a.type === 'player') {
      partFixture = fa;
      other = b;
    } else if (b.type === 'player') {
      partFixture = fb;
      other = a;
    }
    if (!partFixture || !other) return;
    if (!other.alive) {
      contact.setEnabled(false);
      return;
    }
    if (this.rules.state !== 'playing') return;

    const partSpeed = this.partSpeed(partFixture);
    if (other.type === 'enemy') {
      const enemy = other as Enemy;
      if (enemy.electrified) {
        this.shocks.add(enemy);
        return;
      }
      if (partSpeed >= enemy.def.killSpeed && enemy.hitCooldown <= 0) {
        // Plough straight through anything that will die from this hit.
        if (enemy.hp <= 1) contact.setEnabled(false);
        this.enemyHits.set(enemy, { byEgg: false });
      } else if (enemy.hp <= 1 && enemy.hitCooldown <= 0 && this.enemyHits.has(enemy)) {
        contact.setEnabled(false);
      }
    } else if (other.type === 'crate' && partSpeed >= PLAYER.killSpeed) {
      contact.setEnabled(false);
      this.brokenCrates.add(other as Crate);
    }
  }

  private partSpeed(partFixture: Fixture): number {
    const tag = partFixture.getUserData() as PartTag | undefined;
    const headSpeed = speed(this.player.body);
    if (tag?.part === 'tentacle') return Math.max(headSpeed, speed(partFixture.getBody()));
    return headSpeed;
  }

  private onBeginContact(contact: Contact): void {
    const fa = contact.getFixtureA();
    const fb = contact.getFixtureB();
    const a = fa.getBody().getUserData() as BodyOwner;
    const b = fb.getBody().getUserData() as BodyOwner;
    const terrainA = a === TERRAIN_TAG;
    const terrainB = b === TERRAIN_TAG;

    if (terrainA || terrainB) {
      const other = terrainA ? b : a;
      const otherFixture = terrainA ? fb : fa;
      if (!isEntity(other)) return;
      if (other.type === 'player') {
        const tag = otherFixture.getUserData() as PartTag | undefined;
        if (tag?.part === 'head') this.landingSpeed = Math.max(this.landingSpeed, speed(this.player.body));
      } else if (other.type === 'enemy') {
        const manifold = contact.getWorldManifold(null);
        if (manifold) this.terrainBumps.set(other as Enemy, manifold.normal.x);
      }
      return;
    }

    if (!isEntity(a) || !isEntity(b)) return;
    const egg = a.type === 'egg' ? (a as Egg) : b.type === 'egg' ? (b as Egg) : null;
    if (!egg || !egg.alive) return;
    const target = egg === a ? b : a;
    if (target.type === 'enemy' && target.alive) {
      this.spentEggs.add(egg);
      this.enemyHits.set(target as Enemy, { byEgg: true });
    } else if (target.type === 'crate' && target.alive) {
      this.spentEggs.add(egg);
      this.brokenCrates.add(target as Crate);
    }
  }

  private resolveContacts(): void {
    for (const [enemy, info] of this.enemyHits) if (enemy.alive) this.damageEnemy(enemy, info.byEgg);
    this.enemyHits.clear();

    for (const egg of this.spentEggs) this.explodeEgg(egg);
    this.spentEggs.clear();

    for (const crate of this.brokenCrates) this.breakCrate(crate);
    this.brokenCrates.clear();

    for (const eel of this.shocks) {
      if (!eel.alive || !this.hurtPlayer(PROJECTILES.eelShockDamage, 'shock', eel.x, eel.y)) continue;
      this.player.stunTimer = PLAYER.stunTime;
      this.emit({ type: 'shock', x: this.player.x, y: this.player.y });
    }
    this.shocks.clear();

    for (const [enemy, nx] of this.terrainBumps) if (enemy.alive) enemy.onTerrainContact(nx);
    this.terrainBumps.clear();

    if (this.landingSpeed > 0) {
      // Original: touching ground restores the air lunge.
      this.player.canAirLunge = true;
      if (!this.player.wet && this.landingSpeed > PLAYER.landSoundSpeed) {
        this.emit({ type: 'land', x: this.player.x, y: this.player.y, speed: this.landingSpeed });
      }
      this.landingSpeed = 0;
    }
  }

  private damageEnemy(enemy: Enemy, byEgg: boolean): void {
    if (enemy.hitCooldown > 0) return;
    enemy.hp -= 1;
    if (enemy.hp > 0) {
      enemy.hitCooldown = 0.5;
      this.emit({ type: 'enemyHit', kind: enemy.def.kind, x: enemy.x, y: enemy.y });
      if (!byEgg) this.player.knockback(enemy.x, enemy.y, 260);
      return;
    }
    this.killEnemy(enemy, byEgg);
  }

  private killEnemy(enemy: Enemy, byEgg: boolean): void {
    enemy.alive = false;
    const def = enemy.def;
    const result = this.rules.registerKill(def.points, def.rage, def.human);
    this.emit({
      type: 'kill',
      kind: def.kind,
      x: enemy.x,
      y: enemy.y,
      points: result.points,
      multiplier: result.multiplier,
      combo: result.combo,
      rage: def.rage,
      effect: def.death,
      human: def.human,
      byEgg,
    });

    // Passengers tumble out of destroyed ferries and balloons.
    const passengers = def.kind === 'ferry' ? this.rng.int(1, 2) : def.kind === 'balloon' ? 1 : 0;
    for (let i = 0; i < passengers; i++) {
      if (this.rules.humansLeft - this.humansActive <= 0) break;
      const x = enemy.x + this.rng.range(-40, 40);
      const y = enemy.y + (def.kind === 'balloon' ? 30 : -20);
      if (!this.terrain.isClear(x, y, 20)) continue;
      const swimmer = this.spawnEnemy('swimmer', x, y);
      swimmer.dir = this.rng.sign();
    }

    if (!this.player.wet && !byEgg && this.slowMoCooldown <= 0 && this.rng.chance(RAGE.slowMoChance)) {
      this.slowMoCooldown = RAGE.slowMoCooldown;
      this.emit({ type: 'slowmo' });
    }
  }

  private explodeEgg(egg: Egg): void {
    if (!egg.alive) return;
    egg.alive = false;
    this.emit({ type: 'explosion', x: egg.x, y: egg.y, big: false });
  }

  private breakCrate(crate: Crate): void {
    if (!crate.alive) return;
    crate.alive = false;
    this.rules.addRage(CRATE.rage);
    this.rules.addPoints(CRATE.points);
    this.emit({ type: 'crateBreak', x: crate.x, y: crate.y, points: CRATE.points });
  }

  /** Returns false if the squid is still invulnerable from a previous hit. */
  private hurtPlayer(amount: number, source: HurtSource, fromX: number, fromY: number): boolean {
    const player = this.player;
    if (player.hurtTimer > 0 || this.rules.state !== 'playing') return false;
    player.hurtTimer = PLAYER.hurtInvulnerability;
    this.rules.damage(amount);
    player.knockback(fromX, fromY, PROJECTILES.knockback);
    this.emit({ type: 'hurt', amount, source, x: player.x, y: player.y });
    return true;
  }

  // --- Per-step systems -------------------------------------------------------

  private updateSplashes(): void {
    const player = this.player;
    const playerWet = player.submerged > 0.02;
    if (playerWet !== player.wet) {
      const v = velocity(player.body);
      player.wet = playerWet;
      if (playerWet) {
        player.hasBeenWet = true;
        player.canAirLunge = true;
      }
      const intensity = Math.min(1, Math.abs(v.y) / 700);
      if (intensity > 0.08) {
        this.water.disturb(player.x, 40, (playerWet ? 1 : -1) * Math.abs(v.y) * 0.35);
        this.emit({ type: 'splash', x: player.x, y: this.water.surfaceY(player.x), size: intensity, entering: playerWet, player: true });
      }
    }
    const bodies: Entity[] = [...this.enemies, ...this.crates, ...this.eggs];
    for (const e of bodies) {
      const wet = e.submerged > 0.3;
      const was = this.wasWet.get(e.id);
      this.wasWet.set(e.id, wet);
      if (was === undefined || was === wet) continue;
      const v = velocity(e.body);
      if (Math.abs(v.y) < 140) continue;
      const size = Math.min(1, (Math.abs(v.y) / 900) * (e.type === 'enemy' ? 1 : 0.5));
      this.water.disturb(e.x, 30, (wet ? 1 : -1) * Math.abs(v.y) * 0.25);
      this.emit({ type: 'splash', x: e.x, y: this.water.surfaceY(e.x), size, entering: wet, player: false });
    }
  }

  private updateMouth(): void {
    const p = this.player;
    const facing = p.body.getAngle();
    let open = false;
    for (const e of this.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > PLAYER.mouthRange) continue;
      let diff = Math.atan2(dy, dx) - facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) < 0.55) {
        open = true;
        break;
      }
    }
    p.mouthOpen = open;
  }

  private updateProjectiles(dt: number): void {
    const player = this.player;
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      if (p.kind === 'torpedo') {
        const surface = this.water.surfaceY(player.x);
        p.home(player.x, Math.max(player.y, surface + 30), dt);
      }
      p.advance(dt);

      if (player.spinTimer > 0 && Math.hypot(p.x - player.x, p.y - player.y) < PLAYER.spinParryRadius) {
        p.alive = false;
        this.rules.addPoints(25);
        this.emit({ type: 'parry', x: p.x, y: p.y });
        if (p.kind === 'torpedo') this.emit({ type: 'explosion', x: p.x, y: p.y, big: false });
        continue;
      }

      if (Math.hypot(p.x - player.x, p.y - player.y) < player.hitRadius + p.radius) {
        this.detonate(p, true);
        continue;
      }

      if (p.kind === 'torpedo') {
        for (const egg of this.eggs) {
          if (egg.alive && Math.hypot(egg.x - p.x, egg.y - p.y) < 18) {
            this.explodeEgg(egg);
            this.detonate(p, false);
            break;
          }
        }
        if (!p.alive) continue;
        // Torpedoes run below the surface.
        const surface = this.water.surfaceY(p.x);
        if (p.y < surface + 10) p.y = surface + 10;
      }

      if (this.hitsTerrain(p.prevX, p.prevY, p.x, p.y)) {
        this.detonate(p, false);
        continue;
      }

      if (p.kind === 'bullet' && this.water.depth(p.prevX, p.prevY) < 0 && this.water.depth(p.x, p.y) >= 0) {
        p.alive = false;
        this.water.disturb(p.x, 10, 60);
        this.emit({ type: 'bulletSplash', x: p.x, y: this.water.surfaceY(p.x) });
        continue;
      }

      if (p.life <= 0) {
        if (p.kind === 'torpedo') this.detonate(p, false);
        else p.alive = false;
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) if (!this.projectiles[i].alive) this.projectiles.splice(i, 1);
  }

  private detonate(p: Projectile, direct: boolean): void {
    p.alive = false;
    const player = this.player;
    const dist = Math.hypot(p.x - player.x, p.y - player.y);
    if (p.kind === 'torpedo') {
      this.emit({ type: 'explosion', x: p.x, y: p.y, big: true });
      if (direct || dist < PROJECTILES.torpedoBlastRadius) this.hurtPlayer(p.damage, 'torpedo', p.x, p.y);
    } else if (direct) {
      this.hurtPlayer(p.damage, 'bullet', p.x - p.vx, p.y - p.vy);
    }
  }

  private hitsTerrain(x1: number, y1: number, x2: number, y2: number): boolean {
    if (x1 === x2 && y1 === y2) return false;
    let hit = false;
    this.world.rayCast(vecM(x1, y1), vecM(x2, y2), (fixture, _point, _normal, fraction) => {
      if ((fixture.getFilterCategoryBits() & Cat.TERRAIN) === 0) return -1;
      hit = true;
      return fraction;
    });
    return hit;
  }

  private updateEggs(dt: number): void {
    for (const egg of this.eggs) {
      if (!egg.alive) continue;
      egg.life -= dt;
      if (egg.life <= 0) this.explodeEgg(egg);
    }
  }

  private updateCrates(dt: number): void {
    for (const crate of this.crates) {
      crate.age += dt;
      if (crate.age > 45) crate.alive = false;
    }
  }

  private checkProgress(): void {
    const level = this.rules.alertLevel;
    if (level > this.lastAlert) {
      this.lastAlert = level;
      this.emit({ type: 'alert', level });
    }
    if (!this.gameOverSent && this.rules.state !== 'playing') {
      this.gameOverSent = true;
      if (this.rules.state === 'lost') this.player.limp = true;
      this.emit({ type: 'gameOver', won: this.rules.state === 'won' });
    }
  }

  private despawnDistant(): void {
    const p = this.player;
    const far = (e: Entity) =>
      Math.abs(e.x - p.x) > SPAWN.despawnDistanceX || Math.abs(e.y - p.y) > SPAWN.despawnDistanceY;
    for (const e of this.enemies) if (e.alive && far(e)) e.alive = false;
    for (const e of this.crates) if (e.alive && far(e)) e.alive = false;
  }

  private removeDead(): void {
    const prune = <T extends Entity>(list: T[]) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        if (e.alive) continue;
        this.world.destroyBody(e.body);
        this.wasWet.delete(e.id);
        list.splice(i, 1);
      }
    };
    prune(this.enemies);
    prune(this.eggs);
    prune(this.crates);
  }

  /** Debug/test helper: teleport the squid. */
  teleportPlayer(x: number, y: number, vx = 0, vy = 0): void {
    const { body } = this.player;
    const dx = x / PPM - body.getPosition().x;
    const dy = y / PPM - body.getPosition().y;
    body.setPosition(vecM(x, y));
    body.setLinearVelocity(new Vec2(vx / PPM, vy / PPM));
    for (const seg of this.player.segments) {
      const p = seg.body.getPosition();
      seg.body.setPosition(new Vec2(p.x + dx, p.y + dy));
      seg.body.setLinearVelocity(new Vec2(vx / PPM, vy / PPM));
    }
    this.forEachEntity((e) => {
      e.sync();
      e.snapshot();
    });
  }
}
