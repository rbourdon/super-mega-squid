# Source art

Inputs for the asset pipeline. None of this is shipped directly; the game loads the processed files in `public/assets`.

- `level/worldpixel.png`: terrain art. Its alpha channel defines the level collision.
- `level/veggiespixel.png`: decorative vegetation drawn over the terrain.
- `sky/skyslice2.png`: the translucent sky gradient (flattened over white by the level script). `skyslice.png` is an older variant.
- `audio/`: original WAV sound effects and the theme song.
- `unused/`: art from the 2013 build that the game does not use (including the "February preview edition" menu bar).

Rebuild with `npm run assets:level` and `npm run assets:audio`.
