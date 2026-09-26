import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
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
  scene: [BootScene, MenuScene, GameScene, HudScene, ResultsScene],
});

// Exposed for debugging and end-to-end tests.
declare global {
  interface Window {
    __SMS__?: Phaser.Game;
  }
}
window.__SMS__ = game;
