import Phaser from 'phaser';
import { OBJECTIVE } from '../config';
import { fitWidth, formatScore, formatTime, shadowText, textButton, textStyle, uiMetrics, type TextButton } from '../ui/layout';
import type { GameOverInfo, GameScene } from './GameScene';

/** How long the results ignore input, so a button mashed during play doesn't skip them. */
const INPUT_DELAY_MS = 700;
/** Vertical extent of the panel content above its origin. */
const PANEL_TOP = -230;

/** End-of-run summary shown over the still-running world. */
export class ResultsScene extends Phaser.Scene {
  private info!: GameOverInfo;
  private buttons: TextButton[] = [];
  private actions: Array<() => void> = [];
  private selected = 0;
  private ready = false;

  constructor() {
    super('Results');
  }

  init(info: GameOverInfo): void {
    this.info = info;
    this.buttons = [];
    this.actions = [];
    this.selected = 0;
    this.ready = false;
  }

  create(): void {
    const game = this.scene.get('Game') as GameScene;
    const info = this.info;
    // Scene time, not this.time.now: the clock is only refreshed once the scene updates.
    this.time.delayedCall(INPUT_DELAY_MS, () => {
      this.ready = true;
    });
    const guard = (fn: () => void) => () => {
      if (this.ready) fn();
    };
    this.actions = [guard(() => game.restart()), guard(() => game.quitToMenu())];

    const dim = this.add.rectangle(0, 0, 10, 10, 0x0b1c22, 0.72).setOrigin(0).setAlpha(0);
    const panel = this.add.container(0, 0).setAlpha(0);

    const title = shadowText(
      this,
      0,
      -190,
      info.won ? 'THE COAST IS CLEAR!' : 'YOUR RAGE HAS SUBSIDED',
      46,
      info.won ? '#ffd34d' : '#ffffff',
    ).setOrigin(0.5);
    const subtitle = this.add
      .text(
        0,
        -140,
        info.won ? 'Every last human has been devoured.' : 'The squid sinks back into the deep... for now.',
        textStyle(18),
      )
      .setOrigin(0.5)
      .setAlpha(0.85);
    panel.add([title, subtitle]);

    const rows: Array<[string, string]> = [
      ['HUMANS EATEN', `${info.humans} / ${OBJECTIVE.population}`],
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
      const badge = shadowText(this, 0, scoreY + 38, info.newBest ? 'NEW HIGH SCORE!' : 'FASTEST VICTORY!', 20, '#ffd34d');
      badge.setOrigin(0.5);
      panel.add(badge);
      this.tweens.add({ targets: badge, scale: 1.12, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
    }

    const buttonY = scoreY + 100;
    const again = textButton(this, 0, 0, 'PLAY AGAIN', this.actions[0], 260);
    const menu = textButton(this, 0, 0, 'MENU', this.actions[1], 260);
    this.buttons = [again, menu];
    panel.add([again.container, menu.container]);

    const layout = () => {
      const { width, height } = this.scale;
      const { zoom, vw, vh } = uiMetrics(width, height);
      this.cameras.main.setSize(width, height).setOrigin(0, 0).setZoom(zoom).setScroll(0, 0);
      dim.setSize(vw, vh);
      fitWidth(title, 520);
      fitWidth(subtitle, 480);
      // Buttons side by side when there is room, stacked on narrow screens.
      const stacked = vw < 600;
      again.container.setPosition(stacked ? 0 : -145, buttonY);
      menu.container.setPosition(stacked ? 0 : 145, stacked ? buttonY + 64 : buttonY);
      const bottom = buttonY + (stacked ? 90 : 30);
      const contentWidth = stacked ? 520 : 560;
      // Shrink the whole panel if it doesn't fit (e.g. a short landscape phone).
      const scale = Math.min(1, (vw - 20) / contentWidth, (vh - 20) / (bottom - PANEL_TOP));
      panel.setScale(scale).setPosition(vw / 2, vh / 2 - ((bottom + PANEL_TOP) / 2) * scale);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', layout));

    this.tweens.add({ targets: dim, alpha: 1, duration: 400 });
    this.tweens.add({ targets: panel, alpha: 1, duration: 450, ease: 'Cubic.Out' });

    const keyboard = this.input.keyboard;
    // Ignore auto-repeat so a held lunge key can't skip the results.
    const onKey = (fn: () => void) => (event: KeyboardEvent) => {
      if (!event.repeat) fn();
    };
    keyboard?.on('keydown-LEFT', () => this.select(0));
    keyboard?.on('keydown-A', () => this.select(0));
    keyboard?.on('keydown-RIGHT', () => this.select(1));
    keyboard?.on('keydown-D', () => this.select(1));
    keyboard?.on('keydown-ENTER', onKey(() => this.actions[this.selected]()));
    keyboard?.on('keydown-SPACE', onKey(() => this.actions[this.selected]()));
    keyboard?.on('keydown-ESC', onKey(() => this.actions[1]()));
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
