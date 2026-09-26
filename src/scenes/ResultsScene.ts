import Phaser from 'phaser';
import { formatScore, formatTime, shadowText, textButton, textStyle, uiMetrics, type TextButton } from '../ui/layout';
import type { GameOverInfo, GameScene } from './GameScene';

/** End-of-run summary shown over the still-running world. */
export class ResultsScene extends Phaser.Scene {
  private info!: GameOverInfo;
  private buttons: TextButton[] = [];
  private actions: Array<() => void> = [];
  private selected = 0;

  constructor() {
    super('Results');
  }

  init(info: GameOverInfo): void {
    this.info = info;
    this.buttons = [];
    this.actions = [];
    this.selected = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const { zoom, vw, vh } = uiMetrics(width, height);
    this.cameras.main.setOrigin(0, 0).setZoom(zoom).setScroll(0, 0);
    const game = this.scene.get('Game') as GameScene;
    const info = this.info;

    const dim = this.add.rectangle(0, 0, vw, vh, 0x0b1c22, 0.72).setOrigin(0).setAlpha(0);
    const panel = this.add.container(vw / 2, vh / 2).setAlpha(0);

    const title = info.won ? 'THE COAST IS CLEAR!' : 'YOUR RAGE HAS SUBSIDED';
    const subtitle = info.won
      ? 'Every last human has been devoured.'
      : 'The squid sinks back into the deep... for now.';
    panel.add(shadowText(this, 0, -190, title, 46, info.won ? '#ffd34d' : '#ffffff').setOrigin(0.5));
    panel.add(this.add.text(0, -140, subtitle, textStyle(18)).setOrigin(0.5).setAlpha(0.85));

    const rows: Array<[string, string]> = [
      ['HUMANS EATEN', `${info.humans}`],
      ['CREATURES DEVOURED', `${info.kills}`],
      ['BEST COMBO', `${info.bestCombo}`],
      ['TIME', formatTime(info.time)],
    ];
    if (info.won) rows.push(['VICTORY BONUS', `+${formatScore(info.victoryBonus)}`]);
    rows.forEach(([label, value], i) => {
      const y = -95 + i * 32;
      panel.add(this.add.text(-190, y, label, textStyle(20)).setOrigin(0, 0.5).setAlpha(0.85));
      panel.add(this.add.text(190, y, value, textStyle(20)).setOrigin(1, 0.5));
    });

    const scoreY = -95 + rows.length * 32 + 30;
    panel.add(shadowText(this, 0, scoreY, `SCORE  ${formatScore(info.score)}`, 36).setOrigin(0.5));
    if (info.newBest || info.fastest) {
      const badge = shadowText(this, 0, scoreY + 38, info.newBest ? 'NEW HIGH SCORE!' : 'FASTEST VICTORY!', 20, '#ffd34d').setOrigin(0.5);
      panel.add(badge);
      this.tweens.add({ targets: badge, scale: 1.12, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
    }

    const buttonY = scoreY + 100;
    const again = textButton(this, -145, buttonY, 'PLAY AGAIN', () => game.restart(), 260);
    const menu = textButton(this, 145, buttonY, 'MENU', () => game.quitToMenu(), 260);
    this.buttons = [again, menu];
    // Ignore keys for a moment so a button mashed during play doesn't skip the results.
    const readyAt = this.time.now + 700;
    const guard = (fn: () => void) => () => {
      if (this.time.now >= readyAt) fn();
    };
    this.actions = [guard(() => game.restart()), guard(() => game.quitToMenu())];
    panel.add([again.container, menu.container]);

    this.tweens.add({ targets: dim, alpha: 1, duration: 400 });
    this.tweens.add({ targets: panel, alpha: 1, y: { from: vh / 2 + 30, to: vh / 2 }, duration: 450, ease: 'Cubic.Out' });

    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-LEFT', () => this.select(0));
    keyboard?.on('keydown-A', () => this.select(0));
    keyboard?.on('keydown-RIGHT', () => this.select(1));
    keyboard?.on('keydown-D', () => this.select(1));
    keyboard?.on('keydown-ENTER', () => this.actions[this.selected]());
    keyboard?.on('keydown-SPACE', () => this.actions[this.selected]());
    keyboard?.on('keydown-ESC', () => this.actions[1]());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 14) this.select(0);
      else if (button.index === 15) this.select(1);
      else if (button.index === 0 || button.index === 9) this.actions[this.selected]();
      else if (button.index === 1) this.actions[1]();
    });
    if (game.controls.lastDevice !== 'touch') this.select(0);
  }

  private select(index: number): void {
    this.selected = index;
    this.buttons.forEach((b, i) => b.setSelected(i === index));
  }
}
