import type Phaser from 'phaser';

// Phaser's typings ask for Vector2 but only x/y are read.
type Points = Phaser.Math.Vector2[];
import type { Water } from '../sim/water';
import { Depth } from './depth';

const WATER_COLOR = 0x268cda;
const WATER_ALPHA = 0.64;
const SAMPLE_STEP = 8;

/**
 * The sea is drawn as a translucent overlay in front of everything below the
 * surface (as in the original), tinting creatures and rocks underwater.
 */
export class WaterView {
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly foam: Phaser.GameObjects.Graphics;
  private readonly points: Phaser.Types.Math.Vector2Like[] = [];

  constructor(scene: Phaser.Scene) {
    this.body = scene.add.graphics().setDepth(Depth.Water);
    this.foam = scene.add.graphics().setDepth(Depth.SurfaceEffects);
  }

  update(water: Water, view: Phaser.Geom.Rectangle): void {
    const left = Math.floor((view.x - SAMPLE_STEP) / SAMPLE_STEP) * SAMPLE_STEP;
    const right = view.right + SAMPLE_STEP * 2;
    const bottom = view.bottom + 20;
    this.body.clear();
    this.foam.clear();

    const points = this.points;
    points.length = 0;
    let highest = Infinity;
    let lowest = -Infinity;
    for (let x = left; x <= right; x += SAMPLE_STEP) {
      const y = water.surfaceY(x);
      highest = Math.min(highest, y);
      lowest = Math.max(lowest, y);
      points.push({ x, y });
    }
    if (highest > bottom) return; // Entirely above water.
    if (lowest < view.y - 10) {
      // Entirely underwater: just fill the view.
      this.body.fillStyle(WATER_COLOR, WATER_ALPHA).fillRect(view.x - 10, view.y - 10, view.width + 20, view.height + 20);
      return;
    }

    points.push({ x: right, y: bottom }, { x: left, y: bottom });
    this.body.fillStyle(WATER_COLOR, WATER_ALPHA).fillPoints(points as Points, true);
    points.length -= 2;

    // Bright surface line with a soft band just below it.
    this.foam.lineStyle(6, 0xbfe6ff, 0.18).strokePoints(points.map((p) => ({ x: p.x, y: p.y + 3 })) as Points);
    this.foam.lineStyle(2, 0xe8f7ff, 0.75).strokePoints(points as Points);
  }
}
