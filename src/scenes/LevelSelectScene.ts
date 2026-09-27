import Phaser from 'phaser';
import { previewKey } from '../assets';
import { OBJECTIVE } from '../config';
import { LEVELS, type LevelDef } from '../level/levels';
import { levelRecords, load } from '../storage';
import { coverImage, fitWidth, formatScore, formatTime, onTap, shadowText, textButton, textStyle, uiMetrics } from '../ui/layout';
import type { GameStartData } from './GameScene';

/** Card size in UI units; the preview keeps its own aspect ratio inside. */
const CARD_WIDTH = 300;
const CARD_PADDING = 10;
const CARD_GAP = 20;
/** Width over height of the preview box on each card. */
const PREVIEW_ASPECT = 3.07;
const STICK_ON = 0.6;
const STICK_OFF = 0.3;

interface Card {
  level: LevelDef;
  container: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Graphics;
  height: number;
}

/** Pick a level: a grid of cards with each map and your records there, and a line about the one selected. */
export class LevelSelectScene extends Phaser.Scene {
  private cards: Card[] = [];
  private blurb!: Phaser.GameObjects.Text;
  /** Cards per row in the current layout. */
  private cols = 1;
  private selected = 0;
  private started = false;
  private stickLatched = false;

  constructor() {
    super('Levels');
  }

  create(): void {
    this.cards = [];
    this.started = false;
    this.stickLatched = true;
    const last = LEVELS.findIndex((level) => level.id === load().lastLevel);
    this.selected = Math.max(0, last);

    const bg = this.add.image(0, 0, 'menubg');
    const shade = this.add.graphics();
    const ui = this.add.container(0, 0);
    const title = shadowText(this, 0, 0, 'CHOOSE YOUR HUNTING GROUND', 40).setOrigin(0.5);
    const subtitle = this.add
      .text(0, 0, `Eat all ${OBJECTIVE.population} humans before your rage runs out.`, textStyle(16))
      .setOrigin(0.5)
      .setAlpha(0.85);
    ui.add([title, subtitle]);

    LEVELS.forEach((level, index) => {
      const card = this.buildCard(level, index);
      this.cards.push(card);
      ui.add(card.container);
    });

    this.blurb = this.add.text(0, 0, '', textStyle(17, '#ffffff', { align: 'center' })).setOrigin(0.5, 0);
    const back = textButton(this, 0, 0, 'BACK', () => this.back(), 180, 46);
    const hint = this.add
      .text(0, 0, 'ARROWS choose  ·  ENTER play  ·  ESC back', textStyle(14))
      .setOrigin(0.5)
      .setAlpha(0.7);
    ui.add([this.blurb, back.container, hint]);

    const layout = () => {
      const { width, height } = this.scale;
      coverImage(bg, width, height);
      shade.clear().fillStyle(0x0b1c22, 0.6).fillRect(0, 0, width, height);
      const { zoom, vw, vh } = uiMetrics(width, height);
      ui.setScale(zoom);

      fitWidth(title, vw - 40);
      title.setPosition(vw / 2, 52);
      fitWidth(subtitle, vw - 40);
      subtitle.setPosition(vw / 2, title.y + title.displayHeight / 2 + 20);
      back.container.setPosition(vw / 2, vh - 58);
      hint.setPosition(vw / 2, vh - 20);

      // A grid of cards, four across in landscape and two in portrait, scaled to fit
      // above the selected level's blurb. A short last row is centred.
      this.blurb.setWordWrapWidth(Math.min(vw - 40, 820));
      const blurbSpace = 64;
      const top = subtitle.y + 24;
      const bottom = back.container.y - 36 - blurbSpace;
      const cardHeight = Math.max(...this.cards.map((c) => c.height));
      const cols = Math.min(this.cards.length, vw >= vh ? 4 : 2);
      const rows = Math.ceil(this.cards.length / cols);
      this.cols = cols;
      const needW = cols * CARD_WIDTH + (cols - 1) * CARD_GAP;
      const needH = rows * cardHeight + (rows - 1) * CARD_GAP;
      const scale = Math.min(1.25, (vw - 32) / needW, (bottom - top) / needH);
      const y0 = (top + bottom) / 2 - (needH * scale) / 2;
      this.cards.forEach((card, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const inRow = Math.min(cols, this.cards.length - row * cols);
        const rowW = inRow * CARD_WIDTH + (inRow - 1) * CARD_GAP;
        const x0 = vw / 2 - (rowW * scale) / 2;
        card.container
          .setScale(scale)
          .setPosition(x0 + (col * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2) * scale, y0 + (row * (cardHeight + CARD_GAP) + cardHeight / 2) * scale);
      });
      this.blurb.setPosition(vw / 2, y0 + needH * scale + 18);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', layout));
    this.select(this.selected);
    this.cameras.main.fadeIn(200, 11, 28, 34);

    const keyboard = this.input.keyboard;
    // Ignore auto-repeat so the key that opened this screen can't also pick a level.
    const onKey = (fn: () => void) => (event: KeyboardEvent) => {
      if (!event.repeat) fn();
    };
    for (const key of ['LEFT', 'A']) keyboard?.on(`keydown-${key}`, () => this.move(-1));
    for (const key of ['RIGHT', 'D']) keyboard?.on(`keydown-${key}`, () => this.move(1));
    for (const key of ['UP', 'W']) keyboard?.on(`keydown-${key}`, () => this.moveRow(-1));
    for (const key of ['DOWN', 'S']) keyboard?.on(`keydown-${key}`, () => this.moveRow(1));
    keyboard?.on('keydown-ENTER', onKey(() => this.play()));
    keyboard?.on('keydown-SPACE', onKey(() => this.play()));
    keyboard?.on('keydown-ESC', onKey(() => this.back()));
    keyboard?.on('keydown-BACKSPACE', onKey(() => this.back()));
    keyboard?.on('keydown-F', () => this.scale.toggleFullscreen());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 12) this.moveRow(-1);
      else if (button.index === 13) this.moveRow(1);
      else if (button.index === 14) this.move(-1);
      else if (button.index === 15) this.move(1);
      else if (button.index === 0 || button.index === 9) this.play();
      else if (button.index === 1) this.back();
    });
  }

  override update(): void {
    // Left stick flicks move the selection too.
    const pad = this.input.gamepad?.total ? this.input.gamepad.getPad(0) : undefined;
    if (!pad) return;
    const x = pad.leftStick.x;
    const y = pad.leftStick.y;
    const across = Math.abs(x) > Math.abs(y);
    const push = across ? x : y;
    if (Math.abs(push) < STICK_OFF) this.stickLatched = false;
    else if (!this.stickLatched && Math.abs(push) > STICK_ON) {
      this.stickLatched = true;
      if (across) this.move(Math.sign(push));
      else this.moveRow(Math.sign(push));
    }
  }

  private buildCard(level: LevelDef, index: number): Card {
    const inner = CARD_WIDTH - CARD_PADDING * 2;
    // Every preview gets the same box, so the cards line up (the maps differ a little in shape).
    const previewHeight = Math.round(inner / PREVIEW_ASPECT);
    const preview = this.add.image(0, 0, previewKey(level.id)).setOrigin(0.5, 0).setDisplaySize(inner, previewHeight);

    const name = shadowText(this, 0, 0, level.name, 26).setOrigin(0.5, 0);
    fitWidth(name, inner);
    const records = levelRecords(level.id);
    const summary =
      records.bestScore > 0
        ? `BEST ${formatScore(records.bestScore)}  ·  ${records.bestHumans}/${OBJECTIVE.population}` +
          (records.fastestWin > 0 ? `  ·  ${formatTime(records.fastestWin)}` : '')
        : 'NOT PLAYED YET';
    const recordText = this.add.text(0, 0, summary, textStyle(15, records.wins > 0 ? '#ffd34d' : '#ffffff')).setOrigin(0.5, 0);
    fitWidth(recordText, inner);

    // Stack the contents from the top of the card.
    let y = CARD_PADDING;
    preview.setY(y);
    y += previewHeight + 8;
    name.setY(y);
    y += name.displayHeight + 2;
    recordText.setY(y);
    y += recordText.displayHeight + CARD_PADDING;
    const height = y;
    for (const item of [preview, name, recordText]) item.y -= height / 2;

    const frame = this.add.graphics();
    const container = this.add.container(0, 0, [frame, preview, name, recordText]);
    container.setSize(CARD_WIDTH, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => this.select(index));
    onTap(container, () => {
      this.select(index);
      this.play();
    });
    return { level, container, frame, height };
  }

  private select(index: number): void {
    this.selected = (index + this.cards.length) % this.cards.length;
    this.blurb.setText(this.cards[this.selected].level.blurb);
    this.cards.forEach((card, i) => {
      const active = i === this.selected;
      const w = CARD_WIDTH;
      const h = card.height;
      card.frame.clear();
      card.frame.fillStyle(active ? 0x5a1c1c : 0x0b1c22, active ? 0.92 : 0.78);
      card.frame.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      card.frame.lineStyle(active ? 4 : 2, active ? 0xffd34d : 0xffffff, active ? 1 : 0.45);
      card.frame.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    });
  }

  private move(step: number): void {
    if (!this.started) this.select(this.selected + step);
  }

  /** Up or down a row, keeping to the column (or the nearest card in a short last row). */
  private moveRow(step: number): void {
    if (this.started) return;
    const n = this.cards.length;
    const rows = Math.ceil(n / this.cols);
    const row = (Math.floor(this.selected / this.cols) + step + rows) % rows;
    this.select(Math.min(n - 1, row * this.cols + (this.selected % this.cols)));
  }

  private play(): void {
    if (this.started) return;
    this.started = true;
    const data: GameStartData = { level: this.cards[this.selected].level.id };
    this.cameras.main.fadeOut(250, 11, 28, 34);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game', data));
  }

  private back(): void {
    if (this.started) return;
    this.started = true;
    this.scene.start('Menu');
  }
}
