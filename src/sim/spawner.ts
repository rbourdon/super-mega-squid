import { ENEMIES, ENEMY_KINDS, SPAWN, type EnemyDef, type EnemyKind } from '../config';
import type { Enemy } from './enemy';
import type { Rng } from './rng';
import type { Terrain } from './terrain';
import type { Water } from './water';

export interface SpawnContext {
  rng: Rng;
  terrain: Terrain;
  water: Water;
  playerX: number;
  playerY: number;
  alertLevel: number;
  aliveTotal: number;
  aliveOfKind(kind: EnemyKind): number;
  humansActive: number;
  /** Humans that may still appear (population not yet eaten nor currently spawned). */
  humansAvailable: number;
  spawn(kind: EnemyKind, x: number, y: number, maxSpeed?: number): Enemy;
}

const HUMAN_KINDS: readonly EnemyKind[] = ['swimmer', 'diver'];

/**
 * Spawns enemies just off screen around the player, like the original
 * EnemyManager, but with per-second rates (frame-rate independent), alert-level
 * scaling and a guarantee that humans keep turning up.
 */
export class Spawner {
  private sinceHuman = 0;

  update(dt: number, ctx: SpawnContext): void {
    this.sinceHuman += dt;
    for (const kind of ENEMY_KINDS) {
      const def = ENEMIES[kind];
      const rate = def.spawnRate[Math.min(3, ctx.alertLevel)];
      if (ctx.rng.chance(rate * dt)) this.trySpawn(def, ctx);
    }
    if (this.sinceHuman > SPAWN.humanPity && ctx.humansActive === 0) {
      this.trySpawn(ENEMIES[ctx.rng.pick(HUMAN_KINDS)], ctx, true);
    }
  }

  /** Populate the area around the player at the start of a game. */
  prewarm(ctx: SpawnContext): void {
    const initial: EnemyKind[] = ['smallFish', 'smallFish', 'mediumFish', 'swimmer', 'gull', 'swan', 'motorBoat', 'shark'];
    for (const kind of initial) this.trySpawn(ENEMIES[kind], ctx, true, [350, 1000]);
  }

  trySpawn(
    def: EnemyDef,
    ctx: SpawnContext,
    ignoreCap = false,
    distance: readonly [number, number] = SPAWN.distance,
  ): boolean {
    if (!ignoreCap && ctx.aliveTotal >= SPAWN.maxAlive) return false;
    if (ctx.aliveOfKind(def.kind) >= def.maxAlive) return false;
    if (def.human && (ctx.humansActive >= SPAWN.maxHumansActive || ctx.humansAvailable <= 0)) return false;

    const origin = this.pickPosition(def, ctx, distance);
    if (!origin) return false;
    const count = def.groupSize ? ctx.rng.int(def.groupSize[0], def.groupSize[1]) : 1;
    const maxSpeed = ctx.rng.range(def.maxSpeed[0], def.maxSpeed[1]);
    const radius = hitRadius(def);
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      if (ctx.aliveOfKind(def.kind) >= def.maxAlive) break;
      const x = i === 0 ? origin.x : origin.x + ctx.rng.range(-45, 45);
      const y = i === 0 ? origin.y : origin.y + ctx.rng.range(-30, 30);
      if (i > 0 && !ctx.terrain.isClear(x, y, radius)) continue;
      const enemy = ctx.spawn(def.kind, x, y, maxSpeed);
      // Head toward the player's side of the map, like the original.
      enemy.dir = x > ctx.playerX ? -1 : 1;
      spawned++;
    }
    if (spawned > 0 && def.human) this.sinceHuman = 0;
    return spawned > 0;
  }

  private pickPosition(def: EnemyDef, ctx: SpawnContext, distance: readonly [number, number]): { x: number; y: number } | null {
    const { rng, terrain, water } = ctx;
    const radius = hitRadius(def);
    for (let attempt = 0; attempt < 6; attempt++) {
      let side = rng.sign();
      let x = ctx.playerX + side * rng.range(distance[0], distance[1]);
      if (x < SPAWN.edgeMargin || x > terrain.width - SPAWN.edgeMargin) {
        side = side === 1 ? -1 : 1;
        x = ctx.playerX + side * rng.range(distance[0], distance[1]);
        if (x < SPAWN.edgeMargin || x > terrain.width - SPAWN.edgeMargin) continue;
      }
      let y: number;
      if (def.habitat === 'surface') {
        // Needs open water at the surface here (not the island or the cliffs).
        if (!terrain.isClear(x, water.level + 30, radius) || !terrain.isClear(x, water.level - 40, radius)) continue;
        y = water.surfaceY(x) - def.frameHeight * 0.4;
      } else {
        y = rng.range(def.spawnY[0], def.spawnY[1]);
        if (def.habitat === 'water') y = Math.max(y, water.level + 120);
      }
      if (terrain.isClear(x, y, radius)) return { x, y };
    }
    return null;
  }
}

function hitRadius(def: EnemyDef): number {
  return (Math.max(def.frameWidth * def.hitbox[0], def.frameHeight * def.hitbox[1]) / 2) + 4;
}
