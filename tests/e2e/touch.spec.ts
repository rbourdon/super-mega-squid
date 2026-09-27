import { expect, test, type Page } from '@playwright/test';
import { activeScenes, openMenu, sim, trackErrors, waitForSteps } from './helpers';

const touchVisible = (page: Page) =>
  page.evaluate(() => (window.__SMS__!.scene.getScene('Hud') as unknown as { touchLayer: { visible: boolean } }).touchLayer.visible);

async function tapPlay(page: Page): Promise<void> {
  // Play is always centred horizontally; find it through the menu scene rather than guessing its height.
  const point = await page.evaluate(() => {
    const menu = window.__SMS__!.scene.getScene('Menu');
    const play = menu.children.list
      .flatMap((o) => ('list' in o ? (o as unknown as { list: Phaser.GameObjects.GameObject[] }).list : [o]))
      .flatMap((o) => ('list' in o ? (o as unknown as { list: Phaser.GameObjects.GameObject[] }).list : [o]))
      .find((o) => (o as Phaser.GameObjects.Image).texture?.key === 'playbutton') as Phaser.GameObjects.Image;
    const m = play.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  });
  await page.touchscreen.tap(point.x, point.y);
  await expect.poll(() => activeScenes(page)).toEqual(['Levels']);
}

/** Tap a level card on the level select screen. */
async function tapLevel(page: Page, index: number): Promise<void> {
  const box = await page.evaluate((i) => {
    const scene = window.__SMS__!.scene.getScene('Levels') as unknown as { cards: Array<{ container: Phaser.GameObjects.Container }> };
    const b = scene.cards[i].container.getBounds();
    return { x: b.centerX, y: b.centerY };
  }, index);
  await page.touchscreen.tap(box.x, box.y);
  await expect.poll(() => activeScenes(page)).toEqual(['Game', 'Hud']);
}

test('plays with touch controls on a phone in landscape', async ({ page }) => {
  const errors = trackErrors(page);
  await openMenu(page);
  await tapPlay(page);
  await tapLevel(page, 0);
  await expect.poll(() => touchVisible(page)).toBe(true);

  // The squid starts in the sky with one air lunge available; tap LUNGE (bottom right).
  await sim(page, 'sim.player.canAirLunge = true; sim.teleportPlayer(3800, 900);');
  const viewport = page.viewportSize()!;
  const zoom = await page.evaluate(() => window.__SMS__!.scene.getScene('Hud').cameras.main.zoom);
  await page.touchscreen.tap(viewport.width - 70 * zoom, viewport.height - 62 * zoom);
  await expect.poll(() => sim<boolean>(page, 'return sim.player.canAirLunge;')).toBe(false);
  expect(errors).toEqual([]);
});

test('plays in portrait too', async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 412, height: 915 });
  await openMenu(page);
  await tapPlay(page);
  // Portrait stacks the level cards; pick the second one.
  await tapLevel(page, 1);
  expect(await sim<string>(page, 'return sim.level.id;')).toBe('arches');
  await waitForSteps(page, 60);
  expect(await sim<boolean>(page, 'return game.paused;')).toBe(false);
  await expect.poll(() => touchVisible(page)).toBe(true);
  // The world view keeps the squid a sensible size: at least ~540 world units across.
  const view = await sim<{ w: number; h: number }>(page, 'const c = game.cameras.main; return { w: c.width / c.zoom, h: c.height / c.zoom };');
  expect(view.w).toBeGreaterThanOrEqual(539);
  expect(view.w).toBeLessThan(700);
  expect(view.h).toBeGreaterThan(view.w);
  expect(errors).toEqual([]);
});
