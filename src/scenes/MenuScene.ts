import Phaser from 'phaser';
import { audio } from '../audio';
import { OBJECTIVE } from '../config';
import { LEVELS } from '../level/levels';
import { levelRecords } from '../storage';
import { coverImage, fitWidth, formatScore, onTap, shadowText, textStyle, uiMetrics } from '../ui/layout';

/** Title screen: the original menu art and "RELEASE ME!" button, plus controls and records. */
export class MenuScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.started = false;
    const sfx = audio(this.game);
    // Music can only start after a user gesture; Phaser resumes it once unlocked.
    sfx.startMusic();

    const bg = this.add.image(0, 0, 'menubg');
    const shade = this.add.graphics();
    const ui = this.add.container(0, 0);

    const title = shadowText(this, 0, 0, 'SUPER MEGA SQUID', 76, '#ffffff').setOrigin(0.5);
    const subtitle = shadowText(this, 0, 0, 'TERROR OF THE DEEP', 28, '#c93d3d').setOrigin(0.5);
    const play = this.add.image(0, 0, 'playbutton').setInteractive({ useHandCursor: true });
    play.on('pointerover', () => play.setTexture('playbuttondown'));
    play.on('pointerout', () => play.setTexture('playbutton'));
    onTap(play, () => this.startGame());
    // The holder is sized to fit the layout; the button inside it pulses.
    const playHolder = this.add.container(0, 0, [play]);

    const bests = LEVELS.map((level) => ({ level, best: levelRecords(level.id).bestScore })).filter((b) => b.best > 0);
    const records =
      bests.length > 0
        ? `BEST SCORES   ${bests.map((b) => `${b.level.name} ${formatScore(b.best)}`).join('   ·   ')}`
        : `Eat all ${OBJECTIVE.population} humans in town before your rage runs out.`;
    const recordText = shadowText(this, 0, 0, records, 18).setOrigin(0.5, 1).setAlign('center');

    const controls = this.add
      .text(
        0,
        0,
        [
          'KEYBOARD   WASD / Arrows swim  ·  SPACE lunge  ·  Q spin  ·  E eggs  ·  ESC pause  ·  F fullscreen',
          'GAMEPAD   Left stick swim  ·  A lunge  ·  B / X spin  ·  Y eggs  ·  START pause',
          'TOUCH   Drag on the left to swim  ·  Tap the buttons on the right',
        ].join('\n'),
        textStyle(14, '#ffffff', { align: 'center', lineSpacing: 8 }),
      )
      .setOrigin(0.5, 1)
      .setAlpha(0.9);
    const tips = this.add
      .text(
        0,
        0,
        'Leap from the sea and lunge to snatch birds, balloons and aircraft. Spin to parry bullets and torpedoes.\nBeware of electric eels. Eating humans puts the military on alert.',
        textStyle(13, '#ffffff', { align: 'center', lineSpacing: 6 }),
      )
      .setOrigin(0.5, 1)
      .setAlpha(0.75);

    const logo = this.add.image(0, 0, 'pauseninelogo').setScale(0.42).setOrigin(0, 1).setAlpha(0.85);
    const credits = this.add
      .text(0, 0, 'Original game by Rory Bourdon · One Game A Month, 2013', textStyle(12))
      .setOrigin(0, 1)
      .setAlpha(0.75);
    const musicToggle = this.add.text(0, 0, '', textStyle(16)).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    const soundToggle = this.add.text(0, 0, '', textStyle(16)).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    const fullscreenToggle = this.add
      .text(0, 0, 'FULLSCREEN', textStyle(16))
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .setVisible(this.scale.fullscreen.available);
    const refreshToggles = () => {
      musicToggle.setText(`MUSIC ${sfx.musicOn ? 'ON' : 'OFF'}`);
      soundToggle.setText(`SOUND ${sfx.sfxOn ? 'ON' : 'OFF'}`);
    };
    refreshToggles();
    onTap(musicToggle, () => {
      sfx.toggleMusic();
      refreshToggles();
    });
    onTap(soundToggle, () => {
      sfx.toggleSfx();
      refreshToggles();
    });
    // Fullscreen must be requested from a user gesture, which pointerup is.
    onTap(fullscreenToggle, () => this.scale.toggleFullscreen());

    ui.add([title, subtitle, playHolder, recordText, controls, tips, logo, credits, musicToggle, soundToggle, fullscreenToggle]);

    const layout = () => {
      const { width, height } = this.scale;
      coverImage(bg, width, height);
      shade.clear();
      shade.fillGradientStyle(0x0b1c22, 0x0b1c22, 0x0b1c22, 0x0b1c22, 0.55, 0.55, 0, 0).fillRect(0, 0, width, height * 0.45);
      shade.fillGradientStyle(0x0b1c22, 0x0b1c22, 0x0b1c22, 0x0b1c22, 0, 0, 0.7, 0.7).fillRect(0, height * 0.55, width, height * 0.45);
      const { zoom, vw, vh } = uiMetrics(width, height);
      ui.setScale(zoom);
      const textWidth = Math.min(920, vw - 40);
      const narrow = vw < 800;

      // Top: settings in the corner, then the title (pushed down on narrow screens to clear them).
      musicToggle.setPosition(vw - 16, 12);
      soundToggle.setPosition(vw - 16, 36);
      fullscreenToggle.setPosition(vw - 16, 60);
      fitWidth(title, vw - 40);
      fitWidth(subtitle, vw - 40);
      title.setPosition(vw / 2, narrow ? 130 : Math.max(70, vh * 0.15));
      subtitle.setPosition(vw / 2, title.y + title.displayHeight / 2 + 20);
      const top = subtitle.y + subtitle.displayHeight / 2 + 16;

      // Bottom up: credits, tips, controls and records.
      logo.setPosition(14, vh - 10);
      credits.setPosition(68, vh - 12);
      fitWidth(credits, vw - 82);
      tips.setWordWrapWidth(textWidth).setPosition(vw / 2, vh - 64);
      controls.setWordWrapWidth(textWidth).setPosition(vw / 2, tips.y - tips.height - 18);
      recordText.setWordWrapWidth(textWidth).setPosition(vw / 2, controls.y - controls.height - 22);
      const bottom = recordText.y - recordText.height - 16;

      // The play button fills the space between.
      playHolder.setPosition(vw / 2, (top + bottom) / 2);
      playHolder.setScale(Phaser.Math.Clamp((bottom - top) / (play.height * 1.1), 0.45, 1));
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', layout));

    this.tweens.add({ targets: play, scale: 1.05, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });

    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-F', () => this.scale.toggleFullscreen());
    this.input.keyboard?.on('keydown-M', () => {
      sfx.toggleMusic();
      refreshToggles();
    });
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0 || button.index === 9) this.startGame();
    });
  }

  private startGame(): void {
    if (this.started) return;
    this.started = true;
    this.cameras.main.fadeOut(250, 11, 28, 34);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Levels'));
  }
}
