import { OBJECTIVE, RAGE, SCORE } from '../config';

export type GameState = 'playing' | 'won' | 'lost';

export interface KillResult {
  points: number;
  multiplier: number;
  combo: number;
  rage: number;
}

/**
 * Scoring and win/lose rules, kept free of physics so they are easy to test.
 *
 * Rage is the squid's life: it drains constantly (a little faster the longer
 * the rampage lasts) and is refilled by eating. The town has a fixed human
 * population; eating every last one wins the game, running out of rage loses.
 */
export class Rules {
  rage: number = RAGE.max;
  score = 0;
  kills = 0;
  humansEaten = 0;
  combo = 0;
  bestCombo = 0;
  elapsed = 0;
  victoryBonus = 0;
  state: GameState = 'playing';
  private comboTimer = 0;

  constructor(readonly population: number = OBJECTIVE.population) {}

  get humansLeft(): number {
    return this.population - this.humansEaten;
  }

  /** 0 (calm) .. 3 (full military response), based on how much of the town was eaten. */
  get alertLevel(): number {
    const fraction = this.humansEaten / this.population;
    let level = 0;
    OBJECTIVE.alertThresholds.forEach((threshold, i) => {
      if (fraction >= threshold) level = i;
    });
    return level;
  }

  get multiplier(): number {
    if (this.combo <= 0) return 1;
    return Math.min(SCORE.maxMultiplier, 1 + Math.floor((this.combo - 1) / SCORE.comboStep));
  }

  /** Seconds left in the current combo window (0 when no combo is running). */
  get comboTimeLeft(): number {
    return this.combo > 0 ? this.comboTimer : 0;
  }

  get drainRate(): number {
    const ramp = 1 + (this.elapsed / 60) * RAGE.drainRampPerMinute;
    return RAGE.drainPerSecond * Math.min(RAGE.maxDrainMultiplier, ramp);
  }

  update(dt: number): void {
    if (this.state !== 'playing') return;
    this.elapsed += dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.changeRage(-this.drainRate * dt);
  }

  registerKill(points: number, rage: number, human: boolean): KillResult {
    if (this.state !== 'playing') return { points: 0, multiplier: 1, combo: this.combo, rage: 0 };
    this.combo += 1;
    this.comboTimer = RAGE.comboWindow;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.kills += 1;
    const multiplier = this.multiplier;
    const awarded = points * multiplier;
    this.score += awarded;
    this.changeRage(rage);
    if (human) {
      this.humansEaten = Math.min(this.population, this.humansEaten + 1);
      if (this.humansLeft === 0) this.win();
    }
    return { points: awarded, multiplier, combo: this.combo, rage };
  }

  addPoints(points: number): void {
    if (this.state === 'playing') this.score += points;
  }

  addRage(amount: number): void {
    if (this.state === 'playing') this.changeRage(amount);
  }

  damage(amount: number): void {
    if (this.state === 'playing') this.changeRage(-amount);
  }

  private changeRage(delta: number): void {
    this.rage = Math.max(0, Math.min(RAGE.max, this.rage + delta));
    if (this.rage <= 0 && this.state === 'playing') this.state = 'lost';
  }

  private win(): void {
    this.state = 'won';
    const timeBonus = Math.max(0, SCORE.victoryTimeBonus - this.elapsed * SCORE.victoryTimeBonusDecayPerSecond);
    this.victoryBonus = Math.round(this.rage * SCORE.victoryRageBonus + timeBonus);
    this.score += this.victoryBonus;
  }
}
