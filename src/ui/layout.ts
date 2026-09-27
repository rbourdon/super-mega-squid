import Phaser from 'phaser';
import { FONT_FAMILY } from '../assets';

/** Scale and centre an image so it covers the whole area (CSS background-size: cover). */
export function coverImage(image: Phaser.GameObjects.Image, width: number, height: number): void {
  const scale = Math.max(width / image.width, height / image.height);
  image.setScale(scale).setPosition(width / 2, height / 2);
}

/**
 * The world and UI are laid out in a virtual resolution that covers at least
 * 960 units along the screen's long side and 540 along its short side, so any
 * aspect ratio works: landscape shows at least 960x540, portrait at least
 * 540x960. Returns the zoom and the virtual size of the screen.
 */
export function uiMetrics(width: number, height: number): { zoom: number; vw: number; vh: number } {
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const zoom = Math.max(0.35, Math.min(long / 960, short / 540));
  return { zoom, vw: width / zoom, vh: height / zoom };
}

/**
 * Call `handler` when a press both starts and ends on the target. Phaser sends
 * pointerup to whatever is under the pointer when it lifts, so without this a
 * thumb dragged off the joystick could "click" a menu button it ends up over.
 */
export function onTap(target: Phaser.GameObjects.GameObject, handler: () => void): void {
  let armedBy: number | null = null;
  target.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    armedBy = pointer.id;
  });
  target.on('pointerout', (pointer: Phaser.Input.Pointer) => {
    if (pointer.id === armedBy) armedBy = null;
  });
  target.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    if (pointer.id !== armedBy) return;
    armedBy = null;
    handler();
  });
}

/** Shrink a text object (never enlarge it) so it fits within a width. */
export function fitWidth(text: Phaser.GameObjects.Text, maxWidth: number): void {
  text.setScale(1);
  if (text.width > maxWidth) text.setScale(maxWidth / text.width);
}

export function textStyle(size: number, color = '#ffffff', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    color,
    ...extra,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle;
}

/** Text with a soft drop shadow, used across menus and the HUD. */
export function shadowText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color = '#ffffff',
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, textStyle(size, color))
    .setShadow(2, 3, 'rgba(0,0,0,0.45)', 2, false, true);
}

export interface TextButton {
  container: Phaser.GameObjects.Container;
  setLabel(label: string): void;
  setSelected(selected: boolean): void;
}

/** A simple rounded text button that works with mouse, touch and keyboard focus. */
export function textButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  width = 260,
  height = 52,
): TextButton {
  const bg = scene.add.graphics();
  const text = scene.add.text(0, 0, label, textStyle(26)).setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);
  let hovered = false;
  let selected = false;
  const draw = () => {
    const active = hovered || selected;
    bg.clear();
    bg.fillStyle(active ? 0xc93d3d : 0x0b1c22, active ? 0.95 : 0.7);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(3, 0xffffff, active ? 0.95 : 0.6);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
  };
  draw();
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => {
    hovered = true;
    draw();
  });
  container.on('pointerout', () => {
    hovered = false;
    draw();
  });
  onTap(container, onClick);
  return {
    container,
    setLabel: (value: string) => text.setText(value),
    setSelected: (value: boolean) => {
      selected = value;
      draw();
    },
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatScore(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}
