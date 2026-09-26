import { ENEMIES } from './config';

/** Single images, keyed by file name (without extension) in assets/sprites. */
export const IMAGES = [
  'menubg',
  'playbutton',
  'playbuttondown',
  'pauseninelogo',
  'humansalive',
  'rageorb',
  'bubble1',
  'bubble2',
  'bubble3',
  'buoy',
  'cargo',
  'eggbomb2',
  'cloud1',
  'cloud2',
  'cloud3',
  'cloud4',
  'bigcloud1',
  'bigcloud2',
  'scrollingbg',
  'scrollingbg2',
  'joystickoutside',
  'joystickinside',
  'lungebutton',
  'spinbutton',
] as const;

export interface SheetDef {
  key: string;
  frameWidth: number;
  frameHeight: number;
}

/** Sprite sheets: the player, effects, and every enemy texture (derived from the enemy table). */
export const SHEETS: SheetDef[] = (() => {
  const sheets = new Map<string, SheetDef>();
  sheets.set('playeranim', { key: 'playeranim', frameWidth: 25, frameHeight: 27 });
  sheets.set('bloodanim2', { key: 'bloodanim2', frameWidth: 70, frameHeight: 70 });
  sheets.set('exploanim', { key: 'exploanim', frameWidth: 73, frameHeight: 73 });
  for (const def of Object.values(ENEMIES)) {
    for (const key of def.textures) sheets.set(key, { key, frameWidth: def.frameWidth, frameHeight: def.frameHeight });
  }
  return [...sheets.values()];
})();

export const SOUNDS = {
  splash: 'splash',
  land: 'land',
  metalHit: 'metal-hit',
  splat: 'splat',
  spin: 'spin',
  explosionSmall: 'explosion-small',
  explosion: 'explosion',
  underwater: 'underwater',
  wind: 'wind',
  theme: 'theme',
} as const;

export type SoundKey = keyof typeof SOUNDS;

export const tileKey = (level: string, tx: number, ty: number): string => `${level}:tile_${tx}_${ty}`;
export const previewKey = (level: string): string => `${level}:preview`;

export const FONT_FAMILY = '"Rocket Propelled", "Arial Black", sans-serif';
