import { expect, test } from '@playwright/test';
import { activeScenes, openMenu, sim, startLevel, trackErrors, waitForSteps } from './helpers';

test.describe('Super Mega Squid', () => {
  test('boots to the menu and starts a game from the keyboard', async ({ page }) => {
    const errors = trackErrors(page);
    await openMenu(page);
    await expect(page).toHaveTitle(/Super Mega Squid/);
    await startLevel(page, 0);
    await waitForSteps(page, 60);
    const state = await sim<{ state: string; humans: number; level: string }>(
      page,
      'return { state: sim.rules.state, humans: sim.rules.humansLeft, level: sim.level.id };',
    );
    expect(state).toEqual({ state: 'playing', humans: 35, level: 'cove' });
    expect(errors).toEqual([]);
  });

  test('keyboard controls steer the squid', async ({ page }) => {
    const errors = trackErrors(page);
    await openMenu(page);
    await startLevel(page, 0);
    await sim(page, 'sim.teleportPlayer(3400, 2000);');
    const startX = await sim<number>(page, 'return sim.player.x;');
    await page.keyboard.down('d');
    await waitForSteps(page, 60);
    await page.keyboard.up('d');
    const endX = await sim<number>(page, 'return sim.player.x;');
    expect(endX - startX).toBeGreaterThan(250);

    await page.keyboard.press('q');
    await expect.poll(() => sim<number>(page, 'return sim.player.spinCooldown;')).toBeGreaterThan(0);
    await page.keyboard.press('e');
    await expect.poll(() => sim<number>(page, 'return sim.player.eggCooldown;')).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('pauses and resumes with Escape', async ({ page }) => {
    await openMenu(page);
    await startLevel(page, 0);
    await waitForSteps(page, 10);
    await page.keyboard.press('Escape');
    await expect.poll(() => sim<boolean>(page, 'return game.paused;')).toBe(true);
    const steps = await sim<number>(page, 'return sim.steps;');
    await page.waitForTimeout(500);
    expect(await sim<number>(page, 'return sim.steps;')).toBe(steps);
    await page.keyboard.press('Escape');
    await expect.poll(() => sim<boolean>(page, 'return game.paused;')).toBe(false);
    await waitForSteps(page, 10);
  });

  test('shows results when rage runs out and can start again', async ({ page }) => {
    const errors = trackErrors(page);
    await openMenu(page);
    await startLevel(page, 0);
    // Freeze the game loop the moment the results appear, so the key press below is
    // guaranteed to land inside their input delay however slow the machine is.
    await sim(page, `game.scene.get('Results').events.once('create', () => game.game.loop.sleep()); sim.rules.rage = 1;`);
    await expect.poll(() => activeScenes(page), { timeout: 30_000 }).toContain('Results');
    await expect.poll(() => page.evaluate(() => window.__SMS__!.loop.running)).toBe(false);
    // A key mashed the moment the results appear must not skip them.
    await page.keyboard.press('Enter');
    await page.evaluate(() => window.__SMS__!.loop.wake(true));
    await page.waitForTimeout(300);
    expect(await activeScenes(page)).toContain('Results');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toEqual(['Game', 'Hud']);
    await waitForSteps(page, 10);
    expect(await sim<string>(page, 'return sim.rules.state;')).toBe('playing');
    const best = await page.evaluate(() => JSON.parse(localStorage.getItem('super-mega-squid:v1') ?? '{}').levels?.cove?.bestScore);
    expect(best).toBeGreaterThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test('picks the level from the level select and keeps it for the next game', async ({ page }) => {
    const errors = trackErrors(page);
    await openMenu(page);
    // Escape backs out of the level select.
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toEqual(['Levels']);
    await page.keyboard.press('Escape');
    await expect.poll(() => activeScenes(page)).toEqual(['Menu']);

    // Choose with keys pressed within a single frame: each must count once.
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toEqual(['Levels']);
    await page.evaluate(() => window.__SMS__!.loop.sleep());
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.evaluate(() => window.__SMS__!.loop.wake(true));
    await expect.poll(() => activeScenes(page)).toEqual(['Game', 'Hud']);
    await waitForSteps(page, 30);
    const level = await sim<{ id: string; width: number }>(page, 'return { id: sim.level.id, width: sim.terrain.width };');
    expect(level).toEqual({ id: 'arches', width: 9216 });

    // Play again stays on the same level.
    await sim(page, 'sim.rules.rage = 1;');
    await expect.poll(() => activeScenes(page), { timeout: 30_000 }).toContain('Results');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toEqual(['Game', 'Hud']);
    await waitForSteps(page, 10);
    expect(await sim<string>(page, 'return sim.level.id;')).toBe('arches');

    // Records are kept per level, and the level select opens on the level played last.
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('super-mega-squid:v1') ?? '{}'));
    expect(saved.lastLevel).toBe('arches');
    expect(Object.keys(saved.levels)).toEqual(['arches']);
    expect(errors).toEqual([]);
  });

  test('moves around the level grid by rows and columns', async ({ page }) => {
    const errors = trackErrors(page);
    await openMenu(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toEqual(['Levels']);
    const state = () =>
      page.evaluate(() => {
        const scene = window.__SMS__!.scene.getScene('Levels') as unknown as { selected: number; blurb: { text: string } };
        return { selected: scene.selected, blurb: scene.blurb.text };
      });
    // Four across in landscape: down a row, right, up a row, and down into the short last row.
    const press = async (key: string, selected: number) => {
      await page.keyboard.press(key);
      await expect.poll(async () => (await state()).selected).toBe(selected);
    };
    await press('ArrowDown', 4);
    await press('ArrowRight', 5);
    await press('ArrowUp', 1);
    await press('ArrowRight', 2);
    await press('ArrowRight', 3);
    await press('ArrowDown', 6);
    expect((await state()).blurb).toContain('volcano');
    await press('ArrowLeft', 5);
    await press('ArrowLeft', 4);
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toEqual(['Game', 'Hud']);
    await waitForSteps(page, 30);
    expect(await sim<string>(page, 'return sim.level.id;')).toBe('needles');
    // Its tiles were loaded before play started.
    const loaded = await page.evaluate(() => window.__SMS__!.textures.exists('needles:tile_0_0'));
    expect(loaded).toBe(true);
    expect(errors).toEqual([]);
  });

  test('eating the last human wins the game', async ({ page }) => {
    await openMenu(page);
    await startLevel(page, 0);
    await sim(
      page,
      `sim.rules.humansEaten = sim.rules.population - 1;
       sim.teleportPlayer(3800, 2000, 650, 0);
       sim.spawnEnemy('diver', 3900, 2000, 0.01);`,
    );
    await expect.poll(() => sim<string>(page, 'return sim.rules.state;')).toBe('won');
    await expect.poll(() => activeScenes(page), { timeout: 30_000 }).toContain('Results');
  });
});
