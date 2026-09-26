import Phaser from 'phaser';
import { FONT_FAMILY, IMAGES, LEVEL, SHEETS, SOUNDS, tileKey } from '../assets';
import { ENEMIES } from '../config';
import { coverImage } from '../ui/layout';

const SPRITES = 'assets/sprites/';

/**
 * Loads everything, showing the original loading screen (menu art, "Loading..."
 * and a white progress bar), then builds animations and generated textures.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image('menubg', `${SPRITES}menubg.png`);
  }

  create(): void {
    const bg = this.add.image(0, 0, 'menubg');
    const bar = this.add.graphics();
    const label = this.add
      .text(0, 0, 'Loading...', { fontFamily: FONT_FAMILY, fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5);
    let progress = 0;
    const layout = () => {
      const { width, height } = this.scale;
      coverImage(bg, width, height);
      label.setPosition(width / 2, height / 2 + 20);
      const barWidth = Math.min(600, width * 0.7);
      bar.clear();
      bar.fillStyle(0xffffff, 0.25).fillRect((width - barWidth) / 2, height / 2 + 55, barWidth, 22);
      bar.fillStyle(0xffffff, 1).fillRect((width - barWidth) / 2, height / 2 + 55, barWidth * progress, 22);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once('shutdown', () => this.scale.off('resize', layout));

    this.load.on('progress', (value: number) => {
      progress = value;
      layout();
    });

    for (const key of IMAGES) if (key !== 'menubg') this.load.image(key, `${SPRITES}${key}.png`);
    for (const sheet of SHEETS) {
      this.load.spritesheet(sheet.key, `${SPRITES}${sheet.key}.png`, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
    for (const [tx, ty] of LEVEL.tiles) this.load.image(tileKey(tx, ty), `assets/level/tile_${tx}_${ty}.png`);
    this.load.image('sky', 'assets/level/sky.png');
    for (const [key, file] of Object.entries(SOUNDS)) {
      this.load.audio(key, [`assets/audio/${file}.ogg`, `assets/audio/${file}.mp3`]);
    }

    const fontReady = loadFont();
    const assetsReady = new Promise<void>((resolve) => this.load.once('complete', () => resolve()));
    this.load.start();

    Promise.all([fontReady, assetsReady]).then(() => {
      this.createAnimations();
      this.createTextures();
      this.scene.start('Menu');
    });
  }

  private createAnimations(): void {
    const anims = this.anims;
    const frames = (key: string, list: number[]) => list.map((frame) => ({ key, frame }));
    anims.create({ key: 'player-chomp', frames: frames('playeranim', [1, 0, 1, 0]), frameRate: 12, repeat: 0 });
    anims.create({ key: 'blood', frames: frames('bloodanim2', [0, 1, 2, 3, 4, 5]), frameRate: 20, hideOnComplete: true });
    anims.create({ key: 'explosion', frames: frames('exploanim', [0, 1, 2, 3, 4, 5]), frameRate: 20, hideOnComplete: true });
    for (const def of Object.values(ENEMIES)) {
      if (!def.animations) continue;
      for (const texture of def.textures) {
        for (const [name, anim] of Object.entries(def.animations)) {
          anims.create({
            key: `${texture}:${name}`,
            frames: frames(texture, anim.frames),
            frameRate: anim.fps,
            repeat: anim.loop ? -1 : 0,
          });
        }
      }
    }
  }

  /** Small procedural textures for particles, projectiles and extra touch buttons. */
  private createTextures(): void {
    const canvasTexture = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return;
      const tex = this.textures.createCanvas(key, w, h);
      if (!tex) return;
      draw(tex.getContext());
      tex.refresh();
    };

    canvasTexture('px', 4, 4, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 4, 4);
    });
    canvasTexture('dot', 16, 16, (ctx) => {
      const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 16);
    });
    canvasTexture('bullet', 10, 3, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 10, 0);
      g.addColorStop(0, 'rgba(255,220,120,0)');
      g.addColorStop(1, 'rgba(255,250,210,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 10, 3);
    });
    canvasTexture('torpedo', 22, 8, (ctx) => {
      ctx.fillStyle = '#3b3f44';
      ctx.beginPath();
      ctx.ellipse(12, 4, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9352f';
      ctx.fillRect(19, 2, 3, 4);
      ctx.fillStyle = '#23262a';
      ctx.fillRect(0, 0, 4, 8);
    });
    canvasTexture('eggbutton', 110, 98, (ctx) => drawTouchButton(ctx, 110, 98, 'EGGS', drawEggIcon));
    canvasTexture('pausebutton', 56, 56, (ctx) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 4;
      roundRect(ctx, 3, 3, 50, 50, 12);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(19, 16, 6, 24);
      ctx.fillRect(31, 16, 6, 24);
    });
  }
}

/** Load the game font ("Rocket Propelled", as in the original) before any text is drawn. */
async function loadFont(): Promise<void> {
  try {
    const face = new FontFace('Rocket Propelled', 'url(assets/fonts/rockprp.ttf)');
    document.fonts.add(await face.load());
  } catch {
    // The host may refuse font files; use an @font-face the page declares, if any,
    // and otherwise the next font in FONT_FAMILY.
    await document.fonts.load(`32px ${FONT_FAMILY}`).catch(() => undefined);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Matches the look of the original SPIN / LUNGE touch buttons. */
function drawTouchButton(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  label: string,
  icon: (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void,
): void {
  const color = 'rgba(255,255,255,0.55)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  roundRect(ctx, 4, 4, w - 8, h - 8, 18);
  ctx.stroke();
  ctx.fillStyle = color;
  icon(ctx, w / 2, h * 0.38);
  ctx.font = `22px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h * 0.76);
}

function drawEggIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  for (const [dx, dy, s] of [
    [-16, 4, 0.8],
    [0, -2, 1],
    [16, 4, 0.8],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy + dy, 8 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
