/**
 * Needle Rocks: a forest of tall, thin sea stacks, some hanging high in the sky and
 * some broken off their stumps so they dip into the sea, between two low headlands.
 */
import type { MassDef } from '../lib/rock-art';
import { H, HALF_PI, W, boulder, floater, fragment, needle, seabed, stump, type LevelLayout } from './common';

const masses: MassDef[] = [
  seabed(W, [
    [0, 2740], [500, 2790], [1000, 2830], [1500, 2810], [2000, 2830], [2400, 2800], [2560, 2700], [2600, 2600],
    [2640, 2570], [2690, 2640], [2740, 2800], [3100, 2830], [3700, 2810], [4300, 2840], [4900, 2820], [5100, 2780],
    [5180, 2640], [5220, 2560], [5260, 2540], [5300, 2610], [5350, 2790], [5700, 2830], [6300, 2810], [6800, 2830],
    [6900, 2720], [6940, 2650], [6990, 2680], [7040, 2800], [7400, 2830], [8000, 2800], [8500, 2760], [W, 2740],
  ]),
  // Needles dipping into the sea, each over the stump it broke from.
  needle('dip1', 1830, 640, 1960, 95, { lean: 40 }),
  stump('stump1', 1880, 180, 2470),
  needle('dip2', 3260, 830, 2040, 85, { lean: -40 }),
  stump('stump2', 3220, 170, 2480),
  needle('dip3', 4200, 300, 2140, 140, { lean: 70, broken: true, trees: 1 }),
  stump('stump3', 4280, 240, 2490),
  needle('dip4', 5920, 470, 1920, 110, { lean: -30, broken: true }),
  stump('stump4', 5890, 200, 2440),
  needle('dip5', 7560, 360, 2010, 125, { lean: -60, trees: 1 }),
  stump('stump5', 7490, 220, 2460),
  // Needles hanging in the sky.
  needle('sky1', 2820, 380, 1250, 120, { broken: true, trees: 1 }),
  needle('sky2', 4860, 700, 1320, 80, { lean: 20 }),
  needle('sky3', 6560, 880, 1360, 70, { lean: -15 }),
  needle('sky4', 8120, 760, 1260, 75, { lean: 25 }),
  // Pinnacles that never reached the surface.
  {
    name: 'pinnacle1',
    rings: [[[2330, 2830], [2380, 2560], [2410, 2330], [2440, 2180], [2470, 2130], [2500, 2200], [2540, 2380], [2570, 2600], [2620, 2830]]],
    style: 'packed',
    size: 80,
    angle: HALF_PI,
    stretch: 3.2,
    sand: true,
  },
  {
    name: 'pinnacle2',
    rings: [[[6700, 2830], [6750, 2520], [6780, 2260], [6800, 2120], [6840, 2060], [6880, 2140], [6910, 2300], [6950, 2560], [7000, 2830]]],
    style: 'packed',
    size: 80,
    angle: HALF_PI,
    stretch: 3.2,
    sand: true,
  },
  boulder('boulder1', [[1180, 2830], [1200, 2772], [1262, 2748], [1328, 2760], [1352, 2820]]),
  boulder('boulder2', [[5500, 2820], [5522, 2762], [5590, 2738], [5660, 2756], [5680, 2815]]),
  {
    name: 'westHead',
    rings: [[
      [0, 900], [120, 880], [260, 905], [380, 960], [470, 1050], [530, 1150], [560, 1250], [530, 1330], [560, 1420],
      [620, 1520], [700, 1680], [800, 1880], [900, 2100], [1000, 2350], [1080, 2560], [1120, 2750], [1120, H], [0, H],
    ]],
    style: 'rubble',
    size: 110,
    angle: HALF_PI,
    stretch: 2.4,
    band: 140,
    bandTop: 60,
    core: 160,
    moss: true,
    fringe: true,
    hangingVines: 6,
    crawlingVines: 4,
    trees: 2,
  },
  {
    name: 'eastHead',
    rings: [[
      [W, 780], [9080, 770], [8960, 800], [8860, 880], [8790, 980], [8760, 1100], [8800, 1220], [8760, 1350],
      [8700, 1500], [8640, 1700], [8580, 1950], [8520, 2250], [8460, 2550], [8420, 2780], [8420, H], [W, H],
    ]],
    style: 'rubble',
    size: 110,
    angle: HALF_PI,
    stretch: 2.4,
    band: 140,
    bandTop: 60,
    core: 160,
    moss: true,
    darkAbove: 900,
    fringe: true,
    hangingVines: 6,
    crawlingVines: 4,
    trees: 1,
  },
  // Chips off the needles, bobbing at the surface or lost in the deep.
  floater('bob1', [[2520, 1465], [2560, 1430], [2640, 1438], [2668, 1490], [2625, 1548], [2548, 1540]]),
  floater('bob2', [[5060, 1470], [5100, 1440], [5170, 1446], [5190, 1498], [5150, 1550], [5080, 1540]], false),
  floater('bob3', [[8180, 1460], [8220, 1428], [8300, 1436], [8326, 1486], [8284, 1540], [8200, 1530]]),
  fragment('deep1', [[3760, 2200], [3810, 2150], [3910, 2158], [3950, 2220], [3890, 2280], [3790, 2270]]),
  fragment('deep2', [[6300, 2150], [6350, 2100], [6452, 2110], [6490, 2170], [6430, 2230], [6330, 2220]]),
];

export const needles: LevelLayout = {
  id: 'needles',
  width: W,
  seed: 777,
  masses,
  sand: [[1100, 8450]],
};
