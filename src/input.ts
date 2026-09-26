import Phaser from 'phaser';
import type { InputFrame } from './sim/events';

export type Action = 'lunge' | 'spin' | 'eggs';
export type Device = 'keyboard' | 'gamepad' | 'touch';

const ACTION_KEYS: Record<Action, string[]> = {
  lunge: ['SPACE', 'J', 'Z'],
  spin: ['Q', 'K', 'X'],
  eggs: ['E', 'L', 'C'],
};

const STICK_DEADZONE = 0.2;

/**
 * Merges keyboard, gamepad and touch into one intent per simulation step.
 * Button presses are buffered until a step consumes them so none are lost
 * when a frame runs zero physics steps (high refresh rates) or several.
 */
export class InputController {
  lastDevice: Device = 'keyboard';
  /** Set by the on-screen joystick (magnitude 0..1). */
  touchMove = { x: 0, y: 0 };
  onPause: (() => void) | null = null;
  onMute: (() => void) | null = null;

  private readonly pending: Record<Action, boolean> = { lunge: false, spin: false, eggs: false };
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  constructor(private readonly scene: Phaser.Scene) {
    if (isTouchFirst(scene.sys.game)) this.lastDevice = 'touch';
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      for (const name of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']) {
        this.keys[name] = keyboard.addKey(name, true);
      }
      for (const [action, names] of Object.entries(ACTION_KEYS) as Array<[Action, string[]]>) {
        for (const name of names) {
          keyboard.addKey(name, true);
          keyboard.on(`keydown-${name}`, (event: KeyboardEvent) => {
            if (!event.repeat) this.press(action, 'keyboard');
          });
        }
      }
      keyboard.on('keydown-ESC', () => this.onPause?.());
      keyboard.on('keydown-P', () => this.onPause?.());
      keyboard.on('keydown-M', () => this.onMute?.());
      keyboard.on('keydown', () => {
        this.lastDevice = 'keyboard';
      });
    }

    const gamepad = scene.input.gamepad;
    if (gamepad) {
      gamepad.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        this.lastDevice = 'gamepad';
        switch (button.index) {
          case 0: // A / Cross
          case 7: // right trigger
            this.press('lunge', 'gamepad');
            break;
          case 1: // B / Circle
          case 2: // X / Square
          case 5: // right bumper
            this.press('spin', 'gamepad');
            break;
          case 3: // Y / Triangle
          case 4: // left bumper
          case 6: // left trigger
            this.press('eggs', 'gamepad');
            break;
          case 9: // Start
            this.onPause?.();
            break;
          default:
            break;
        }
      });
    }
  }

  press(action: Action, device: Device = this.lastDevice): void {
    this.pending[action] = true;
    this.lastDevice = device;
  }

  /** Current movement direction, magnitude clamped to 1. */
  movement(): { x: number; y: number } {
    let best = { x: 0, y: 0 };
    let bestMag = 0;
    const consider = (x: number, y: number) => {
      const mag = Math.hypot(x, y);
      if (mag > bestMag) {
        bestMag = mag;
        best = mag > 1 ? { x: x / mag, y: y / mag } : { x, y };
      }
    };

    const k = this.keys;
    if (Object.keys(k).length) {
      const kx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      const ky = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      if (kx || ky) {
        const mag = Math.hypot(kx, ky);
        consider(kx / mag, ky / mag);
      }
    }

    const pads = this.scene.input.gamepad?.gamepads ?? [];
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const stick = pad.leftStick;
      if (stick && Math.hypot(stick.x, stick.y) > STICK_DEADZONE) {
        consider(stick.x, stick.y);
        this.lastDevice = 'gamepad';
      }
      const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
      const dy = (pad.down ? 1 : 0) - (pad.up ? 1 : 0);
      if (dx || dy) {
        const mag = Math.hypot(dx, dy);
        consider(dx / mag, dy / mag);
        this.lastDevice = 'gamepad';
      }
    }

    consider(this.touchMove.x, this.touchMove.y);
    return best;
  }

  /** Build the input for one simulation step, consuming buffered presses. */
  consume(): InputFrame {
    const move = this.movement();
    const frame: InputFrame = {
      moveX: move.x,
      moveY: move.y,
      lunge: this.pending.lunge,
      spin: this.pending.spin,
      eggs: this.pending.eggs,
    };
    this.pending.lunge = this.pending.spin = this.pending.eggs = false;
    return frame;
  }

  clear(): void {
    this.pending.lunge = this.pending.spin = this.pending.eggs = false;
    this.touchMove = { x: 0, y: 0 };
  }
}

/** Phones and tablets start with touch controls visible. */
function isTouchFirst(game: Phaser.Game): boolean {
  const { os, input } = game.device;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return input.touch && (os.android || os.iOS || os.iPad || os.iPhone || coarse);
}
