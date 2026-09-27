/**
 * Fire Isle: a volcano rising out of the sea, its bare cone cracked with lava, a
 * lava lake in its crater and wooded shelves round its shore. Its hot roots hang
 * over glowing vents on the seabed. Floating isles and hot rocks all around.
 */
import type { MassDef } from '../lib/rock-art';
import { H, HALF_PI, W, boulder, floater, fragment, island, seabed, stump, type LevelLayout } from './common';

/** The glowing crater and the throat below it. */
const crater = (x: number, y: number) => y < 980 && Math.abs(x - 4990) < 170 + (y - 400) * 0.35;

const masses: MassDef[] = [
  seabed(W, [
    [0, 2740], [500, 2790], [1000, 2820], [1500, 2800], [2000, 2830], [2500, 2800], [2900, 2830], [3300, 2810],
    [3700, 2830], [4100, 2860], [4500, 2880], [4900, 2870], [5300, 2890], [5700, 2870], [6100, 2850], [6500, 2820],
    [6900, 2830], [7300, 2800], [7700, 2820], [8100, 2790], [8500, 2760], [W, 2740],
  ], { lava: (x, y) => x > 3700 && x < 6300 && y > 2830 }),
  // Vents glowing on the seabed under the volcano.
  stump('vent1', 4400, 170, 2620, { lava: () => true, sand: false }),
  stump('vent2', 5600, 190, 2600, { lava: () => true, sand: false }),
  {
    name: 'volcano',
    rings: [[
      // West slope, up to a wooded shelf at the shore.
      [3900, 1520], [3960, 1455], [4060, 1418], [4160, 1392], [4240, 1340], [4300, 1250], [4360, 1150], [4430, 1080],
      [4500, 1062],
      // The bare cone and its crater.
      [4560, 990], [4620, 885], [4680, 770], [4730, 660], [4770, 560], [4800, 475], [4830, 425], [4865, 448],
      [4890, 472], [5104, 472], [5128, 445], [5150, 400], [5185, 418], [5230, 520],
      [5280, 640], [5340, 760], [5410, 880], [5480, 985],
      // East shelves, down to the water.
      [5540, 1045], [5620, 1068], [5700, 1100], [5760, 1180], [5820, 1280], [5880, 1360], [5960, 1398], [6060, 1418],
      [6140, 1450], [6200, 1515],
      // Its hot roots, tapering under the sea, with teeth hanging towards the vents.
      [6230, 1600], [6220, 1700], [6180, 1820], [6110, 1950], [6020, 2060], [5900, 2170], [5750, 2260], [5600, 2320],
      [5410, 2365], [5370, 2480], [5330, 2372], [5200, 2392], [5000, 2402], [4800, 2382], [4640, 2348], [4600, 2455],
      [4560, 2340], [4400, 2300], [4250, 2240], [4100, 2150], [4000, 2060], [3920, 1950], [3860, 1820], [3840, 1700],
      [3860, 1600],
    ]],
    style: 'rubble',
    size: 115,
    angle: HALF_PI,
    stretch: 2.2,
    band: 160,
    bandTop: 100,
    core: 150,
    moss: true,
    mossBelow: 1120,
    darkAbove: 1050,
    lava: (x, y) => crater(x, y) || (y > 2200 && x > 3950 && x < 6050),
    // The lava lake in the crater.
    pools: [[[4880, 472], [5110, 472], [5086, 522], [5024, 556], [4962, 552], [4908, 518]]],
    fringe: true,
    hangingVines: 6,
    crawlingVines: 3,
    trees: 3,
  },
  boulder('boulder1', [[1640, 2805], [1660, 2748], [1722, 2724], [1788, 2740], [1812, 2800]]),
  boulder('boulder2', [[5020, 2870], [5040, 2812], [5108, 2790], [5176, 2808], [5196, 2875]]),
  boulder('boulder3', [[7420, 2805], [7440, 2750], [7502, 2728], [7566, 2744], [7586, 2800]]),
  {
    name: 'westHead',
    rings: [[
      [0, 960], [130, 940], [270, 965], [390, 1030], [480, 1120], [520, 1220], [490, 1320], [520, 1420], [590, 1540],
      [680, 1720], [780, 1920], [880, 2150], [980, 2400], [1060, 2620], [1100, 2790], [1100, H], [0, H],
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
      [W, 840], [9090, 830], [8970, 860], [8870, 940], [8800, 1040], [8780, 1160], [8820, 1280], [8770, 1400],
      [8700, 1560], [8630, 1780], [8560, 2050], [8500, 2350], [8450, 2620], [8420, 2780], [8420, H], [W, H],
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
  // Isles on the way to the volcano and beyond it; the nearest have been scorched.
  island('west1', 2050, 1060, 180, 150, { spikes: 1, trees: 1 }),
  island('west2', 2800, 800, 160, 130, { spikes: 2 }),
  island('east1', 7150, 960, 200, 170, { spikes: 2, trees: 1 }),
  island('east2', 7900, 720, 140, 120, { spikes: 1 }),
  island('hot1', 3700, 620, 110, 100, { spikes: 1, moss: false, vines: 0, extra: { darkAbove: H, lava: (_x, y) => y > 640 } }),
  island('hot2', 6300, 700, 120, 110, { spikes: 1, moss: false, vines: 0, extra: { darkAbove: H, lava: (_x, y) => y > 720 } }),
  // Hot rocks thrown out of the crater, and rocks at the surface.
  { ...fragment('bomb1', [[4460, 300], [4500, 262], [4570, 268], [4596, 316], [4552, 360], [4480, 350]]), darkAbove: H, lava: () => true },
  { ...fragment('bomb2', [[5500, 330], [5536, 296], [5600, 300], [5622, 346], [5584, 386], [5516, 378]]), darkAbove: H, lava: () => true },
  floater('bob1', [[1900, 1470], [1940, 1436], [2012, 1444], [2036, 1496], [1994, 1550], [1918, 1540]]),
  floater('bob2', [[7300, 1462], [7342, 1430], [7412, 1436], [7434, 1490], [7390, 1542], [7318, 1532]], false),
  fragment('deep1', [[2300, 2200], [2350, 2150], [2452, 2160], [2490, 2220], [2430, 2282], [2330, 2272]]),
  fragment('deep2', [[7650, 2240], [7700, 2190], [7802, 2200], [7840, 2262], [7780, 2322], [7680, 2312]]),
];

export const fireisle: LevelLayout = {
  id: 'fireisle',
  width: W,
  seed: 6660,
  masses,
  sand: [
    [1100, 3500],
    [6500, 8420],
  ],
};
