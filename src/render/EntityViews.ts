import Phaser from 'phaser';
import type { Enemy } from '../sim/enemy';
import type { Entity } from '../sim/entity';
import type { Projectile } from '../sim/projectile';
import type { Simulation } from '../sim/simulation';
import { Depth } from './depth';

interface EnemySprite {
  sprite: Phaser.GameObjects.Sprite;
  anim: string | null;
  seen: boolean;
}

interface PlainSprite {
  sprite: Phaser.GameObjects.Image;
  lamp?: Phaser.GameObjects.Image;
  seen: boolean;
}

/**
 * Keeps a sprite for every simulated enemy, egg, crate, buoy and projectile.
 * Sprites are created on first sight and destroyed once their entity is gone.
 */
export class EntityViews {
  private readonly enemies = new Map<number, EnemySprite>();
  private readonly props = new Map<number, PlainSprite>();
  private readonly projectiles = new Map<number, PlainSprite>();
  private time = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  update(sim: Simulation, alpha: number, dt: number): void {
    this.time += dt;
    for (const view of this.enemies.values()) view.seen = false;
    for (const view of this.props.values()) view.seen = false;
    for (const view of this.projectiles.values()) view.seen = false;

    for (const enemy of sim.enemies) if (enemy.alive) this.updateEnemy(enemy, alpha);
    for (const egg of sim.eggs) if (egg.alive) this.updateProp(egg, 'eggbomb2', Depth.Eggs, alpha, egg.life < 1.2);
    for (const crate of sim.crates) if (crate.alive) this.updateProp(crate, 'cargo', Depth.Props, alpha, false);
    for (const buoy of sim.buoys) this.updateProp(buoy, 'buoy', Depth.Props, alpha, false);
    for (const p of sim.projectiles) if (p.alive) this.updateProjectile(p, alpha);

    for (const [id, view] of this.enemies) {
      if (view.seen) continue;
      view.sprite.destroy();
      this.enemies.delete(id);
    }
    for (const map of [this.props, this.projectiles]) {
      for (const [id, view] of map) {
        if (view.seen) continue;
        view.sprite.destroy();
        view.lamp?.destroy();
        map.delete(id);
      }
    }
  }

  private updateEnemy(enemy: Enemy, alpha: number): void {
    let view = this.enemies.get(enemy.id);
    if (!view) {
      const sprite = this.scene.add.sprite(enemy.x, enemy.y, enemy.texture, 0).setDepth(Depth.Enemies);
      view = { sprite, anim: null, seen: true };
      this.enemies.set(enemy.id, view);
    }
    view.seen = true;
    const { sprite } = view;
    sprite.setPosition(enemy.lerpX(alpha), enemy.lerpY(alpha));
    sprite.setRotation(enemy.def.fixedRotation ? 0 : enemy.lerpAngle(alpha));
    sprite.setFlipX((enemy.dir === 1) !== enemy.def.facesRight);
    if (enemy.anim !== view.anim) {
      view.anim = enemy.anim;
      if (enemy.anim) sprite.play(`${enemy.texture}:${enemy.anim}`, true);
    }
    // Flash white while a multi-hit enemy is recovering from a hit.
    if (enemy.hitCooldown > 0 && Math.floor(this.time * 18) % 2 === 0) {
      sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    } else {
      sprite.clearTint();
    }
  }

  private updateProp(entity: Entity, texture: string, depth: number, alpha: number, blinking: boolean): void {
    let view = this.props.get(entity.id);
    if (!view) {
      const sprite = this.scene.add.image(entity.x, entity.y, texture).setDepth(depth);
      view = { sprite, seen: true };
      if (entity.type === 'buoy') {
        view.lamp = this.scene.add
          .image(entity.x, entity.y, 'dot')
          .setDepth(depth + 0.1)
          .setTint(0xffe45c)
          .setBlendMode(Phaser.BlendModes.ADD);
      }
      this.props.set(entity.id, view);
    }
    view.seen = true;
    const x = entity.lerpX(alpha);
    const y = entity.lerpY(alpha);
    const angle = entity.lerpAngle(alpha);
    view.sprite.setPosition(x, y).setRotation(angle);
    if (blinking) view.sprite.setAlpha(Math.floor(this.time * 12) % 2 === 0 ? 1 : 0.35);
    if (view.lamp) {
      // Navigation light at the top of the buoy, blinking every two seconds.
      const lx = x + Math.sin(angle) * 22;
      const ly = y - Math.cos(angle) * 22;
      const on = this.time % 2 < 0.35;
      view.lamp.setPosition(lx, ly).setAlpha(on ? 1 : 0.15).setScale(on ? 1.6 : 0.8);
    }
  }

  private updateProjectile(p: Projectile, alpha: number): void {
    let view = this.projectiles.get(p.id);
    if (!view) {
      const sprite = this.scene.add.image(p.x, p.y, p.kind === 'bullet' ? 'bullet' : 'torpedo').setDepth(Depth.Projectiles);
      view = { sprite, seen: true };
      this.projectiles.set(p.id, view);
    }
    view.seen = true;
    view.sprite.setPosition(p.lerpX(alpha), p.lerpY(alpha)).setRotation(p.angle);
  }
}
