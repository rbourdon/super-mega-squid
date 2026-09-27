/** Shared constants and shape helpers for the generated level layouts. */
import type { Pt } from '../lib/raster';
import type { MassDef } from '../lib/rock-art';

export const W = 9216;
/** Level height and mean water line, shared by every level (enemy spawn heights depend on them). */
export const H = 3001;
export const WATER = 1505;
export const HALF_PI = Math.PI / 2;

/** What a generated level is made of. */
export interface LevelLayout {
  id: string;
  width: number;
  seed: number;
  masses: MassDef[];
  /** Seabed stretches (x ranges) that get a sandy top with seaweed and coral. */
  sand: Array<[number, number]>;
  /** Gap between plants on the sand, in px. */
  plantSpacing?: [number, number];
}

/** A floating rock above (or at) the water, mossy with vines hanging off it. */
export function floater(name: string, outline: Pt[], moss = true): MassDef {
  return { name, rings: [outline], style: 'packed', size: 62, angle: 0, stretch: 2, moss, fringe: moss, hangingVines: moss ? 9 : 0 };
}

/** A bare chunk of rock. */
export function fragment(name: string, outline: Pt[]): MassDef {
  return { name, rings: [outline], style: 'packed', size: 55, angle: 0, stretch: 1.8, crag: false };
}

/** A boulder resting on the seabed. */
export function boulder(name: string, outline: Pt[]): MassDef {
  return { name, rings: [outline], style: 'packed', size: 70, angle: 0, stretch: 1.6, crag: false };
}

/** The seabed: a profile left to right, closed along the bottom of the level. */
export function seabed(width: number, profile: Pt[], extra: Partial<MassDef> = {}): MassDef {
  return { name: 'seabed', rings: [[...profile, [width, H], [0, H]]], style: 'packed', size: 120, angle: 0, stretch: 2.8, sand: true, ...extra };
}
