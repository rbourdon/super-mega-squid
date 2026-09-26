/**
 * Tunable constants. Distances are in world pixels, times in seconds, speeds in
 * px/s and accelerations in px/s^2 unless noted otherwise. Many values are taken
 * directly from the original 2013 HaxeFlixel/Nape build (converted from its
 * per-frame units at 60 fps).
 */

export const WORLD = {
  width: 8697,
  height: 3000,
  /** Mean height of the water surface. */
  waterLevel: 1505,
  /** Soft ceiling so the squid can never leave the top of the map. */
  ceiling: 0,
  gravity: 1200,
} as const;

export const PHYSICS = {
  /** Pixels per Box2D meter. */
  ppm: 30,
  step: 1 / 60,
  velocityIterations: 8,
  positionIterations: 3,
  /** Density of water and the gravity multiplier used for buoyancy (Nape FluidProperties). */
  fluidDensity: 5,
  fluidGravityScale: 1690 / 1200,
  /** Linear drag applied proportional to how submerged a body is (1/s). */
  waterLinearDrag: 1.6,
  waterAngularDrag: 3,
  airLinearDrag: 0.03,
} as const;

export const WAVES = {
  /** Spacing of the slow swell control points (original: 200px). */
  swellSpacing: 200,
  swellRange: [15, 55] as const,
  /** Phase speed range in radians per second (original 0.013-0.033 rad per frame). */
  swellSpeed: [0.78, 1.98] as const,
  /** Spacing of the spring columns used for splashes. */
  rippleSpacing: 12,
  rippleStiffness: 55,
  rippleDamping: 4.5,
  rippleSpread: 0.22,
  rippleMax: 60,
} as const;

export const PLAYER = {
  spawn: { x: 1080, y: 500 },
  radius: 13,
  density: 10,
  friction: 0.3,
  restitution: 0.1,
  /** Swimming (original: +49*3 px/s per frame, capped at 500 px/s per axis). */
  swimSpeed: 520,
  swimAccel: 5200,
  /** Lateral velocity damping while steering underwater (1/s) so turns feel responsive. */
  swimTurnDamping: 3.5,
  /** Air control (original: 30% power, capped at 350 px/s). */
  airSpeed: 350,
  airAccel: 1500,
  /** Rotation controller gain (1/s). */
  turnRate: 16,
  lungeImpulseWater: 820,
  lungeImpulseAir: 620,
  lungeCooldown: 0.42,
  maxSpeed: 1400,
  /** Water drag multiplier for the streamlined head. */
  headWaterDrag: 0.5,
  spinDuration: 10 / 60,
  spinCooldown: 0.85,
  spinAngularSpeed: 28,
  spinTentacleBoostWet: 95,
  spinTentacleBoostDry: 55,
  /** Radius around the head in which a spin destroys incoming projectiles. */
  spinParryRadius: 70,
  eggCount: 6,
  eggInterval: 9 / 60,
  eggCooldown: 6,
  /** Minimum speed (px/s) of the touching body part to devour something. */
  killSpeed: 200,
  /** Time without control after an electric shock. */
  stunTime: 0.6,
  hurtInvulnerability: 0.8,
  mouthRange: 200,
  landSoundSpeed: 160,
} as const;

/** Tentacle segment sizes (original: 4 tentacles of 4 segments, joined by free pivots). */
export const TENTACLES = {
  attachX: -7.5,
  attachYs: [-8, -3, 3, 8] as const,
  firstSegmentLengths: [22, 20, 20, 22] as const,
  // Much lighter than the head so they whip around instead of steering it.
  segments: [
    { length: 22, thickness: 8, density: 2.4 },
    { length: 18, thickness: 7, density: 2 },
    { length: 15, thickness: 5, density: 1.8 },
    { length: 14, thickness: 3, density: 1.6 },
  ] as const,
  /** Water drag (1/s) across a segment and along it: they stream and curl like ribbons. */
  dragAcross: 7,
  dragAlong: 0.9,
  /** Share of a swim stroke or lunge applied directly to the tentacles (the rest reaches them through the joints). */
  swimShare: 0.25,
  lungeShare: 0.3,
  /** Travelling wave that keeps them squirming (px/s^2 at the tip, radians/s, radians per segment). */
  wiggleAccel: 2300,
  wiggleSpeed: 6.5,
  wigglePhase: 1.3,
  /** Underwater push away from the body's midline (px/s^2) so the tentacles fan out instead of bunching. */
  spreadAccel: 700,
} as const;

export const EGG = {
  width: 12,
  height: 18,
  density: 4.5,
  life: 350 / 60,
} as const;

export const RAGE = {
  max: 200,
  /** Original: -1 every 12 frames. */
  drainPerSecond: 7,
  /** Drain multiplier grows linearly by this much per minute played. */
  drainRampPerMinute: 0.15,
  maxDrainMultiplier: 2,
  comboWindow: 2,
  slowMoChance: 1 / 7,
  slowMoCooldown: 3,
  slowMoScale: 0.2,
  /** Original recovered 0.01 per frame. */
  slowMoRecoverPerSecond: 0.6,
} as const;

export const OBJECTIVE = {
  /** Humans in the seaside town. Eat them all to win. */
  population: 35,
  /** Fraction of the population eaten at which each alert level starts. */
  alertThresholds: [0, 0.2, 0.45, 0.7] as const,
} as const;

export const SPAWN = {
  /** Original: spawning stops while 20 or more enemies are alive. */
  maxAlive: 18,
  /** Horizontal spawn distance from the player (off screen). */
  distance: [720, 1020] as const,
  despawnDistanceX: 1300,
  despawnDistanceY: 1600,
  maxHumansActive: 3,
  /** Humans are guaranteed to appear at least this often (seconds). */
  humanPity: 12,
  edgeMargin: 80,
} as const;

export const PROJECTILES = {
  bulletSpeed: 820,
  bulletDamage: 9,
  bulletLife: 1.6,
  burstSize: 3,
  burstInterval: 0.13,
  chopperFireInterval: [2.2, 3.4] as const,
  chopperRange: 620,
  torpedoSpeed: 300,
  torpedoTurnRate: 2.1,
  torpedoDamage: 22,
  torpedoLife: 6,
  torpedoBlastRadius: 55,
  subFireInterval: [4.5, 6.5] as const,
  subRange: 700,
  eelShockDamage: 16,
  knockback: 380,
} as const;

export type EnemyKind =
  | 'smallFish'
  | 'mediumFish'
  | 'shark'
  | 'eel'
  | 'sub'
  | 'diver'
  | 'swimmer'
  | 'motorBoat'
  | 'ferry'
  | 'swan'
  | 'gull'
  | 'balloon'
  | 'plane'
  | 'chopper';

export type Habitat = 'water' | 'surface' | 'air';
export type DeathEffect = 'blood' | 'explosion';

export interface AnimationDef {
  frames: number[];
  fps: number;
  loop: boolean;
}

export interface EnemyDef {
  kind: EnemyKind;
  /** Texture keys; one is picked at random for variety. */
  textures: readonly string[];
  frameWidth: number;
  frameHeight: number;
  animations?: Readonly<Record<string, AnimationDef>>;
  /** True when the art faces right when unflipped. */
  facesRight: boolean;
  /** Hitbox size as a fraction of the frame. */
  hitbox: readonly [number, number];
  /** Optional custom hull made of convex polygons (local pixels) instead of a box. */
  hull?: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  density: number;
  flying: boolean;
  fixedRotation: boolean;
  habitat: Habitat;
  /** Vertical spawn range (ignored for surface spawns, which use the water line). */
  spawnY: readonly [number, number];
  /** Spawns per second at each alert level (index 0..3). */
  spawnRate: readonly [number, number, number, number];
  maxAlive: number;
  groupSize?: readonly [number, number];
  accel: number;
  maxSpeed: readonly [number, number];
  /** Chance per second to turn around at random (original: 1/1000 per frame). */
  turnChance: number;
  rage: number;
  points: number;
  hp: number;
  /** Speed (px/s) the squid part must exceed to hurt this enemy. */
  killSpeed: number;
  death: DeathEffect;
  human: boolean;
}

const RANDOM_TURN = 0.06;

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDef>> = {
  smallFish: {
    kind: 'smallFish',
    textures: ['smallfish1', 'smallfish2', 'smallfish3'],
    frameWidth: 30,
    frameHeight: 10,
    facesRight: true,
    hitbox: [1, 1],
    density: 7,
    flying: false,
    fixedRotation: true,
    habitat: 'water',
    spawnY: [1780, 2560],
    spawnRate: [0.3, 0.28, 0.26, 0.24],
    maxAlive: 8,
    groupSize: [3, 5],
    accel: 480,
    maxSpeed: [150, 300],
    turnChance: RANDOM_TURN,
    rage: 4,
    points: 10,
    hp: 1,
    killSpeed: PLAYER.killSpeed,
    death: 'blood',
    human: false,
  },
  mediumFish: {
    kind: 'mediumFish',
    textures: ['mediumfish1', 'mediumfish2', 'mediumfish3'],
    frameWidth: 43,
    frameHeight: 13,
    facesRight: true,
    hitbox: [1, 1],
    density: 7,
    flying: false,
    fixedRotation: true,
    habitat: 'water',
    spawnY: [1780, 2560],
    spawnRate: [0.22, 0.22, 0.2, 0.2],
    maxAlive: 8,
    accel: 520,
    maxSpeed: [150, 300],
    turnChance: RANDOM_TURN,
    rage: 6,
    points: 15,
    hp: 1,
    killSpeed: PLAYER.killSpeed,
    death: 'blood',
    human: false,
  },
  shark: {
    kind: 'shark',
    textures: ['shark1', 'shark2', 'shark3'],
    frameWidth: 78,
    frameHeight: 34,
    facesRight: true,
    hitbox: [0.9, 0.6],
    density: 7,
    flying: false,
    fixedRotation: true,
    habitat: 'water',
    spawnY: [1800, 2560],
    spawnRate: [0.18, 0.2, 0.2, 0.2],
    maxAlive: 4,
    accel: 700,
    maxSpeed: [150, 300],
    turnChance: RANDOM_TURN,
    rage: 12,
    points: 40,
    hp: 1,
    killSpeed: 260,
    death: 'blood',
    human: false,
  },
  eel: {
    kind: 'eel',
    textures: ['electriceelanim'],
    frameWidth: 125,
    frameHeight: 33,
    animations: {
      swim: { frames: [0, 1, 2], fps: 4, loop: true },
      shock: { frames: [3, 4, 5], fps: 8, loop: true },
    },
    facesRight: true,
    hitbox: [0.85, 0.45],
    density: 7,
    flying: false,
    fixedRotation: true,
    habitat: 'water',
    spawnY: [1850, 2560],
    spawnRate: [0.1, 0.16, 0.2, 0.22],
    maxAlive: 3,
    accel: 650,
    maxSpeed: [150, 380],
    turnChance: RANDOM_TURN,
    rage: 16,
    points: 60,
    hp: 1,
    killSpeed: PLAYER.killSpeed,
    death: 'blood',
    human: false,
  },
  sub: {
    kind: 'sub',
    textures: ['submarine'],
    frameWidth: 104,
    frameHeight: 23,
    facesRight: true,
    hitbox: [0.95, 0.65],
    density: 7,
    flying: false,
    fixedRotation: true,
    habitat: 'water',
    spawnY: [1850, 2500],
    spawnRate: [0.06, 0.12, 0.2, 0.26],
    maxAlive: 3,
    accel: 300,
    maxSpeed: [150, 300],
    turnChance: RANDOM_TURN,
    rage: 20,
    points: 90,
    hp: 1,
    killSpeed: 320,
    death: 'explosion',
    human: false,
  },
  diver: {
    kind: 'diver',
    textures: ['diveranim'],
    frameWidth: 64,
    frameHeight: 27,
    animations: { swim: { frames: [0, 1], fps: 3, loop: true } },
    facesRight: true,
    hitbox: [0.85, 0.6],
    density: 7,
    flying: false,
    fixedRotation: true,
    habitat: 'water',
    spawnY: [1750, 2400],
    spawnRate: [0.06, 0.06, 0.06, 0.06],
    maxAlive: 3,
    accel: 400,
    maxSpeed: [120, 220],
    turnChance: RANDOM_TURN,
    rage: 24,
    points: 100,
    hp: 1,
    killSpeed: 150,
    death: 'blood',
    human: true,
  },
  swimmer: {
    kind: 'swimmer',
    textures: ['maleswimanim', 'femaleswimanim'],
    frameWidth: 46,
    frameHeight: 58,
    animations: {
      wade: { frames: [0, 1], fps: 2, loop: true },
      panic: { frames: [2, 1], fps: 4, loop: true },
    },
    facesRight: true,
    hitbox: [0.55, 0.8],
    density: 5,
    flying: false,
    fixedRotation: true,
    habitat: 'surface',
    spawnY: [1400, 1440],
    spawnRate: [0.08, 0.08, 0.08, 0.08],
    maxAlive: 3,
    accel: 90,
    maxSpeed: [40, 70],
    turnChance: 0.15,
    rage: 24,
    points: 100,
    hp: 1,
    killSpeed: 150,
    death: 'blood',
    human: true,
  },
  motorBoat: {
    kind: 'motorBoat',
    textures: ['smallboat'],
    frameWidth: 64,
    frameHeight: 19,
    facesRight: false,
    hitbox: [1, 1],
    hull: [
      [
        [-32, 8],
        [-32, 0],
        [-10, -5],
        [10, -5],
        [32, 0],
        [32, 8],
      ],
    ],
    density: 3.3,
    flying: false,
    fixedRotation: false,
    habitat: 'surface',
    spawnY: [1330, 1360],
    spawnRate: [0.22, 0.25, 0.25, 0.25],
    maxAlive: 4,
    accel: 520,
    maxSpeed: [100, 200],
    turnChance: RANDOM_TURN,
    rage: 10,
    points: 50,
    hp: 1,
    killSpeed: PLAYER.killSpeed,
    death: 'explosion',
    human: false,
  },
  ferry: {
    kind: 'ferry',
    textures: ['bigboat'],
    frameWidth: 179,
    frameHeight: 67,
    facesRight: false,
    hitbox: [1, 1],
    hull: [
      [
        [-87.5, -9.5],
        [87.5, -9.5],
        [87.5, 16.5],
        [74.5, 31.5],
        [-73.5, 31.5],
        [-85.5, -1.5],
      ],
      [
        [21.5, -17.5],
        [86.5, -17.5],
        [86.5, -9.5],
        [21.5, -9.5],
      ],
    ],
    density: 3,
    flying: false,
    fixedRotation: false,
    habitat: 'surface',
    spawnY: [1320, 1340],
    spawnRate: [0.02, 0.04, 0.05, 0.06],
    maxAlive: 1,
    accel: 160,
    maxSpeed: [60, 90],
    turnChance: 0.02,
    rage: 40,
    points: 400,
    hp: 3,
    killSpeed: 360,
    death: 'explosion',
    human: false,
  },
  swan: {
    kind: 'swan',
    textures: ['swananim'],
    frameWidth: 28,
    frameHeight: 27,
    animations: { fly: { frames: [0, 1], fps: 3, loop: true } },
    facesRight: true,
    hitbox: [0.9, 0.7],
    density: 2,
    flying: true,
    fixedRotation: true,
    habitat: 'air',
    spawnY: [780, 1360],
    spawnRate: [0.3, 0.3, 0.3, 0.3],
    maxAlive: 5,
    accel: 500,
    maxSpeed: [150, 250],
    turnChance: RANDOM_TURN,
    rage: 14,
    points: 30,
    hp: 1,
    killSpeed: PLAYER.killSpeed,
    death: 'blood',
    human: false,
  },
  gull: {
    kind: 'gull',
    textures: ['seagullanim'],
    frameWidth: 20,
    frameHeight: 9,
    animations: { fly: { frames: [0, 1], fps: 3, loop: true } },
    facesRight: true,
    hitbox: [1, 1],
    density: 2,
    flying: true,
    fixedRotation: true,
    habitat: 'air',
    spawnY: [820, 1380],
    spawnRate: [0.28, 0.28, 0.28, 0.28],
    maxAlive: 8,
    groupSize: [2, 4],
    accel: 380,
    maxSpeed: [200, 300],
    turnChance: RANDOM_TURN,
    rage: 14,
    points: 25,
    hp: 1,
    killSpeed: PLAYER.killSpeed,
    death: 'blood',
    human: false,
  },
  balloon: {
    kind: 'balloon',
    textures: ['hotairballoon'],
    frameWidth: 73,
    frameHeight: 92,
    facesRight: true,
    hitbox: [0.85, 0.9],
    density: 1,
    flying: true,
    fixedRotation: true,
    habitat: 'air',
    spawnY: [760, 1250],
    spawnRate: [0.12, 0.12, 0.1, 0.1],
    maxAlive: 3,
    accel: 90,
    maxSpeed: [100, 200],
    turnChance: RANDOM_TURN,
    rage: 25,
    points: 80,
    hp: 1,
    killSpeed: PLAYER.killSpeed,
    death: 'explosion',
    human: false,
  },
  plane: {
    kind: 'plane',
    textures: ['cargoplane'],
    frameWidth: 138,
    frameHeight: 57,
    facesRight: true,
    hitbox: [0.9, 0.5],
    density: 1.5,
    flying: true,
    fixedRotation: true,
    habitat: 'air',
    spawnY: [700, 1050],
    spawnRate: [0.08, 0.1, 0.12, 0.14],
    maxAlive: 2,
    accel: 600,
    maxSpeed: [200, 300],
    turnChance: RANDOM_TURN,
    rage: 30,
    points: 150,
    hp: 1,
    killSpeed: 280,
    death: 'explosion',
    human: false,
  },
  chopper: {
    kind: 'chopper',
    textures: ['helicopteranim'],
    frameWidth: 121,
    frameHeight: 32,
    animations: { fly: { frames: [0, 1], fps: 20, loop: true } },
    facesRight: true,
    hitbox: [0.8, 0.7],
    density: 1.5,
    flying: true,
    fixedRotation: false,
    habitat: 'air',
    spawnY: [760, 1200],
    spawnRate: [0.06, 0.18, 0.24, 0.3],
    maxAlive: 3,
    accel: 600,
    maxSpeed: [200, 300],
    turnChance: RANDOM_TURN,
    rage: 22,
    points: 120,
    hp: 1,
    killSpeed: PLAYER.killSpeed,
    death: 'explosion',
    human: false,
  },
};

export const ENEMY_KINDS = Object.keys(ENEMIES) as EnemyKind[];

/** Floating props anchored along the coast. */
export const BUOYS = {
  positions: [700, 3400, 4600, 6300, 7900] as const,
  width: 21,
  height: 57,
  /** Extra water damping so these light floats ride the swell instead of being tossed by it. */
  waterDrag: 3,
} as const;

export const CRATE = {
  width: 20,
  height: 18,
  density: 8,
  rage: 5,
  points: 20,
  dropInterval: [3, 5] as const,
} as const;

export const SCORE = {
  /** Multiplier grows by one for every N kills inside the combo window. */
  comboStep: 3,
  maxMultiplier: 8,
  victoryRageBonus: 10,
  victoryTimeBonus: 12000,
  victoryTimeBonusDecayPerSecond: 20,
} as const;
