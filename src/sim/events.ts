import type { DeathEffect, EnemyKind } from '../config';

/** Player intent for one simulation step. Actions are edge-triggered. */
export interface InputFrame {
  /** Desired movement direction, magnitude 0..1. */
  moveX: number;
  moveY: number;
  lunge: boolean;
  spin: boolean;
  eggs: boolean;
}

export const NO_INPUT: Readonly<InputFrame> = { moveX: 0, moveY: 0, lunge: false, spin: false, eggs: false };

export type HurtSource = 'bullet' | 'torpedo' | 'shock';

/** Things that happened during a step, consumed by the presentation layer. */
export type SimEvent =
  | {
      type: 'kill';
      kind: EnemyKind;
      x: number;
      y: number;
      points: number;
      multiplier: number;
      combo: number;
      rage: number;
      effect: DeathEffect;
      human: boolean;
      byEgg: boolean;
    }
  | { type: 'enemyHit'; kind: EnemyKind; x: number; y: number }
  | { type: 'crateBreak'; x: number; y: number; points: number }
  | { type: 'splash'; x: number; y: number; size: number; entering: boolean; player: boolean }
  | { type: 'land'; x: number; y: number; speed: number }
  | { type: 'lunge'; x: number; y: number; wet: boolean }
  | { type: 'spin'; x: number; y: number }
  | { type: 'eggs' }
  | { type: 'shock'; x: number; y: number }
  | { type: 'hurt'; amount: number; source: HurtSource; x: number; y: number }
  | { type: 'shot'; kind: 'bullet' | 'torpedo'; x: number; y: number }
  | { type: 'parry'; x: number; y: number }
  | { type: 'explosion'; x: number; y: number; big: boolean }
  | { type: 'bulletSplash'; x: number; y: number }
  | { type: 'alert'; level: number }
  | { type: 'slowmo'; x: number; y: number }
  | { type: 'gameOver'; won: boolean };
