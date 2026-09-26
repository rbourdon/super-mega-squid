import { expect, test } from '@playwright/test';
import { activeScenes, openMenu, sim, trackErrors } from './helpers';

test('plays with touch controls on a phone', async ({ page }) => {
  const errors = trackErrors(page);
  await openMenu(page);
  const viewport = page.viewportSize()!;
  // The "RELEASE ME!" button sits in the middle of the menu.
  await page.touchscreen.tap(viewport.width / 2, viewport.height * 0.47);
  await expect.poll(() => activeScenes(page)).toEqual(['Game', 'Hud']);

  const touchVisible = () =>
    page.evaluate(() => (window.__SMS__!.scene.getScene('Hud') as unknown as { touchLayer: { visible: boolean } }).touchLayer.visible);
  await expect.poll(touchVisible).toBe(true);

  // The squid starts in the sky with one air lunge available; tap LUNGE (bottom right).
  await sim(page, 'sim.player.canAirLunge = true; sim.teleportPlayer(3800, 900);');
  const zoom = await page.evaluate(() => window.__SMS__!.scene.getScene('Hud').cameras.main.zoom);
  await page.touchscreen.tap(viewport.width - 70 * zoom, viewport.height - 62 * zoom);
  await expect.poll(() => sim<boolean>(page, 'return sim.player.canAirLunge;')).toBe(false);
  expect(errors).toEqual([]);
});
