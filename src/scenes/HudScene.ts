import Phaser from 'phaser';
import { audio } from '../audio';
import { OBJECTIVE, PLAYER, RAGE } from '../config';
import type { Action } from '../input';
import { formatScore, shadowText, textButton, textStyle, uiMetrics, type TextButton } from '../ui/layout';
import type { GameScene } from './GameScene';

const ALERT_MESSAGES = [
  '',
  'The coast guard has been alerted!',
  'Navy submarines deployed!',
  'Full military response!',
];

const JOYSTICK_RADIUS = 60;

interface Orb {
  image: Phaser.GameObjects.Image;
  t: number;
  duration: number;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
}

interface AbilitySlot {
  action: Action;
  label: Phaser.GameObjects.Text;
  key: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
}

interface TouchButton {
  action: Action;
  image: Phaser.GameObjects.Image;
}

/** Heads-up display, touch controls and the pause menu, drawn over the game scene. */
export class HudScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private vw = 960;
  private vh = 540;

  private rageBar!: Phaser.GameObjects.Graphics;
  private rageLabel!: Phaser.GameObjects.Text;
  private humansIcon!: Phaser.GameObjects.Image;
  private humansText!: Phaser.GameObjects.Text;
  private humansCaption!: Phaser.GameObjects.Text;
  private alertPips!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private comboBar!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private abilities: AbilitySlot[] = [];
  private orbs: Orb[] = [];
  private displayedRage: number = RAGE.max;
  private rageFlash = 0;
  private humansPulse = 0;
  private hintTimer = 9;
  private shownScore = 0;

  private touchLayer!: Phaser.GameObjects.Container;
  private stickBase!: Phaser.GameObjects.Image;
  private stickKnob!: Phaser.GameObjects.Image;
  private stickPointer: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private touchButtons: TouchButton[] = [];
  private pauseButton!: Phaser.GameObjects.Image;
  private rotateNotice!: Phaser.GameObjects.Container;

  private pauseLayer!: Phaser.GameObjects.Container;
  private pauseButtons: TextButton[] = [];
  private pauseActions: Array<() => void> = [];
  private pauseIndex = 0;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.gameScene = this.scene.get('Game') as GameScene;
    this.orbs = [];
    this.abilities = [];
    this.touchButtons = [];
    this.pauseButtons = [];
    this.displayedRage = RAGE.max;
    this.hintTimer = 9;
    this.shownScore = 0;
    this.stickPointer = null;

    this.createStatus();
    this.createTouchControls();
    this.createPauseMenu();

    const gameEvents = this.gameScene.events;
    const onOrbs = (x: number, y: number, count: number) => this.spawnOrbs(x, y, count);
    const onAlert = (level: number) => this.showBanner(ALERT_MESSAGES[level] ?? '', '#ffd34d');
    const onHuman = () => {
      this.humansPulse = 1;
    };
    const onHurt = () => {
      this.rageFlash = 1;
    };
    const onPause = (paused: boolean) => this.showPauseMenu(paused);
    const onGameOver = () => {
      this.setTouchControlsVisible(false);
      this.hintTimer = 0;
    };
    gameEvents.on('rage-orbs', onOrbs);
    gameEvents.on('alert', onAlert);
    gameEvents.on('human-eaten', onHuman);
    gameEvents.on('player-hurt', onHurt);
    gameEvents.on('pause-changed', onPause);
    gameEvents.on('game-over', onGameOver);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off('rage-orbs', onOrbs);
      gameEvents.off('alert', onAlert);
      gameEvents.off('human-eaten', onHuman);
      gameEvents.off('player-hurt', onHurt);
      gameEvents.off('pause-changed', onPause);
      gameEvents.off('game-over', onGameOver);
      this.scale.off('resize', this.layout, this);
    });

    // While the game scene is paused its keyboard is inactive, so the HUD handles resuming.
    const resume = () => {
      // Ignore the key press that paused the game in this very frame.
      if (this.gameScene.paused && this.game.loop.frame !== this.gameScene.pausedFrame) this.gameScene.setPaused(false);
    };
    this.input.keyboard?.on('keydown-ESC', resume);
    this.input.keyboard?.on('keydown-P', resume);
    this.input.keyboard?.on('keydown-UP', () => this.movePauseSelection(-1));
    this.input.keyboard?.on('keydown-W', () => this.movePauseSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.movePauseSelection(1));
    this.input.keyboard?.on('keydown-S', () => this.movePauseSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.activatePauseSelection());
    this.input.keyboard?.on('keydown-SPACE', () => this.activatePauseSelection());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (!this.gameScene.paused) return;
      if (button.index === 9 || button.index === 1) resume();
      else if (button.index === 12) this.movePauseSelection(-1);
      else if (button.index === 13) this.movePauseSelection(1);
      else if (button.index === 0) this.activatePauseSelection();
    });

    this.layout();
    this.scale.on('resize', this.layout, this);
  }

  // --- Construction ---------------------------------------------------------------

  private createStatus(): void {
    this.rageBar = this.add.graphics();
    this.rageLabel = shadowText(this, 0, 0, 'RAGE', 22);
    this.humansIcon = this.add.image(0, 0, 'humansalive').setOrigin(1, 0);
    this.humansText = shadowText(this, 0, 0, String(OBJECTIVE.population), 30).setOrigin(1, 0);
    this.humansCaption = this.add.text(0, 0, 'HUMANS LEFT', textStyle(12, '#ffffff')).setOrigin(1, 0).setAlpha(0.8);
    this.alertPips = this.add.graphics();
    this.scoreText = shadowText(this, 0, 0, '0', 30).setOrigin(0.5, 0);
    this.comboText = shadowText(this, 0, 0, '', 20, '#ffd34d').setOrigin(0.5, 0);
    this.comboBar = this.add.graphics();
    this.banner = shadowText(this, 0, 0, '', 26, '#ffd34d').setOrigin(0.5).setAlpha(0);
    this.hint = this.add
      .text(0, 0, '', textStyle(16, '#ffffff', { align: 'center', lineSpacing: 6 }))
      .setOrigin(0.5, 1)
      .setShadow(1, 2, 'rgba(0,0,0,0.6)', 2, false, true);

    const actions: Array<[Action, string]> = [
      ['lunge', 'LUNGE'],
      ['spin', 'SPIN'],
      ['eggs', 'EGGS'],
    ];
    for (const [action, name] of actions) {
      this.abilities.push({
        action,
        label: this.add.text(0, 0, name, textStyle(14)).setOrigin(0.5, 0),
        key: this.add.text(0, 0, '', textStyle(12, '#ffd34d')).setOrigin(0.5, 0),
        bar: this.add.graphics(),
      });
    }
  }

  private createTouchControls(): void {
    this.touchLayer = this.add.container(0, 0);
    this.stickBase = this.add.image(0, 0, 'joystickoutside').setAlpha(0.8).setScale(0.75);
    this.stickKnob = this.add.image(0, 0, 'joystickinside').setAlpha(0.9).setScale(0.75);
    this.touchLayer.add([this.stickBase, this.stickKnob]);

    const defs: Array<[Action, string]> = [
      ['lunge', 'lungebutton'],
      ['spin', 'spinbutton'],
      ['eggs', 'eggbutton'],
    ];
    for (const [action, key] of defs) {
      const image = this.add.image(0, 0, key).setScale(0.85).setInteractive();
      image.on('pointerdown', () => {
        this.gameScene.controls.press(action, 'touch');
        image.setScale(0.78);
      });
      image.on('pointerup', () => image.setScale(0.85));
      image.on('pointerout', () => image.setScale(0.85));
      this.touchButtons.push({ action, image });
      this.touchLayer.add(image);
    }

    this.pauseButton = this.add.image(0, 0, 'pausebutton').setInteractive().setAlpha(0.9);
    this.pauseButton.on('pointerup', () => this.gameScene.setPaused(true));
    this.touchLayer.add(this.pauseButton);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (pointer.wasTouch) this.gameScene.controls.lastDevice = 'touch';
      if (!pointer.wasTouch || over.length > 0 || this.gameScene.paused || this.gameScene.ended) return;
      const vx = pointer.x / this.cameras.main.zoom;
      const vy = pointer.y / this.cameras.main.zoom;
      if (this.stickPointer === null && vx < this.vw * 0.5) {
        // Floating joystick: it appears wherever the left thumb lands.
        this.stickPointer = pointer.id;
        this.stickOrigin = { x: vx, y: vy };
        this.stickBase.setPosition(vx, vy);
        this.stickKnob.setPosition(vx, vy);
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.stickPointer) return;
      const vx = pointer.x / this.cameras.main.zoom;
      const vy = pointer.y / this.cameras.main.zoom;
      let dx = vx - this.stickOrigin.x;
      let dy = vy - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > JOYSTICK_RADIUS) {
        dx = (dx / len) * JOYSTICK_RADIUS;
        dy = (dy / len) * JOYSTICK_RADIUS;
      }
      this.stickKnob.setPosition(this.stickOrigin.x + dx, this.stickOrigin.y + dy);
      this.gameScene.controls.touchMove = { x: dx / JOYSTICK_RADIUS, y: dy / JOYSTICK_RADIUS };
    });
    const release = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.stickPointer) return;
      this.stickPointer = null;
      this.gameScene.controls.touchMove = { x: 0, y: 0 };
      this.resetStick();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    const notice = this.add.rectangle(0, 0, 10, 10, 0x0b1c22, 0.92).setOrigin(0);
    const noticeText = shadowText(this, 0, 0, 'Rotate your device\nto landscape', 30).setAlign('center').setOrigin(0.5);
    this.rotateNotice = this.add.container(0, 0, [notice, noticeText]).setVisible(false);
  }

  private createPauseMenu(): void {
    const dim = this.add.rectangle(0, 0, 10, 10, 0x0b1c22, 0.75).setOrigin(0).setInteractive();
    const title = shadowText(this, 0, 0, 'PAUSED', 56).setOrigin(0.5);
    this.pauseLayer = this.add.container(0, 0, [dim, title]).setVisible(false);
    const sfx = audio(this.game);
    const entries: Array<[string, () => void]> = [
      ['RESUME', () => this.gameScene.setPaused(false)],
      ['RESTART', () => this.gameScene.restart()],
      [this.musicLabel(), () => this.pauseButtons[2].setLabel(this.musicLabel(sfx.toggleMusic()))],
      [this.soundLabel(), () => this.pauseButtons[3].setLabel(this.soundLabel(sfx.toggleSfx()))],
    ];
    if (this.scale.fullscreen.available) entries.push(['FULLSCREEN', () => this.scale.toggleFullscreen()]);
    entries.push(['QUIT TO MENU', () => this.gameScene.quitToMenu()]);
    for (const [label, action] of entries) {
      const button = textButton(this, 0, 0, label, action, 300, 50);
      this.pauseButtons.push(button);
      this.pauseActions.push(action);
      this.pauseLayer.add(button.container);
    }
  }

  private musicLabel(on = audio(this.game).musicOn): string {
    return `MUSIC: ${on ? 'ON' : 'OFF'}`;
  }

  private soundLabel(on = audio(this.game).sfxOn): string {
    return `SOUND: ${on ? 'ON' : 'OFF'}`;
  }

  // --- Layout -----------------------------------------------------------------------

  private layout(): void {
    const { width, height } = this.scale;
    const { zoom, vw, vh } = uiMetrics(width, height);
    this.vw = vw;
    this.vh = vh;
    const cam = this.cameras.main;
    cam.setSize(width, height);
    cam.setOrigin(0, 0);
    cam.setZoom(zoom);
    cam.setScroll(0, 0);

    this.rageLabel.setPosition(22, 17);
    this.humansIcon.setPosition(vw - 16, 12);
    this.humansText.setPosition(vw - 54, 10);
    this.humansCaption.setPosition(vw - 54, 44);
    this.scoreText.setPosition(vw / 2, 8);
    this.comboText.setPosition(vw / 2, 42);
    this.banner.setPosition(vw / 2, vh * 0.3);
    this.hint.setPosition(vw / 2, vh - 70);
    this.abilities.forEach((slot, i) => {
      const x = vw / 2 + (i - 1) * 110;
      slot.label.setPosition(x, vh - 44);
      slot.key.setPosition(x, vh - 60);
    });

    const [lunge, spin, eggs] = this.touchButtons;
    lunge.image.setPosition(vw - 70, vh - 62);
    spin.image.setPosition(vw - 70, vh - 160);
    eggs.image.setPosition(vw - 168, vh - 62);
    this.pauseButton.setPosition(vw - 40, 96);
    this.resetStick();

    const [notice, noticeText] = this.rotateNotice.list as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Text];
    notice.setSize(vw, vh);
    noticeText.setPosition(vw / 2, vh / 2);

    const [dim, title] = this.pauseLayer.list as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Text];
    dim.setSize(vw, vh);
    // Resize the click-blocking area too; it is captured when made interactive.
    dim.input?.hitArea.setTo(0, 0, vw, vh);
    const spacing = 58;
    const top = vh / 2 - ((this.pauseButtons.length - 1) * spacing) / 2 + 40;
    title.setPosition(vw / 2, top - 80);
    this.pauseButtons.forEach((b, i) => b.container.setPosition(vw / 2, top + i * spacing));
  }

  private resetStick(): void {
    const x = 110;
    const y = this.vh - 110;
    this.stickOrigin = { x, y };
    this.stickBase.setPosition(x, y);
    this.stickKnob.setPosition(x, y);
  }

  // --- Pause menu ----------------------------------------------------------------------

  private showPauseMenu(paused: boolean): void {
    this.pauseLayer.setVisible(paused);
    this.pauseIndex = 0;
    this.pauseButtons.forEach((b, i) => b.setSelected(paused && i === 0 && this.gameScene.controls.lastDevice !== 'touch'));
    if (paused) {
      this.stickPointer = null;
      this.resetStick();
    }
  }

  private movePauseSelection(delta: number): void {
    if (!this.gameScene.paused) return;
    this.pauseIndex = Phaser.Math.Wrap(this.pauseIndex + delta, 0, this.pauseButtons.length);
    this.pauseButtons.forEach((b, i) => b.setSelected(i === this.pauseIndex));
  }

  private activatePauseSelection(): void {
    if (!this.gameScene.paused) return;
    this.pauseActions[this.pauseIndex]();
  }

  // --- Effects -----------------------------------------------------------------------------

  private showBanner(message: string, color: string): void {
    if (!message) return;
    this.banner.setText(message).setColor(color).setAlpha(0).setScale(0.8);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 250, ease: 'Back.Out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 2600, duration: 500 });
  }

  /** Rage orbs fly from the kill to the rage bar. */
  private spawnOrbs(screenX: number, screenY: number, count: number): void {
    const zoom = this.cameras.main.zoom;
    const sx = screenX / zoom;
    const sy = screenY / zoom;
    for (let i = 0; i < Math.min(count, 8); i++) {
      const image = this.add.image(sx, sy, 'rageorb').setScale(1.6);
      this.orbs.push({
        image,
        t: -i * 0.04,
        duration: 0.55 + Math.random() * 0.2,
        sx: sx + Phaser.Math.Between(-10, 10),
        sy: sy + Phaser.Math.Between(-10, 10),
        cx: (sx + 120) / 2 + Phaser.Math.Between(-120, 120),
        cy: Math.min(sy, 60) - Phaser.Math.Between(40, 140),
      });
    }
  }

  // --- Per frame ----------------------------------------------------------------------------

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    const game = this.gameScene;
    if (!game.sim) return;
    const rules = game.sim.rules;
    const player = game.sim.player;

    // Rage bar (original: red fill, white outline, "RAGE" label).
    this.displayedRage += (rules.rage - this.displayedRage) * Math.min(1, dt * 10);
    this.rageFlash = Math.max(0, this.rageFlash - dt * 3);
    const low = rules.rage < RAGE.max * 0.25 && rules.state === 'playing';
    const pulse = low ? 0.5 + 0.5 * Math.sin(this.time.now / 90) : 0;
    const barW = 240;
    const fill = (this.displayedRage / RAGE.max) * (barW - 4);
    const g = this.rageBar;
    g.clear();
    g.fillStyle(0x0b1c22, 0.45).fillRoundedRect(12, 12, barW, 30, 5);
    g.fillStyle(this.rageFlash > 0.5 ? 0xffffff : 0xc93d3d, 0.9).fillRect(14, 14, Math.max(0, fill), 26);
    if (pulse > 0) g.fillStyle(0xffffff, pulse * 0.35).fillRect(14, 14, Math.max(0, fill), 26);
    g.lineStyle(3, 0xffffff, 0.75).strokeRoundedRect(12, 12, barW, 30, 5);

    // Humans left, with a pulse whenever one is eaten.
    this.humansPulse = Math.max(0, this.humansPulse - dt * 2.5);
    this.humansText.setText(String(rules.humansLeft)).setScale(1 + this.humansPulse * 0.35);
    this.humansText.setColor(this.humansPulse > 0 ? '#ffd34d' : '#ffffff');
    const pips = this.alertPips;
    pips.clear();
    for (let i = 0; i < 3; i++) {
      const on = rules.alertLevel > i;
      pips.fillStyle(on ? 0xc93d3d : 0xffffff, on ? 1 : 0.3).fillCircle(this.vw - 100 + i * 14, 70, 5);
    }

    // Score counts up smoothly.
    this.shownScore += (rules.score - this.shownScore) * Math.min(1, dt * 8);
    if (Math.abs(rules.score - this.shownScore) < 1) this.shownScore = rules.score;
    this.scoreText.setText(formatScore(this.shownScore));
    const cb = this.comboBar;
    cb.clear();
    if (rules.combo >= 2) {
      const multiplier = rules.multiplier > 1 ? `  x${rules.multiplier}` : '';
      this.comboText.setText(`COMBO ${rules.combo}${multiplier}`).setVisible(true);
      const w = 130 * (rules.comboTimeLeft / RAGE.comboWindow);
      cb.fillStyle(0xffd34d, 0.9).fillRect(this.vw / 2 - w / 2, 68, w, 4);
    } else {
      this.comboText.setVisible(false);
    }

    this.updateAbilities(player.lungeCooldown, player.spinCooldown, player.eggCooldown, player.wet, player.canAirLunge);
    this.updateHint(dt);
    this.updateOrbs(dt);

    const touch = game.controls.lastDevice === 'touch';
    this.setTouchControlsVisible(touch && !game.ended);
    const portrait = touch && this.scale.height > this.scale.width;
    this.rotateNotice.setVisible(portrait);
    this.children.bringToTop(this.rotateNotice);
    this.children.bringToTop(this.pauseLayer);
  }

  /** Hidden buttons must not catch clicks, so input is toggled along with visibility. */
  private setTouchControlsVisible(visible: boolean): void {
    if (this.touchLayer.visible === visible) return;
    this.touchLayer.setVisible(visible);
    for (const button of this.touchButtons) if (button.image.input) button.image.input.enabled = visible;
    if (this.pauseButton.input) this.pauseButton.input.enabled = visible;
  }

  private updateAbilities(lunge: number, spin: number, eggs: number, wet: boolean, airLunge: boolean): void {
    const device = this.gameScene.controls.lastDevice;
    const keys: Record<Action, string> =
      device === 'gamepad' ? { lunge: 'A', spin: 'B / X', eggs: 'Y' } : { lunge: 'SPACE', spin: 'Q', eggs: 'E' };
    const ready: Record<Action, number> = {
      lunge: wet ? 1 - lunge / PLAYER.lungeCooldown : airLunge ? 1 : 0,
      spin: 1 - spin / PLAYER.spinCooldown,
      eggs: 1 - eggs / PLAYER.eggCooldown,
    };
    const showKeys = device !== 'touch';
    for (const slot of this.abilities) {
      const r = Phaser.Math.Clamp(ready[slot.action], 0, 1);
      slot.label.setVisible(showKeys).setAlpha(r >= 1 ? 1 : 0.45);
      slot.key.setVisible(showKeys).setText(keys[slot.action]);
      const x = slot.label.x;
      slot.bar.clear();
      if (showKeys) {
        slot.bar.fillStyle(0xffffff, 0.2).fillRect(x - 40, this.vh - 24, 80, 5);
        slot.bar.fillStyle(r >= 1 ? 0xffd34d : 0xc93d3d, 0.95).fillRect(x - 40, this.vh - 24, 80 * r, 5);
      }
    }
    for (const button of this.touchButtons) {
      const r = Phaser.Math.Clamp(ready[button.action], 0, 1);
      button.image.setAlpha(r >= 1 ? 1 : 0.35);
    }
  }

  private updateHint(dt: number): void {
    this.hint.setVisible(this.hintTimer > 0);
    if (this.hintTimer <= 0) return;
    this.hintTimer -= dt;
    const device = this.gameScene.controls.lastDevice;
    const controls =
      device === 'touch'
        ? 'Drag on the left to swim  ·  Tap LUNGE, SPIN and EGGS'
        : device === 'gamepad'
          ? 'Left stick: swim  ·  A: lunge  ·  B/X: spin  ·  Y: egg bombs'
          : 'WASD / Arrows: swim  ·  SPACE: lunge  ·  Q: spin  ·  E: egg bombs';
    this.hint.setText(`Eat all ${OBJECTIVE.population} humans before your rage runs out!\n${controls}`);
    this.hint.setAlpha(Math.min(1, this.hintTimer));
  }

  private updateOrbs(dt: number): void {
    const tx = 30 + (this.displayedRage / RAGE.max) * 220;
    const ty = 27;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.t += dt;
      const t = Phaser.Math.Clamp(orb.t / orb.duration, 0, 1);
      if (orb.t < 0) {
        orb.image.setVisible(false);
        continue;
      }
      orb.image.setVisible(true);
      // Quadratic Bezier toward the rage bar.
      const u = 1 - t;
      const e = t * t;
      const x = u * u * orb.sx + 2 * u * t * orb.cx + e * tx;
      const y = u * u * orb.sy + 2 * u * t * orb.cy + e * ty;
      orb.image.setPosition(x, y).setScale(1.6 - t * 0.6);
      if (t >= 1) {
        orb.image.destroy();
        this.orbs.splice(i, 1);
        this.rageFlash = Math.max(this.rageFlash, 0.4);
      }
    }
  }
}
