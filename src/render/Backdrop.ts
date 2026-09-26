import Phaser from 'phaser';
import { LEVEL, tileKey } from '../assets';
import { WORLD } from '../config';
import { Depth } from './depth';

interface Cloud {
  image: Phaser.GameObjects.Image;
  speed: number;
  big: boolean;
}

const SMALL_CLOUDS = ['cloud1', 'cloud2', 'cloud3', 'cloud4'];
const BIG_CLOUDS = ['bigcloud1', 'bigcloud2'];

/** Sky gradient, parallax mountains, drifting clouds and the terrain art. */
export class Backdrop {
  private readonly sky: Phaser.GameObjects.Image;
  private readonly tiles: Phaser.GameObjects.Image[] = [];
  private readonly clouds: Cloud[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.sky = scene.add.image(0, 0, 'sky').setOrigin(0, 0).setDepth(Depth.Sky);
    this.sky.displayHeight = WORLD.height;

    // Two layers of underwater ridges for depth (the original used only the nearer one).
    for (let i = 0; i < 4; i++) {
      scene.add
        .image(i * 3276, WORLD.height - 496 - 90, 'scrollingbg')
        .setOrigin(0, 0)
        .setScrollFactor(0.45, 1)
        .setAlpha(0.35)
        .setDepth(Depth.FarMountains);
    }
    for (let i = 0; i < 5; i++) {
      scene.add
        .image(i * 2000, WORLD.height - 496, 'scrollingbg2')
        .setOrigin(0, 0)
        .setScrollFactor(0.65, 1)
        .setDepth(Depth.Mountains);
    }

    for (const [tx, ty] of LEVEL.tiles) {
      this.tiles.push(
        scene.add
          .image(tx * LEVEL.tileSize, ty * LEVEL.tileSize, tileKey(tx, ty))
          .setOrigin(0, 0)
          .setDepth(Depth.Terrain),
      );
    }
  }

  /** Scatter the initial clouds around a point. */
  seedClouds(x: number): void {
    for (let i = 0; i < 11; i++) this.addCloud(false, x + Phaser.Math.Between(-900, 900));
    for (let i = 0; i < 7; i++) this.addCloud(true, x + Phaser.Math.Between(-1000, 1000));
  }

  private addCloud(big: boolean, x: number): void {
    const key = Phaser.Utils.Array.GetRandom(big ? BIG_CLOUDS : SMALL_CLOUDS);
    const y = big ? Phaser.Math.Between(0, 420) : Phaser.Math.Between(400, 1250);
    const image = this.scene.add.image(x, y, key).setDepth(Depth.Clouds);
    this.clouds.push({ image, big, speed: big ? 80 : 110 });
  }

  update(dt: number, view: Phaser.Geom.Rectangle, focusX: number): void {
    // Generous margin so camera shake never reveals the edge.
    this.sky.setPosition(view.x - 60, 0);
    this.sky.displayWidth = view.width + 120;

    for (const tile of this.tiles) {
      tile.setVisible(
        tile.x < view.right && tile.x + tile.width > view.x && tile.y < view.bottom && tile.y + tile.height > view.y,
      );
    }

    // Clouds drift left and are recycled on the far side (original: -110 / -80 px/s).
    for (const cloud of this.clouds) {
      cloud.image.x -= cloud.speed * dt;
      if (cloud.image.x < -400 || Math.abs(cloud.image.x - focusX) > 2000) {
        const side = Math.random() < 0.75 ? 1 : -1;
        cloud.image.x = focusX + side * Phaser.Math.Between(cloud.big ? 700 : 600, 1000);
        cloud.image.y = cloud.big ? Phaser.Math.Between(0, 420) : Phaser.Math.Between(400, 1250);
      }
    }
  }
}
