import type { World } from 'planck';
import { BUOYS, CRATE, EGG } from '../config';
import { Entity } from './entity';
import { Cat, Mask, boxFixture, polygonFixture, setVelocity, vecM, velocity } from './physics';

/** Egg bombs: float up in water, drop in air, destroy anything they touch. */
export class Egg extends Entity {
  readonly type = 'egg';
  life: number = EGG.life;

  constructor(world: World, x: number, y: number, vx: number, vy: number, spin: number) {
    super(world.createBody({ type: 'dynamic', position: vecM(x, y), bullet: true, angularDamping: 1 }));
    boxFixture(this.body, EGG.width, EGG.height, {
      density: EGG.density,
      friction: 0.2,
      restitution: 0.4,
      filterCategoryBits: Cat.EGG,
      filterMaskBits: Mask.EGG,
    });
    setVelocity(this.body, vx, vy);
    this.body.setAngularVelocity(spin);
  }
}

/** Cargo crates dropped by planes. Sink slowly; smash them for a little rage. */
export class Crate extends Entity {
  readonly type = 'crate';
  age = 0;

  constructor(world: World, x: number, y: number, vx: number, vy: number) {
    super(world.createBody({ type: 'dynamic', position: vecM(x, y), angularDamping: 0.5 }));
    boxFixture(this.body, CRATE.width, CRATE.height, {
      density: CRATE.density,
      friction: 0.5,
      restitution: 0.2,
      filterCategoryBits: Cat.PROP,
      filterMaskBits: Mask.PROP,
    });
    setVelocity(this.body, vx, vy);
  }
}

/** Navigation buoys moored along the coast; they bob in the swell and can be shoved around. */
export class Buoy extends Entity {
  readonly type = 'buoy';

  constructor(
    world: World,
    readonly homeX: number,
    y: number,
  ) {
    super(world.createBody({ type: 'dynamic', position: vecM(homeX, y), angularDamping: 2, allowSleep: false }));
    const opt = { friction: 0.4, restitution: 0.2, filterCategoryBits: Cat.PROP, filterMaskBits: Mask.PROP };
    // Light lattice tower, a buoyant drum and heavy ballast (sprite is 21x57).
    polygonFixture(
      this.body,
      [
        [-3, -28],
        [3, -28],
        [8, -2],
        [-8, -2],
      ],
      { ...opt, density: 0.4 },
    );
    boxFixture(this.body, BUOYS.width - 1, 20, { ...opt, density: 1.6 }, { x: 0, y: 8 });
    boxFixture(this.body, 8, 6, { ...opt, density: 18 }, { x: 0, y: 24 });
  }

  /** Keep the buoy near its mooring and upright. */
  moor(dt: number): void {
    const v = velocity(this.body);
    const pull = (this.homeX - this.x) * 1.2;
    setVelocity(this.body, v.x + pull * dt, v.y);
    const angle = this.body.getAngle();
    this.body.setAngularVelocity(this.body.getAngularVelocity() - angle * 6 * dt);
  }
}
