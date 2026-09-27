/** Draw order of world layers (higher is in front). */
export const Depth = {
  Sky: 0,
  FarMountains: 1,
  Mountains: 2,
  Clouds: 3,
  Props: 9,
  Enemies: 10,
  Eggs: 11,
  Projectiles: 12,
  Tentacles: 14,
  Player: 15,
  // Terrain art sits in front of creatures, as in the original.
  Terrain: 20,
  Effects: 22,
  Water: 30,
  SurfaceEffects: 31,
  Popups: 40,
} as const;
