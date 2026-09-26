import { describe, expect, it } from 'vitest';
import { ENEMIES, PLAYER, SPAWN } from '../../src/config';
import { LEVELS } from '../../src/level/levels';
import { NO_INPUT, type InputFrame, type SimEvent } from '../../src/sim/events';
import { Projectile } from '../../src/sim/projectile';
import { Egg } from '../../src/sim/props';
import { Rng } from '../../src/sim/rng';
import { Simulation, type SimulationOptions } from '../../src/sim/simulation';

/** Open water well away from any rocks. */
const OPEN_WATER = { x: 3800, y: 2000 };

function makeSim(options: SimulationOptions = {}): Simulation {
  return new Simulation({ seed: 7, spawning: false, ...options });
}

function run(sim: Simulation, seconds: number, input: InputFrame | ((step: number) => InputFrame) = NO_INPUT): SimEvent[] {
  const events: SimEvent[] = [];
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    sim.step(typeof input === 'function' ? input(i) : input);
    events.push(...sim.drainEvents());
  }
  return events;
}

const move = (x: number, y: number, extra: Partial<InputFrame> = {}): InputFrame => ({ ...NO_INPUT, moveX: x, moveY: y, ...extra });

describe('terrain', () => {
  it('knows where the rock is', () => {
    const sim = makeSim();
    expect(sim.terrain.isSolid(40, 1500)).toBe(true); // left cliff
    expect(sim.terrain.isSolid(4000, 2950)).toBe(true); // sea floor
    expect(sim.terrain.isSolid(OPEN_WATER.x, OPEN_WATER.y)).toBe(false);
    expect(sim.terrain.isSolid(3800, 500)).toBe(false); // sky
    expect(sim.terrain.isSolid(-10, 500)).toBe(true); // outside the map
  });
});

describe('squid physics', () => {
  it('falls from the sky into the sea at the start', () => {
    const sim = makeSim();
    expect(sim.player.wet).toBe(false);
    run(sim, 6);
    expect(sim.player.hasBeenWet).toBe(true);
  });

  it('sinks slowly when idle, like the original', () => {
    const sim = makeSim();
    sim.teleportPlayer(OPEN_WATER.x, 1800);
    run(sim, 3);
    expect(sim.player.wet).toBe(true);
    expect(sim.player.y).toBeGreaterThan(1800);
    expect(sim.player.y).toBeLessThan(1800 + 600);
  });

  it('swims in the steered direction at about swim speed', () => {
    const sim = makeSim();
    sim.teleportPlayer(3400, OPEN_WATER.y);
    run(sim, 1, move(1, 0));
    expect(sim.player.x).toBeGreaterThan(3400 + PLAYER.swimSpeed * 0.6);
    expect(Math.abs(Math.cos(sim.player.angle))).toBeGreaterThan(0.9);
  });

  it('leaps far out of the water with a lunge', () => {
    const sim = makeSim();
    sim.teleportPlayer(3600, 1750);
    let apex = Infinity;
    run(sim, 2.5, (i) => {
      apex = Math.min(apex, sim.player.y);
      return move(0, -1, { lunge: i === 12 });
    });
    expect(sim.water.level - apex).toBeGreaterThan(300);
  });

  it('allows only one lunge per airtime, restored by water', () => {
    const sim = makeSim();
    sim.teleportPlayer(3600, 800);
    sim.player.canAirLunge = true;
    run(sim, 1 / 60, move(1, 0, { lunge: true }));
    expect(sim.player.canAirLunge).toBe(false);
    const vx = sim.player.body.getLinearVelocity().x;
    run(sim, 1 / 60, move(1, 0, { lunge: true }));
    expect(sim.player.body.getLinearVelocity().x).toBeLessThanOrEqual(vx + 1);
    run(sim, 4);
    expect(sim.player.wet).toBe(true);
    expect(sim.player.canAirLunge).toBe(true);
  });
});

describe('buoyancy', () => {
  it('floats swimmers at the surface and sinks dense bodies', () => {
    const sim = makeSim();
    // Keep the squid nearby (far-away creatures despawn) but out of the way.
    sim.teleportPlayer(OPEN_WATER.x - 400, 2500);
    const swimmer = sim.spawnEnemy('swimmer', OPEN_WATER.x, 1650, 0.01);
    run(sim, 6);
    expect(swimmer.alive).toBe(true);
    expect(Math.abs(swimmer.y - sim.water.surfaceY(swimmer.x))).toBeLessThan(45);
    expect(swimmer.submerged).toBeGreaterThan(0.3);
    expect(swimmer.submerged).toBeLessThan(0.98);
  });

  it('keeps buoys afloat and upright as they ride the swell', () => {
    const sim = makeSim();
    run(sim, 2);
    expect(sim.buoys.length).toBeGreaterThan(2);
    const totals = sim.buoys.map(() => 0);
    const steps = 300;
    for (let i = 0; i < steps; i++) {
      sim.step();
      sim.buoys.forEach((buoy, b) => {
        totals[b] += buoy.submerged;
        expect(buoy.y).toBeGreaterThan(sim.water.surfaceY(buoy.x) - 45);
        expect(buoy.y).toBeLessThan(sim.water.surfaceY(buoy.x) + 30);
        expect(Math.abs(buoy.angle)).toBeLessThan(0.7);
        expect(Math.abs(buoy.x - buoy.homeX)).toBeLessThan(60);
      });
    }
    for (const total of totals) {
      expect(total / steps).toBeGreaterThan(0.15);
      expect(total / steps).toBeLessThan(0.7);
    }
  });
});

describe('eating', () => {
  it('devours prey hit at speed', () => {
    const sim = makeSim();
    sim.teleportPlayer(OPEN_WATER.x, OPEN_WATER.y, 650, 0);
    sim.spawnEnemy('mediumFish', OPEN_WATER.x + 90, OPEN_WATER.y, 1);
    const events = run(sim, 0.5, move(1, 0));
    const kill = events.find((e) => e.type === 'kill');
    expect(kill).toMatchObject({ type: 'kill', kind: 'mediumFish', byEgg: false });
    expect(sim.rules.kills).toBe(1);
    expect(sim.enemies).toHaveLength(0);
  });

  it('only bumps prey touched slowly', () => {
    const sim = makeSim();
    sim.teleportPlayer(OPEN_WATER.x, OPEN_WATER.y, 80, 0);
    sim.spawnEnemy('shark', OPEN_WATER.x + 70, OPEN_WATER.y, 1);
    const events = run(sim, 1);
    expect(events.some((e) => e.type === 'kill')).toBe(false);
    expect(sim.enemies).toHaveLength(1);
  });

  it('needs several hits to sink a ferry, and passengers fall out', () => {
    const sim = makeSim({ population: 10 });
    sim.teleportPlayer(OPEN_WATER.x - 300, 2300);
    const ferry = sim.spawnEnemy('ferry', OPEN_WATER.x, 1450, 1);
    run(sim, 2);
    let hits = 0;
    let passengersEaten = 0;
    for (let attempt = 0; attempt < 6 && ferry.alive; attempt++) {
      sim.teleportPlayer(ferry.x - 150, ferry.y + 40, 900, -150);
      const events = run(sim, 0.6, move(1, 0));
      hits += events.filter((e) => e.type === 'enemyHit').length;
      passengersEaten += events.filter((e) => e.type === 'kill' && e.kind === 'swimmer').length;
    }
    expect(ferry.alive).toBe(false);
    expect(hits).toBe(ENEMIES.ferry.hp - 1);
    // The charging squid may gobble the passengers straight away.
    expect(passengersEaten + sim.countKind('swimmer')).toBeGreaterThan(0);
  });

  it('wins when the last human is eaten', () => {
    const sim = makeSim({ population: 1 });
    sim.teleportPlayer(OPEN_WATER.x, OPEN_WATER.y, 650, 0);
    sim.spawnEnemy('diver', OPEN_WATER.x + 100, OPEN_WATER.y, 1);
    const events = run(sim, 0.6, move(1, 0));
    expect(events).toContainEqual({ type: 'gameOver', won: true });
    expect(sim.rules.state).toBe('won');
    expect(sim.rules.humansLeft).toBe(0);
  });
});

describe('abilities', () => {
  it('egg bombs destroy what they touch', () => {
    const sim = makeSim();
    sim.teleportPlayer(OPEN_WATER.x, OPEN_WATER.y);
    // A wall of stationary fish just above the squid; eggs float up into them.
    for (let i = -3; i <= 3; i++) sim.spawnEnemy('mediumFish', OPEN_WATER.x + i * 30, OPEN_WATER.y - 70, 0.01);
    const events = run(sim, 4, (i) => ({ ...NO_INPUT, eggs: i === 0 }));
    expect(events.some((e) => e.type === 'eggs')).toBe(true);
    expect(events.filter((e) => e.type === 'kill' && e.byEgg).length).toBeGreaterThan(0);
    expect(sim.player.eggCooldown).toBeGreaterThan(0);
  });

  it('spinning parries incoming torpedoes', () => {
    const sim = makeSim();
    sim.teleportPlayer(OPEN_WATER.x, OPEN_WATER.y);
    sim.projectiles.push(new Projectile('torpedo', OPEN_WATER.x + 90, OPEN_WATER.y, -300, 0));
    const events = run(sim, 0.5, (i) => ({ ...NO_INPUT, spin: i === 0 }));
    expect(events.some((e) => e.type === 'parry')).toBe(true);
    expect(events.some((e) => e.type === 'hurt')).toBe(false);
  });

  it('torpedoes hurt a squid that does not react', () => {
    const sim = makeSim();
    sim.teleportPlayer(OPEN_WATER.x, OPEN_WATER.y);
    sim.projectiles.push(new Projectile('torpedo', OPEN_WATER.x + 150, OPEN_WATER.y, -300, 0));
    const rage = sim.rules.rage;
    const events = run(sim, 1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'hurt', source: 'torpedo' }));
    expect(sim.rules.rage).toBeLessThan(rage - 15);
  });
});

describe('hazards', () => {
  it('electrified eels shock and stun instead of being eaten', () => {
    const sim = makeSim();
    sim.teleportPlayer(OPEN_WATER.x, OPEN_WATER.y, 600, 0);
    const eel = sim.spawnEnemy('eel', OPEN_WATER.x + 110, OPEN_WATER.y, 0.01);
    eel.electrify(3);
    const events = run(sim, 0.4, move(1, 0));
    expect(events.some((e) => e.type === 'shock')).toBe(true);
    expect(eel.alive).toBe(true);
    expect(sim.player.stunTimer).toBeGreaterThan(0);
  });

  it('alerted choppers shoot at an exposed squid but not a submerged one', () => {
    const exposed = makeSim({ population: 10 });
    exposed.rules.humansEaten = 3; // alert level 1
    exposed.teleportPlayer(1900, 900); // lands on the island
    exposed.spawnEnemy('chopper', 2300, 800).dir = -1;
    const shotsExposed = run(exposed, 8).filter((e) => e.type === 'shot').length;
    expect(shotsExposed).toBeGreaterThan(0);

    const hidden = makeSim({ population: 10 });
    hidden.rules.humansEaten = 3;
    hidden.teleportPlayer(OPEN_WATER.x, 2300);
    hidden.spawnEnemy('chopper', OPEN_WATER.x + 300, 1200).dir = -1;
    const shotsHidden = run(hidden, 5).filter((e) => e.type === 'shot').length;
    expect(shotsHidden).toBe(0);
  });

  it('calm choppers do not shoot before any alert', () => {
    const sim = makeSim();
    sim.teleportPlayer(1900, 900);
    sim.spawnEnemy('chopper', 2300, 800).dir = -1;
    expect(run(sim, 5).some((e) => e.type === 'shot')).toBe(false);
  });
});

describe('game flow', () => {
  it('ends the game when rage runs out and ignores input afterwards', () => {
    const sim = makeSim();
    sim.teleportPlayer(OPEN_WATER.x, OPEN_WATER.y);
    sim.rules.rage = 2;
    const events = run(sim, 1);
    expect(events).toContainEqual({ type: 'gameOver', won: false });
    expect(sim.player.limp).toBe(true);
    const x = sim.player.x;
    run(sim, 1, move(1, 0, { lunge: true }));
    expect(Math.abs(sim.player.x - x)).toBeLessThan(40);
  });

  it('is deterministic for a given seed and input sequence', () => {
    const play = () => {
      const sim = new Simulation({ seed: 99 });
      const rng = new Rng(5);
      for (let i = 0; i < 600; i++) {
        sim.step({
          moveX: rng.range(-1, 1),
          moveY: rng.range(-1, 1),
          lunge: rng.chance(0.05),
          spin: rng.chance(0.02),
          eggs: rng.chance(0.01),
        });
      }
      return { x: sim.player.x, y: sim.player.y, score: sim.rules.score, enemies: sim.enemies.length };
    };
    expect(play()).toEqual(play());
  });

  it.each(LEVELS)('stays stable and in bounds through a long chaotic session on $name, never spawning inside rock', (level) => {
    const sim = new Simulation({ seed: 1234, level });
    const rng = new Rng(77);
    const seen = new Set<number>();
    let input = NO_INPUT;
    for (let i = 0; i < 60 * 90; i++) {
      if (i % 30 === 0) input = move(rng.range(-1, 1), rng.range(-1, 1));
      sim.step({ ...input, lunge: rng.chance(0.03), spin: rng.chance(0.01), eggs: rng.chance(0.005) });
      sim.drainEvents();
      if (sim.rules.state !== 'playing') sim.rules.rage = 200;
      for (const e of sim.enemies) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        expect(sim.terrain.isSolid(e.x, e.y)).toBe(false);
      }
      expect(sim.enemies.length).toBeLessThanOrEqual(SPAWN.maxAlive + 12);
    }
    const p = sim.player;
    for (const v of [p.x, p.y, ...p.segments.flatMap((s) => [s.x, s.y])]) expect(Number.isFinite(v)).toBe(true);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(sim.terrain.width);
    expect(p.y).toBeLessThan(sim.terrain.height);
    expect(sim.terrain.isSolid(p.x, p.y)).toBe(false);
    expect(seen.size).toBeGreaterThan(20);
  });
});

describe('egg bombs near rock', () => {
  it('are never laid inside the terrain', () => {
    const sim = makeSim();
    // Squid in the water with its back against the left cliff, facing away from it.
    let x = 40;
    while (!sim.terrain.isClear(x, 2000, 16)) x += 2;
    expect(sim.terrain.isSolid(x - 30, 2000)).toBe(true);
    sim.teleportPlayer(x, 2000);
    sim.player.body.setAngle(0);
    run(sim, 1, (i) => ({ ...NO_INPUT, eggs: i === 0 }));
    expect(sim.eggs.length).toBeGreaterThan(0);
    for (const egg of sim.eggs) expect(sim.terrain.isSolid(egg.x, egg.y)).toBe(false);
  });

  it('each egg damages a multi-hit ferry, even right after another hit', () => {
    const sim = makeSim({ population: 10 });
    sim.teleportPlayer(OPEN_WATER.x - 300, 2300);
    const ferry = sim.spawnEnemy('ferry', OPEN_WATER.x, 1450, 1);
    run(sim, 1);
    ferry.hitCooldown = 0.5;
    const hp = ferry.hp;
    sim.eggs.push(new Egg(sim.world, ferry.x, ferry.y + 40, 0, -200, 0));
    run(sim, 0.5);
    expect(ferry.hp).toBeLessThan(hp);
  });
});
