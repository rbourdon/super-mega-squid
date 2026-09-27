import Phaser from 'phaser';
import { PLAYER, TENTACLES } from '../config';
import type { Player } from '../sim/player';
import { Depth } from './depth';

const INK = 0x0a0a0c;
const HURT = 0xc93d3d;
const SHOCK = 0xbff6ff;

/** Renders the squid: head sprite plus smooth tapered tentacles drawn from the physics segments. */
export class SquidView {
  private readonly head: Phaser.GameObjects.Sprite;
  private readonly tentacles: Phaser.GameObjects.Graphics;
  private chomping = false;
  private time = 0;

  constructor(scene: Phaser.Scene) {
    this.tentacles = scene.add.graphics().setDepth(Depth.Tentacles);
    this.head = scene.add.sprite(0, 0, 'playeranim', 0).setDepth(Depth.Player);
    this.head.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.chomping = false;
    });
  }

  chomp(): void {
    this.chomping = true;
    this.head.play('player-chomp', true);
  }

  get x(): number {
    return this.head.x;
  }

  get y(): number {
    return this.head.y;
  }

  update(player: Player, alpha: number, dt: number): void {
    this.time += dt;
    const x = player.lerpX(alpha);
    const y = player.lerpY(alpha);
    const angle = player.lerpAngle(alpha);
    this.head.setPosition(x, y).setRotation(angle);
    // Keep the teeth the right way up when swimming left.
    this.head.setFlipY(Math.cos(angle) < 0);
    if (!this.chomping) this.head.setFrame(player.mouthOpen ? 1 : 0);

    const blink = Math.floor(this.time * 20) % 2 === 0;
    let color = INK;
    if (player.stunTimer > 0) color = blink ? SHOCK : INK;
    else if (player.hurtTimer > 0) color = blink ? HURT : INK;
    if (color === INK) this.head.clearTint();
    else this.head.setTint(color).setTintMode(Phaser.TintModes.FILL);

    this.drawTentacles(player, alpha, x, y, angle, color);
  }

  private drawTentacles(player: Player, alpha: number, hx: number, hy: number, headAngle: number, color: number): void {
    const g = this.tentacles;
    g.clear();
    g.fillStyle(color, 1);
    const cos = Math.cos(headAngle);
    const sin = Math.sin(headAngle);
    player.tentacles.forEach((chain, t) => {
      // Root of the tentacle on the back of the head.
      const ax = TENTACLES.attachX;
      const ay = TENTACLES.attachYs[t];
      let px = hx + ax * cos - ay * sin;
      let py = hy + ax * sin + ay * cos;
      let prevWidth = TENTACLES.segments[0].thickness + 1;
      chain.forEach((seg, s) => {
        const cx = seg.lerpX(alpha);
        const cy = seg.lerpY(alpha);
        const a = seg.lerpAngle(alpha);
        const half = seg.length / 2 - 1.5;
        const ex = cx + Math.cos(a) * half;
        const ey = cy + Math.sin(a) * half;
        const nextWidth = s < chain.length - 1 ? TENTACLES.segments[s + 1].thickness : 1.2;
        this.taperedSegment(px, py, ex, ey, prevWidth, nextWidth);
        g.fillCircle(px, py, prevWidth / 2);
        px = ex;
        py = ey;
        prevWidth = nextWidth;
      });
      g.fillCircle(px, py, prevWidth / 2);
    });
    // Slight overlap with the head so the joint never shows a gap.
    g.fillCircle(hx - cos * 6, hy - sin * 6, PLAYER.radius * 0.6);
  }

  private taperedSegment(x1: number, y1: number, x2: number, y2: number, w1: number, w2: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const quad = [
      { x: x1 + (nx * w1) / 2, y: y1 + (ny * w1) / 2 },
      { x: x2 + (nx * w2) / 2, y: y2 + (ny * w2) / 2 },
      { x: x2 - (nx * w2) / 2, y: y2 - (ny * w2) / 2 },
      { x: x1 - (nx * w1) / 2, y: y1 - (ny * w1) / 2 },
    ];
    // Phaser's typings ask for Vector2 but only x/y are read.
    this.tentacles.fillPoints(quad as Phaser.Math.Vector2[], true);
  }

  setVisible(visible: boolean): void {
    this.head.setVisible(visible);
    this.tentacles.setVisible(visible);
  }
}
