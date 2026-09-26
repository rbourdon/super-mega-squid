import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultsScene } from './scenes/ResultsScene';

/**
 * Embedded pages (iframes without allow="gamepad") can block the Gamepad API,
 * and Phaser polls it every frame without a guard, so only enable it when usable.
 */
function gamepadsAvailable(): boolean {
  try {
    navigator.getGamepads?.();
    return typeof navigator.getGamepads === 'function';
  } catch {
    return false;
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1c22',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  input: {
    gamepad: gamepadsAvailable(),
    activePointers: 4,
  },
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene, HudScene, ResultsScene],
});

// Phaser dispatches each key event as soon as it arrives but only empties its key queue
// once per frame, so every key pressed later in the same frame replays the earlier ones
// (Right then Enter became Right, Right, Enter). Drop events that were already dispatched
// before Phaser queues the next one; this capturing listener runs before Phaser's own.
const keyboardManager = game.input.keyboard as unknown as { queue: KeyboardEvent[] } | null;
if (keyboardManager) {
  for (const type of ['keydown', 'keyup']) {
    window.addEventListener(
      type,
      () => {
        keyboardManager.queue.length = 0;
      },
      true,
    );
  }
}

// Exposed for debugging and end-to-end tests.
declare global {
  interface Window {
    __SMS__?: Phaser.Game;
  }
}
window.__SMS__ = game;
