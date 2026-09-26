import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build can be hosted from any sub-path (e.g. GitHub Pages).
  base: './',
  build: {
    target: 'es2022',
    // Phaser alone is ~1.2 MB minified; that's expected for a game bundle.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
