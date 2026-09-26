import Phaser from 'phaser';
import { previewKey } from '../assets';
import { OBJECTIVE } from '../config';
import { LEVELS, type LevelDef } from '../level/levels';
import { levelRecords, load } from '../storage';
import { coverImage, fitWidth, formatScore, formatTime, onTap, shadowText, textButton, textStyle, uiMetrics } from '../ui/layout';
import type { GameStartData } from './GameScene';

/** Card size in UI units; the preview keeps its own aspect ratio inside. */
const CARD_WIDTH = 420;
const CARD_PADDING = 14;
const CARD_GAP = 28;
const STICK_ON = 0.6;
const STICK_OFF = 0.3;

interface Card {
  level: LevelDef;
  container: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Graphics;
  height: number;
}

/** Pick a level: a card per level with its map, a line about it and your records there. */
export class LevelSelectScene extends Phaser.Scene {
  private cards: Card[] = [];
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

    const back = textButton(this, 0, 0, 'BACK', () => this.back(), 180, 46);
    const hint = this.add
      .text(0, 0, 'ARROWS choose  ·  ENTER play  ·  ESC back', textStyle(14))
      .setOrigin(0.5)
      .setAlpha(0.7);
    ui.add([back.container, hint]);

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

      // Cards side by side when they fit, otherwise stacked; scaled down to fit the space between.
      const top = subtitle.y + 24;
      const bottom = back.container.y - 40;
      const cardHeight = Math.max(...this.cards.map((c) => c.height));
      const sideBySide = vw >= vh;
      const rows = sideBySide ? 1 : this.cards.length;
      const cols = sideBySide ? this.cards.length : 1;
      const needW = cols * CARD_WIDTH + (cols - 1) * CARD_GAP;
      const needH = rows * cardHeight + (rows - 1) * CARD_GAP;
      const scale = Math.min(1.25, (vw - 32) / needW, (bottom - top) / needH);
      const x0 = vw / 2 - (needW * scale) / 2;
      const y0 = (top + bottom) / 2 - (needH * scale) / 2;
      this.cards.forEach((card, i) => {
        const col = sideBySide ? i : 0;
        const row = sideBySide ? 0 : i;
        card.container
          .setScale(scale)
          .setPosition(x0 + (col * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2) * scale, y0 + (row * (cardHeight + CARD_GAP) + cardHeight / 2) * scale);
      });
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
    for (const key of ['LEFT', 'UP', 'A', 'W']) keyboard?.on(`keydown-${key}`, () => this.move(-1));
    for (const key of ['RIGHT', 'DOWN', 'D', 'S']) keyboard?.on(`keydown-${key}`, () => this.move(1));
    keyboard?.on('keydown-ENTER', onKey(() => this.play()));
    keyboard?.on('keydown-SPACE', onKey(() => this.play()));
    keyboard?.on('keydown-ESC', onKey(() => this.back()));
    keyboard?.on('keydown-BACKSPACE', onKey(() => this.back()));
    keyboard?.on('keydown-F', () => this.scale.toggleFullscreen());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 12 || button.index === 14) this.move(-1);
      else if (button.index === 13 || button.index === 15) this.move(1);
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
    const push = Math.abs(x) > Math.abs(y) ? x : y;
    if (Math.abs(push) < STICK_OFF) this.stickLatched = false;
    else if (!this.stickLatched && Math.abs(push) > STICK_ON) {
      this.stickLatched = true;
      this.move(Math.sign(push));
    }
  }

  private buildCard(level: LevelDef, index: number): Card {
    const inner = CARD_WIDTH - CARD_PADDING * 2;
    const preview = this.add.image(0, 0, previewKey(level.id)).setOrigin(0.5, 0);
    preview.setScale(inner / preview.width);
    const previewHeight = preview.displayHeight;

    const name = shadowText(this, 0, 0, level.name, 30).setOrigin(0.5, 0);
    const blurb = this.add
      .text(0, 0, level.blurb, textStyle(15, '#ffffff', { align: 'center', wordWrap: { width: inner } }))
      .setOrigin(0.5, 0)
      .setAlpha(0.9);
    const records = levelRecords(level.id);
    const summary =
      records.bestScore > 0
        ? `BEST ${formatScore(records.bestScore)}  ·  HUMANS ${records.bestHumans}/${OBJECTIVE.population}` +
          (records.fastestWin > 0 ? `  ·  FASTEST ${formatTime(records.fastestWin)}` : '')
        : 'NOT PLAYED YET';
    const recordText = this.add.text(0, 0, summary, textStyle(14, records.wins > 0 ? '#ffd34d' : '#ffffff')).setOrigin(0.5, 0);
    fitWidth(recordText, inner);

    // Stack the contents from the top of the card.
    let y = CARD_PADDING;
    preview.setY(y);
    y += previewHeight + 12;
    name.setY(y);
    y += name.height + 4;
    blurb.setY(y);
    y += blurb.height + 10;
    recordText.setY(y);
    y += recordText.displayHeight + CARD_PADDING;
    const height = y;
    for (const item of [preview, name, blurb, recordText]) item.y -= height / 2;

    const frame = this.add.graphics();
    const container = this.add.container(0, 0, [frame, preview, name, blurb, recordText]);
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
    this.cards.forEach((card, i) => {
      const active = i === this.selected;
      const w = CARD_WIDTH;
      const h = card.height;
      card.frame.clear();
      card.frame.fillStyle(active ? 0x5a1c1c : 0x0b1c22, active ? 0.92 : 0.78);
      card.frame.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      card.frame.lineStyle(active ? 4 : 2, active ? 0xffd34d : 0xffffff, active ? 1 : 0.45);
      card.frame.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    });
  }

  private move(step: number): void {
    if (!this.started) this.select(this.selected + step);
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
