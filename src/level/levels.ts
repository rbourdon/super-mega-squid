import archesData from './arches.json';
import coveData from './cove.json';
import fireisleData from './fireisle.json';
import grottoData from './grotto.json';
import needlesData from './needles.json';
import shallowsData from './shallows.json';
import skyislesData from './skyisles.json';

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
  {
    id: 'skyisles',
    name: 'SKY ISLES',
    blurb: 'Climb tiers of floating isles to the great wooded isle high above the sea.',
    data: skyislesData as LevelData,
    spawn: { x: 2500, y: 350 },
    buoys: [950, 3100, 4300, 5700, 7700],
  },
  {
    id: 'grotto',
    name: 'THE GROTTO',
    blurb: 'A vast cave roof hung with vines and columns. Leap up through its gaps to the mossy top.',
    data: grottoData as LevelData,
    spawn: { x: 1350, y: 1330 },
    buoys: [1300, 2300, 3750, 4700, 7000],
  },
  {
    id: 'needles',
    name: 'NEEDLE ROCKS',
    blurb: 'A forest of broken sea stacks: swim under them, climb their ledges, perch on their crowns.',
    data: needlesData as LevelData,
    spawn: { x: 1300, y: 350 },
    buoys: [1350, 2350, 3700, 5400, 7000],
  },
  {
    id: 'shallows',
    name: 'CORAL SHALLOWS',
    blurb: 'A raised reef thick with weed and coral, a table reef to hide under and a deep blue hole.',
    data: shallowsData as LevelData,
    spawn: { x: 1350, y: 350 },
    buoys: [1400, 2700, 3600, 4700, 6000],
  },
  {
    id: 'fireisle',
    name: 'FIRE ISLE',
    blurb: 'A volcano with a lava lake in its crater. Dive under its roots, past the glowing vents.',
    data: fireisleData as LevelData,
    spawn: { x: 1500, y: 350 },
    buoys: [1400, 2600, 3300, 6800, 7800],
  },
];

export const DEFAULT_LEVEL = LEVELS[0];

export function levelById(id: string | undefined): LevelDef {
  return LEVELS.find((level) => level.id === id) ?? DEFAULT_LEVEL;
}
