import { describe, expect, it } from 'vitest';
import { RAGE, SCORE } from '../../src/config';
import { Rules } from '../../src/sim/rules';

describe('Rules', () => {
  it('drains rage over time and loses when it runs out', () => {
    const rules = new Rules(10);
    rules.update(1);
    expect(rules.rage).toBeCloseTo(RAGE.max - RAGE.drainPerSecond, 1);
    for (let i = 0; i < 1000 && rules.state === 'playing'; i++) rules.update(0.1);
    expect(rules.state).toBe('lost');
    expect(rules.rage).toBe(0);
  });

  it('drains faster the longer the rampage lasts, up to a cap', () => {
    const rules = new Rules(10);
    const initial = rules.drainRate;
    rules.elapsed = 120;
    expect(rules.drainRate).toBeGreaterThan(initial);
    rules.elapsed = 100000;
    expect(rules.drainRate).toBeCloseTo(RAGE.drainPerSecond * RAGE.maxDrainMultiplier);
  });

  it('refills rage (capped) and scores kills', () => {
    const rules = new Rules(10);
    rules.update(5);
    const result = rules.registerKill(40, 15, false);
    expect(result.points).toBe(40);
    expect(rules.rage).toBeLessThanOrEqual(RAGE.max);
    rules.registerKill(10, 500, false);
    expect(rules.rage).toBe(RAGE.max);
  });

  it('builds combo multipliers within the combo window', () => {
    const rules = new Rules(100);
    const results = [];
    for (let i = 0; i < SCORE.comboStep * 2 + 1; i++) results.push(rules.registerKill(10, 0, false));
    expect(results[0].multiplier).toBe(1);
    expect(results[SCORE.comboStep].multiplier).toBe(2);
    expect(results[SCORE.comboStep * 2].multiplier).toBe(3);
    expect(rules.bestCombo).toBe(SCORE.comboStep * 2 + 1);
    rules.update(RAGE.comboWindow + 0.01);
    expect(rules.combo).toBe(0);
    expect(rules.registerKill(10, 0, false).multiplier).toBe(1);
  });

  it('raises the alert level as humans are eaten', () => {
    const rules = new Rules(10);
    expect(rules.alertLevel).toBe(0);
    for (let i = 0; i < 5; i++) rules.registerKill(100, 0, true);
    expect(rules.alertLevel).toBe(2);
    expect(rules.humansLeft).toBe(5);
  });

  it('wins when the last human is eaten and awards a bonus', () => {
    const rules = new Rules(2);
    rules.registerKill(100, 0, true);
    expect(rules.state).toBe('playing');
    const before = rules.score;
    rules.registerKill(100, 0, true);
    expect(rules.state).toBe('won');
    expect(rules.victoryBonus).toBeGreaterThan(0);
    expect(rules.score).toBeGreaterThan(before + 100);
    // Nothing changes after the game is over.
    rules.update(100);
    expect(rules.state).toBe('won');
  });
});
