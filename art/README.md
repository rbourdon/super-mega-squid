# Source art

Inputs for the asset pipeline. None of this is shipped directly; the game loads the processed files in `public/assets`.

- `levels/<id>/worldpixel.png`: a level's terrain art. Its alpha channel defines the level collision.
- `levels/<id>/veggiespixel.png`: decorative vegetation drawn over the terrain.
- `levels/cove/`: the original 2013 level.
- `levels/arches/`: Arch Rock, generated in the original's style by `scripts/generate-arches.ts` and
  `scripts/lib/rock-art.ts` (`npm run assets:arches`), using plants and trees cut out of `levels/cove/`.
  Edit the generator rather than these images, or they will be overwritten the next time it runs.
- `sky/skyslice2.png`: the translucent sky gradient (flattened over white by the level script). `skyslice.png` is an older variant.
- `audio/`: original WAV sound effects and the theme song.
- `unused/`: art from the 2013 build that the game does not use (including the "February preview edition" menu bar).

Rebuild with `npm run assets:level` and `npm run assets:audio`.
