import Phaser from 'phaser';
import { audio, type AudioDirector } from '../audio';
import { PHYSICS, RAGE, WORLD } from '../config';
import { InputController } from '../input';
import { Backdrop } from '../render/Backdrop';
import { Effects } from '../render/Effects';
import { EntityViews } from '../render/EntityViews';
import { SquidView } from '../render/SquidView';
import { WaterView } from '../render/WaterView';
import type { SimEvent } from '../sim/events';
import { Simulation } from '../sim/simulation';
import { recordRun, type RunResult } from '../storage';
import { uiMetrics } from '../ui/layout';

const MAX_STEPS_PER_FRAME = 5;
const HUMAN_POPUP = '#ffd34d';

export interface GameOverInfo extends RunResult {
  kills: number;
  victoryBonus: number;
  newBest: boolean;
  fastest: boolean;
}

/**
 * Runs the simulation at a fixed 60 Hz and renders it with interpolation.
 * HUD, pause menu and results are separate overlay scenes.
 */
export class GameScene extends Phaser.Scene {
  sim!: Simulation;
  controls!: InputController;
  paused = false;
  /** Game loop frame on which the game was last paused. */
  pausedFrame = -1;
  ended = false;
  timeScale = 1;

  private sfx!: AudioDirector;
  private backdrop!: Backdrop;
  private water!: WaterView;
  private squid!: SquidView;
  private views!: EntityViews;
  private effects!: Effects;
  private accumulator = 0;
  private camX = 0;
  private camY = 0;
  private readonly view = new Phaser.Geom.Rectangle();
  private endTimer = -1;

  constructor() {
    super('Game');
  }

  create(): void {
    this.paused = false;
    this.ended = false;
    this.timeScale = 1;
    this.accumulator = 0;
    this.endTimer = -1;

    this.sim = new Simulation();
    this.backdrop = new Backdrop(this);
    this.views = new EntityViews(this);
    this.squid = new SquidView(this);
    this.water = new WaterView(this);
    this.effects = new Effects(this, this.sim.water);
    this.backdrop.seedClouds(this.sim.player.x);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.width, WORLD.height);
    this.camX = this.sim.player.x;
    this.camY = this.sim.player.y;
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);

    this.controls = new InputController(this);
    this.controls.onPause = () => this.togglePause();
    this.controls.onMute = () => this.sfx.toggleMusic();

    this.sfx = audio(this.game);
    this.sfx.startMusic();
    this.sfx.startAmbience();

    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.fitCamera, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
      this.sfx.stopAmbience();
    });

    this.scene.launch('Hud');
    this.scene.bringToTop('Hud');
  }

  private fitCamera(): void {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    cam.setSize(width, height);
    // Show at least 960x540 world pixels (the original showed 800x480).
    cam.setZoom(uiMetrics(width, height).zoom);
    cam.centerOn(this.camX, this.camY);
    // Redraw size-dependent layers now: a paused scene doesn't run update().
    if (this.backdrop && this.water) {
      const view = this.visibleWorld();
      this.backdrop.update(0, view, this.camX);
      this.water.update(this.sim.water, view);
    }
  }

  private onBlur(): void {
    if (!this.paused && !this.ended) this.setPaused(true);
  }

  togglePause(): void {
    this.setPaused(!this.paused);
  }

  /** Pausing suspends the whole scene (physics, animations, tweens, particles); the HUD stays live. */
  setPaused(paused: boolean): void {
    if (this.ended || paused === this.paused) return;
    this.paused = paused;
    if (paused) this.pausedFrame = this.game.loop.frame;
    this.controls.clear();
    if (paused) this.scene.pause();
    else this.scene.resume();
    this.events.emit('pause-changed', paused);
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    // Slow motion recovers in real time (original: +0.01 per frame).
    if (this.timeScale < 1) this.timeScale = Math.min(1, this.timeScale + RAGE.slowMoRecoverPerSecond * dt);
    this.accumulator += dt * this.timeScale;
    let steps = 0;
    while (this.accumulator >= PHYSICS.step && steps < MAX_STEPS_PER_FRAME) {
      this.sim.step(this.controls.consume());
      this.accumulator -= PHYSICS.step;
      steps++;
      for (const event of this.sim.drainEvents()) this.handleEvent(event);
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    this.anims.globalTimeScale = this.timeScale;
    this.tweens.timeScale = this.timeScale;

    const alpha = this.accumulator / PHYSICS.step;
    const worldDt = dt * this.timeScale;
    this.squid.update(this.sim.player, alpha, worldDt);
    this.views.update(this.sim, alpha, worldDt);
    this.effects.update(worldDt, this.sim);
    this.updateCamera(dt);
    const view = this.visibleWorld();
    this.backdrop.update(worldDt, view, this.camX);
    this.water.update(this.sim.water, view);

    const player = this.sim.player;
    this.sfx.updateAmbience(dt, player.wet, Math.max(0, this.sim.water.level - player.y));

    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.showResults();
    }
  }

  private updateCamera(dt: number): void {
    const player = this.sim.player;
    const v = player.body.getLinearVelocity();
    // Look ahead in the direction of travel.
    const lookX = Phaser.Math.Clamp(v.x * PHYSICS.ppm * 0.22, -140, 140);
    const lookY = Phaser.Math.Clamp(v.y * PHYSICS.ppm * 0.15, -90, 90);
    const k = 1 - Math.exp(-5.5 * dt);
    this.camX += (this.squid.x + lookX - this.camX) * k;
    this.camY += (this.squid.y + lookY - this.camY) * k;
    this.cameras.main.centerOn(this.camX, this.camY);
  }

  /**
   * The world rectangle the camera will show this frame. Camera.worldView is only
   * refreshed at render time, so using it here would lag a frame behind.
   */
  private visibleWorld(): Phaser.Geom.Rectangle {
    const cam = this.cameras.main;
    const w = cam.width / cam.zoom;
    const h = cam.height / cam.zoom;
    const x = w >= WORLD.width ? (WORLD.width - w) / 2 : Phaser.Math.Clamp(this.camX - w / 2, 0, WORLD.width - w);
    const y = h >= WORLD.height ? (WORLD.height - h) / 2 : Phaser.Math.Clamp(this.camY - h / 2, 0, WORLD.height - h);
    return this.view.setTo(x, y, w, h);
  }

  /** World position to screen pixels (for the HUD). */
  worldToScreen(x: number, y: number): { x: number; y: number } {
    const cam = this.cameras.main;
    return { x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom };
  }

  private shake(intensity: number, duration = 220): void {
    this.cameras.main.shake(duration, intensity);
  }

  private nearPlayer(x: number, y: number, range: number): boolean {
    const p = this.sim.player;
    return Math.hypot(x - p.x, y - p.y) < range;
  }

  private handleEvent(event: SimEvent): void {
    const fx = this.effects;
    const sfx = this.sfx;
    switch (event.type) {
      case 'kill': {
        if (event.effect === 'blood') {
          fx.bloodSplat(event.x, event.y);
          sfx.play('splat', 0.8, { rate: Phaser.Math.FloatBetween(0.9, 1.15), minGap: 20 });
        } else {
          fx.explosion(event.x, event.y, event.kind === 'ferry' || event.kind === 'plane');
          sfx.play(event.kind === 'ferry' ? 'explosion' : 'explosionSmall', 0.45, { rate: Phaser.Math.FloatBetween(0.9, 1.1) });
          this.shake(event.kind === 'ferry' ? 0.012 : 0.005);
        }
        if (!event.byEgg) this.squid.chomp();
        const label = event.multiplier > 1 ? `+${event.points} x${event.multiplier}` : `+${event.points}`;
        fx.popup(event.x, event.y - 16, label, event.human ? HUMAN_POPUP : '#ffffff', event.human ? 24 : 18);
        const screen = this.worldToScreen(event.x, event.y);
        this.events.emit('rage-orbs', screen.x, screen.y, Math.max(1, Math.round(event.rage / 6)));
        if (event.human) this.events.emit('human-eaten');
        break;
      }
      case 'enemyHit':
        fx.sparkBurst(event.x, event.y, 18);
        sfx.play('metalHit', 0.6);
        this.shake(0.006);
        break;
      case 'crateBreak':
        fx.woodBurst(event.x, event.y);
        fx.popup(event.x, event.y - 10, `+${event.points}`, '#e8d3a8', 16);
        sfx.play('land', 0.25, { rate: 1.6 });
        break;
      case 'splash': {
        fx.splash(event.x, event.y, event.size);
        if (event.player) {
          sfx.play('splash', 0.25 + event.size * 0.35, { rate: event.entering ? 1 : 1.25 });
          if (event.entering) fx.bubbleBurst(event.x, event.y + 20, Math.round(4 + event.size * 12));
        } else if (this.nearPlayer(event.x, event.y, 900)) {
          sfx.play('splash', 0.12 + event.size * 0.2, { rate: 1.3, minGap: 80 });
        }
        break;
      }
      case 'land':
        // Original: quiet random-volume thud and a camera shake.
        sfx.play('land', Math.min(0.35, 0.1 + event.speed / 3000), { minGap: 150 });
        this.shake(Math.min(0.012, event.speed / 70000), 260);
        break;
      case 'lunge':
        sfx.play('spin', 0.18, { rate: 1.7 });
        if (event.wet) fx.bubbleBurst(event.x, event.y, 8);
        break;
      case 'spin':
        sfx.play('spin', 0.4);
        fx.ring(event.x, event.y, 70, 0xffffff);
        break;
      case 'eggs':
        sfx.play('splat', 0.35, { rate: 1.7 });
        break;
      case 'shock':
        fx.sparkBurst(event.x, event.y, 26);
        sfx.play('metalHit', 0.5, { rate: 1.6 });
        this.cameras.main.flash(120, 160, 240, 255);
        break;
      case 'hurt':
        if (event.source === 'bullet') sfx.play('metalHit', 0.35, { rate: 1.3 });
        this.cameras.main.flash(90, 201, 61, 61);
        this.shake(0.008);
        this.events.emit('player-hurt', event.amount);
        break;
      case 'shot':
        if (this.nearPlayer(event.x, event.y, 900)) {
          if (event.kind === 'bullet') sfx.play('explosionSmall', 0.08, { rate: 2.6, minGap: 60 });
          else sfx.play('splash', 0.3, { rate: 0.6 });
        }
        break;
      case 'parry':
        fx.sparkBurst(event.x, event.y, 16);
        fx.popup(event.x, event.y - 10, 'PARRY!', '#9ff3ff', 18);
        sfx.play('metalHit', 0.4, { rate: 1.8 });
        break;
      case 'explosion':
        fx.explosion(event.x, event.y, event.big);
        if (this.nearPlayer(event.x, event.y, 1000)) {
          sfx.play(event.big ? 'explosion' : 'explosionSmall', event.big ? 0.45 : 0.2, { rate: Phaser.Math.FloatBetween(0.95, 1.1) });
        }
        if (event.big && this.nearPlayer(event.x, event.y, 400)) this.shake(0.01);
        break;
      case 'bulletSplash':
        fx.splash(event.x, event.y, 0.05);
        break;
      case 'alert':
        this.events.emit('alert', event.level);
        this.shake(0.004, 400);
        break;
      case 'slowmo':
        this.timeScale = RAGE.slowMoScale;
        break;
      case 'gameOver':
        this.ended = true;
        this.controls.clear();
        this.endTimer = event.won ? 1.2 : 2.2;
        this.events.emit('game-over', event.won);
        break;
    }
  }

  private showResults(): void {
    const rules = this.sim.rules;
    const run: RunResult = {
      score: rules.score,
      humans: rules.humansEaten,
      bestCombo: rules.bestCombo,
      won: rules.state === 'won',
      time: rules.elapsed,
    };
    const records = recordRun(run);
    const info: GameOverInfo = { ...run, ...records, kills: rules.kills, victoryBonus: rules.victoryBonus };
    this.scene.launch('Results', info);
    this.scene.bringToTop('Results');
  }

  restart(): void {
    this.scene.stop('Results');
    this.scene.stop('Hud');
    this.scene.restart();
  }

  quitToMenu(): void {
    this.scene.stop('Results');
    this.scene.stop('Hud');
    this.scene.start('Menu');
  }
}
