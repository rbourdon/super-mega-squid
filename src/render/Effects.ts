import Phaser from 'phaser';
import { FONT_FAMILY } from '../assets';
import type { Simulation } from '../sim/simulation';
import type { Water } from '../sim/water';
import { Depth } from './depth';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/** One-shot visual effects: blood, explosions, splashes, bubbles, sparks and score popups. */
export class Effects {
  private readonly animPool: Phaser.GameObjects.Sprite[] = [];
  private readonly popupPool: Phaser.GameObjects.Text[] = [];
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly blood: Emitter;
  private readonly droplets: Emitter;
  private readonly bubbles: Emitter;
  private readonly sparks: Emitter;
  private readonly embers: Emitter;
  private readonly debris: Emitter;
  private readonly ringList: Array<{ x: number; y: number; r: number; maxR: number; color: number }> = [];
  private bubbleTimer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    water: Water,
  ) {
    const burst = { emitting: false } as const;
    // Original: 10 red 4-5px particles thrown in every direction.
    this.blood = scene.add
      .particles(0, 0, 'px', {
        ...burst,
        tint: [0xc93d3d, 0xa02828, 0xd85050],
        scale: { min: 1, max: 1.3 },
        speed: { min: 50, max: 230 },
        angle: { min: 0, max: 360 },
        gravityY: 260,
        lifespan: { min: 550, max: 1100 },
        alpha: { start: 1, end: 0 },
      })
      .setDepth(Depth.Effects);
    this.droplets = scene.add
      .particles(0, 0, 'dot', {
        ...burst,
        tint: [0xffffff, 0xd8f0ff, 0xa9dcff],
        scale: { start: 0.55, end: 0.15 },
        speedX: { min: -140, max: 140 },
        speedY: { min: -420, max: -120 },
        gravityY: 1000,
        lifespan: { min: 450, max: 800 },
        alpha: { start: 0.95, end: 0.2 },
      })
      .setDepth(Depth.SurfaceEffects);
    this.bubbles = scene.add
      .particles(0, 0, 'bubble3', {
        ...burst,
        scale: { min: 0.3, max: 0.85 },
        speedX: { min: -18, max: 18 },
        speedY: { min: -70, max: -25 },
        accelerationY: -60,
        lifespan: { min: 700, max: 1600 },
        alpha: { start: 0.9, end: 0 },
        deathZone: { type: 'onLeave', source: { contains: (x: number, y: number) => water.depth(x, y) > 2 } },
      })
      .setDepth(Depth.Effects);
    this.sparks = scene.add
      .particles(0, 0, 'px', {
        ...burst,
        tint: [0xffffff, 0x9ff3ff, 0x4fd6ff],
        scale: { start: 0.9, end: 0.2 },
        speed: { min: 120, max: 340 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 180, max: 380 },
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(Depth.Popups - 1);
    this.embers = scene.add
      .particles(0, 0, 'dot', {
        ...burst,
        tint: [0xfff2a8, 0xffb13b, 0xff6a1f, 0xd8351f],
        scale: { start: 1.1, end: 0 },
        speed: { min: 60, max: 280 },
        angle: { min: 0, max: 360 },
        gravityY: 120,
        lifespan: { min: 300, max: 700 },
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(Depth.Effects);
    this.debris = scene.add
      .particles(0, 0, 'px', {
        ...burst,
        tint: [0x8a6a3d, 0xa98552, 0x5b4527],
        scale: { min: 0.8, max: 1.6 },
        speed: { min: 80, max: 260 },
        angle: { min: 200, max: 340 },
        rotate: { min: 0, max: 360 },
        gravityY: 700,
        lifespan: { min: 500, max: 900 },
      })
      .setDepth(Depth.Effects);
    this.rings = scene.add.graphics().setDepth(Depth.Effects + 1);
  }

  private animSprite(): Phaser.GameObjects.Sprite {
    let sprite = this.animPool.find((s) => !s.visible);
    if (!sprite) {
      sprite = this.scene.add.sprite(0, 0, 'bloodanim2', 0).setDepth(Depth.Effects).setVisible(false);
      this.animPool.push(sprite);
    }
    return sprite;
  }

  bloodSplat(x: number, y: number): void {
    const sprite = this.animSprite();
    sprite.setPosition(x, y).setScale(1).setAngle(Phaser.Math.Between(0, 3) * 90).setVisible(true);
    sprite.play('blood');
    this.blood.explode(12, x, y);
  }

  explosion(x: number, y: number, big: boolean): void {
    const sprite = this.animSprite();
    sprite.setPosition(x, y).setScale(big ? 1.5 : 0.9).setAngle(0).setVisible(true);
    sprite.play('explosion');
    this.embers.explode(big ? 26 : 12, x, y);
  }

  splash(x: number, y: number, size: number): void {
    this.droplets.explode(Math.round(6 + size * 26), x, y);
  }

  bubbleBurst(x: number, y: number, count: number): void {
    this.bubbles.explode(count, x, y);
  }

  sparkBurst(x: number, y: number, count = 14): void {
    this.sparks.explode(count, x, y);
  }

  woodBurst(x: number, y: number): void {
    this.debris.explode(10, x, y);
  }

  ring(x: number, y: number, radius: number, color = 0xffffff): void {
    this.ringList.push({ x, y, r: radius * 0.3, maxR: radius, color });
  }

  popup(x: number, y: number, text: string, color = '#ffffff', size = 20): void {
    let label = this.popupPool.find((t) => !t.visible);
    if (!label) {
      label = this.scene.add
        .text(0, 0, '', { fontFamily: FONT_FAMILY, fontSize: '20px', color: '#ffffff' })
        .setOrigin(0.5)
        .setDepth(Depth.Popups)
        .setShadow(1, 2, 'rgba(0,0,0,0.6)', 2, false, true);
      this.popupPool.push(label);
    }
    label.setText(text).setColor(color).setFontSize(size).setPosition(x, y).setAlpha(1).setScale(0.6).setVisible(true);
    this.scene.tweens.add({
      targets: label,
      y: y - 46,
      scale: 1,
      duration: 260,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: label,
      alpha: 0,
      delay: 650,
      duration: 350,
      onComplete: () => label.setVisible(false),
    });
  }

  /** Continuous effects: bubble trails behind fast swimmers and torpedoes. */
  update(dt: number, sim: Simulation): void {
    this.bubbleTimer -= dt;
    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = 0.06;
      const p = sim.player;
      if (p.wet && p.speed > 380) this.bubbles.explode(1, p.x - Math.cos(p.angle) * 12, p.y - Math.sin(p.angle) * 12);
      for (const proj of sim.projectiles) {
        if (proj.kind === 'torpedo' && Math.random() < 0.6) this.bubbles.explode(1, proj.x, proj.y);
      }
      for (const e of sim.enemies) {
        if ((e.def.kind === 'diver' && Math.random() < 0.08) || (e.def.kind === 'sub' && Math.random() < 0.1)) {
          this.bubbles.explode(1, e.x + e.dir * (e.width / 2 - 6), e.y - 6);
        }
      }
    }

    const g = this.rings;
    g.clear();
    for (let i = this.ringList.length - 1; i >= 0; i--) {
      const ring = this.ringList[i];
      ring.r += (ring.maxR - ring.r) * Math.min(1, dt * 14) + 30 * dt;
      const t = ring.r / ring.maxR;
      if (t >= 1) {
        this.ringList.splice(i, 1);
        continue;
      }
      g.lineStyle(3, ring.color, 0.8 * (1 - t)).strokeCircle(ring.x, ring.y, ring.r);
    }
  }
}
