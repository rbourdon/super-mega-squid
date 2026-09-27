/**
 * Coral Shallows: a raised reef thick with weed and coral, with a table reef to hide
 * under, an arch, channels and a blue hole, and little wooded cays in the shallows.
 */
import type { Pt } from '../lib/raster';
import type { MassDef } from '../lib/rock-art';
import { H, HALF_PI, W, boulder, floater, island, seabed, type LevelLayout } from './common';

/** A reef rock: packed stones under a sandy, planted top. */
function reef(name: string, outline: Pt[]): MassDef {
  return { name, rings: [outline], style: 'packed', size: 90, angle: 0, stretch: 2.2, crag: false, sand: true };
}

const masses: MassDef[] = [
  seabed(W, [
    [0, 2330], [700, 2360], [1100, 2390], [1500, 2370], [1800, 2330], [2100, 2300], [2400, 2310], [2700, 2330],
    [2950, 2380], [3080, 2480], [3160, 2650], [3260, 2800], [3450, 2850], [3650, 2840], [3800, 2720], [3880, 2560],
    [3960, 2420], [4150, 2360], [4500, 2330], [4800, 2340], [5100, 2320], [5400, 2340], [5650, 2380], [5800, 2460],
    [5900, 2620], [6000, 2800], [6200, 2890], [6450, 2900], [6650, 2880], [6800, 2760], [6880, 2580], [6960, 2440],
    [7100, 2370], [7500, 2330], [7900, 2350], [8300, 2370], [W, 2370],
  ]),
  // A table reef on a thick stem, to hide under.
  reef('table', [
    [2180, 2090], [2230, 2020], [2320, 1985], [2420, 1970], [2520, 1978], [2620, 1965], [2700, 1990], [2760, 2040],
    [2740, 2090], [2660, 2110], [2600, 2130], [2560, 2200], [2545, 2310], [2380, 2310], [2375, 2200], [2330, 2135],
    [2270, 2120], [2210, 2115],
  ]),
  // A broken arch over the reef flat (whole, it would seal off the water under it).
  reef('arch', [
    [4380, 2335], [4400, 2200], [4440, 2100], [4520, 2030], [4640, 1990], [4760, 1985], [4880, 2010], [4970, 2070],
    [5030, 2150], [5045, 2185], [5012, 2200], [4975, 2190], [4930, 2175], [4870, 2150], [4770, 2125], [4660, 2130],
    [4570, 2175], [4510, 2250], [4490, 2335],
  ]),
  // Coral heads and boulders on the flats.
  reef('head1', [[1500, 2380], [1530, 2260], [1600, 2200], [1690, 2195], [1750, 2250], [1770, 2360]]),
  reef('head2', [[5350, 2345], [5370, 2250], [5430, 2190], [5520, 2180], [5590, 2220], [5620, 2350]]),
  reef('head3', [[7620, 2340], [7640, 2230], [7710, 2160], [7800, 2150], [7880, 2200], [7910, 2345]]),
  reef('head4', [[8250, 2375], [8270, 2300], [8330, 2260], [8400, 2262], [8440, 2310], [8450, 2380]]),
  // Pinnacles in the channel and the blue hole.
  {
    name: 'pinnacle1',
    rings: [[[3380, 2860], [3410, 2640], [3440, 2480], [3470, 2380], [3500, 2350], [3530, 2420], [3560, 2600], [3600, 2860]]],
    style: 'packed',
    size: 75,
    angle: HALF_PI,
    stretch: 3,
    sand: true,
  },
  {
    name: 'pinnacle2',
    rings: [[[6380, 2910], [6410, 2700], [6440, 2530], [6470, 2420], [6505, 2390], [6540, 2460], [6570, 2640], [6610, 2910]]],
    style: 'packed',
    size: 75,
    angle: HALF_PI,
    stretch: 3,
    sand: true,
  },
  boulder('boulder1', [[2900, 2385], [2918, 2330], [2980, 2308], [3040, 2326], [3060, 2400]]),
  boulder('boulder2', [[6180, 2895], [6200, 2835], [6268, 2812], [6336, 2832], [6356, 2900]]),
  boulder('boulder3', [[7200, 2365], [7220, 2312], [7280, 2290], [7340, 2308], [7360, 2362]]),
  {
    // A low, wooded beach headland.
    name: 'westShore',
    rings: [[
      [0, 1150], [140, 1140], [300, 1170], [450, 1230], [580, 1300], [700, 1380], [800, 1460], [880, 1540],
      [960, 1640], [1060, 1800], [1160, 1980], [1250, 2160], [1300, 2300], [1320, 2400], [1320, H], [0, H],
    ]],
    style: 'rubble',
    size: 105,
    angle: HALF_PI,
    stretch: 2.3,
    band: 140,
    bandTop: 50,
    core: 140,
    moss: true,
    fringe: true,
    hangingVines: 6,
    crawlingVines: 4,
    trees: 3,
    sand: true,
  },
  {
    name: 'eastShore',
    rings: [[
      [W, 1080], [9050, 1075], [8900, 1110], [8760, 1180], [8660, 1270], [8580, 1370], [8520, 1480], [8470, 1620],
      [8420, 1800], [8380, 2000], [8350, 2200], [8340, 2380], [8340, H], [W, H],
    ]],
    style: 'rubble',
    size: 105,
    angle: HALF_PI,
    stretch: 2.3,
    band: 140,
    bandTop: 50,
    core: 140,
    moss: true,
    fringe: true,
    hangingVines: 6,
    crawlingVines: 4,
    trees: 2,
    sand: true,
  },
  // Wooded cays sitting in the shallows, and a rock or two above them.
  island('cay1', 2050, 1370, 220, 200, { spikes: 1, trees: 1, vines: 6 }),
  island('cay2', 4150, 1340, 270, 240, { spikes: 2, trees: 2, vines: 6 }),
  island('cay3', 5400, 1395, 190, 170, { spikes: 1, trees: 1, vines: 6 }),
  island('cay4', 7000, 1330, 290, 250, { spikes: 2, trees: 2, vines: 6 }),
  island('cay5', 7950, 1400, 150, 150, { spikes: 1, trees: 1, vines: 6 }),
  island('sky1', 3150, 830, 120, 110, { spikes: 1, vines: 12 }),
  island('sky2', 6050, 900, 130, 110, { spikes: 1, vines: 12 }),
  floater('bob1', [[3380, 1470], [3420, 1438], [3490, 1444], [3512, 1496], [3470, 1548], [3398, 1538]], false),
];

export const shallows: LevelLayout = {
  id: 'shallows',
  width: W,
  seed: 2024,
  masses,
  sand: [[900, 8600]],
  plantSpacing: [4, 24],
};
