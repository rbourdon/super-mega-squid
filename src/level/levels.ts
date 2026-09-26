import archesData from './arches.json';
import coveData from './cove.json';

/** Level data written by scripts/build-level.ts. */
export interface LevelData {
  width: number;
  height: number;
  tileSize: number;
  /** Tile column, row, width and height; empty tiles are omitted. */
  tiles: Array<[number, number, number, number]>;
  /** Closed collision outlines as flat [x0, y0, x1, y1, ...] arrays in pixels. */
  loops: number[][];
}

export interface LevelDef {
  id: string;
  name: string;
  /** One line for the level select screen. */
  blurb: string;
  data: LevelData;
  /** Where the squid drops in, above open water. */
  spawn: { x: number; y: number };
  /** x positions of the moored buoys. */
  buoys: readonly number[];
}

export const LEVELS: readonly LevelDef[] = [
  {
    id: 'cove',
    name: 'THE COVE',
    blurb: 'The original bay: cliffs, a floating isle and a sleepy seaside town.',
    data: coveData as LevelData,
    spawn: { x: 1080, y: 500 },
    buoys: [700, 3400, 4600, 6700, 7900],
  },
  {
    id: 'arches',
    name: 'ARCH ROCK',
    blurb: 'Leap the great arch, dive under the broken sea stack and climb stepping stones to the sky.',
    data: archesData as LevelData,
    spawn: { x: 1550, y: 450 },
    buoys: [1300, 2750, 4450, 5350, 7600],
  },
];

export const DEFAULT_LEVEL = LEVELS[0];

export function levelById(id: string | undefined): LevelDef {
  return LEVELS.find((level) => level.id === id) ?? DEFAULT_LEVEL;
}
