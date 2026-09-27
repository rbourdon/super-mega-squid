/**
 * Sky Isles: a great floating island, crowned with trees, ringed by tiers of
 * smaller isles to climb, over an open sea between two low headlands.
 */
import type { MassDef } from '../lib/rock-art';
import { H, HALF_PI, boulder, floater, fragment, island, seabed, type LevelLayout } from './common';

const W = 9728;

const masses: MassDef[] = [
  seabed(W, [
    [0, 2700], [400, 2760], [900, 2800], [1300, 2820], [1700, 2790], [1900, 2640], [1940, 2560], [1985, 2600], [2030, 2780],
    [2500, 2810], [3000, 2790], [3500, 2820], [4000, 2830], [4500, 2800], [4900, 2770], [5300, 2800], [5700, 2830],
    [6100, 2800], [6300, 2700], [6340, 2580], [6380, 2560], [6420, 2650], [6460, 2790], [6900, 2810], [7400, 2780],
    [7900, 2800], [8400, 2760], [8800, 2720], [9300, 2700], [W, 2700],
  ]),
  boulder('boulder1', [[3120, 2800], [3140, 2745], [3200, 2718], [3262, 2730], [3290, 2790]]),
  boulder('boulder2', [[7640, 2790], [7662, 2730], [7724, 2708], [7790, 2728], [7810, 2785]]),
  {
    // A low headland: open sky above, a mossy top with a tree.
    name: 'westHead',
    rings: [[
      [0, 1010], [110, 985], [250, 1000], [370, 1060], [455, 1140], [520, 1240], [500, 1360], [470, 1470], [505, 1600],
      [560, 1760], [650, 1950], [770, 2150], [900, 2400], [1040, 2640], [1150, 2800], [1150, H], [0, H],
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
    crawlingVines: 4,
    trees: 1,
  },
  {
    name: 'eastHead',
    rings: [[
      [W, 890], [9620, 885], [9500, 925], [9400, 1005], [9320, 1105], [9290, 1250], [9320, 1400], [9270, 1560],
      [9200, 1800], [9100, 2100], [8970, 2400], [8870, 2650], [8800, 2800], [8800, H], [W, H],
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
    crawlingVines: 4,
    trees: 1,
  },
  // The great isle.
  island('motherIsle', 4860, 560, 900, 540, { spikes: 4, crown: 90, trees: 3, vines: 7 }),
  // Tiers of smaller isles climbing up to it from both sides.
  island('west1', 1700, 1200, 170, 120, { spikes: 1 }),
  island('west2', 2250, 985, 150, 110, { spikes: 1 }),
  island('west3', 2800, 760, 185, 150, { spikes: 2, trees: 1 }),
  island('west4', 3350, 1150, 140, 100, { spikes: 1 }),
  island('east1', 6400, 800, 175, 135, { spikes: 2, trees: 1 }),
  island('east2', 6950, 1060, 160, 110, { spikes: 1 }),
  island('east3', 7500, 780, 205, 160, { spikes: 2, trees: 1 }),
  island('east4', 8100, 1180, 150, 100, { spikes: 1 }),
  // Pebbles high in the sky.
  island('high1', 3900, 380, 90, 80, { spikes: 1, vines: 12 }),
  island('high2', 6000, 430, 100, 90, { spikes: 1, vines: 12 }),
  // Rocks bobbing at the surface, and a couple in the deep.
  floater('bob1', [[1330, 1470], [1370, 1432], [1450, 1440], [1480, 1500], [1440, 1560], [1360, 1552]]),
  floater('bob2', [[7160, 1462], [7210, 1430], [7280, 1438], [7302, 1492], [7255, 1545], [7180, 1535]]),
  floater('bob3', [[8460, 1452], [8500, 1420], [8570, 1428], [8590, 1480], [8545, 1532], [8475, 1522]]),
  fragment('deep1', [[2950, 2150], [3000, 2100], [3100, 2108], [3140, 2168], [3080, 2230], [2980, 2220]]),
  fragment('deep2', [[6560, 2240], [6610, 2190], [6712, 2200], [6752, 2262], [6690, 2320], [6590, 2310]]),
];

export const skyisles: LevelLayout = {
  id: 'skyisles',
  width: W,
  seed: 31337,
  masses,
  sand: [
    [1150, 3600],
    [3700, 8800],
  ],
};
