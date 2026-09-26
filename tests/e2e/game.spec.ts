import { expect, test } from '@playwright/test';
import { activeScenes, openMenu, sim, trackErrors, waitForSteps } from './helpers';

test.describe('Super Mega Squid', () => {
  test('boots to the menu and starts a game from the keyboard', async ({ page }) => {
    const errors = trackErrors(page);
    await openMenu(page);
    await expect(page).toHaveTitle(/Super Mega Squid/);
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toEqual(['Game', 'Hud']);
    await waitForSteps(page, 60);
    const state = await sim<{ state: string; humans: number }>(page, 'return { state: sim.rules.state, humans: sim.rules.humansLeft };');
    expect(state).toEqual({ state: 'playing', humans: 35 });
    expect(errors).toEqual([]);
  });

  test('keyboard controls steer the squid', async ({ page }) => {
    const errors = trackErrors(page);
    await openMenu(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toContain('Game');
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
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toContain('Game');
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
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toContain('Game');
    await sim(page, 'sim.rules.rage = 1;');
    await expect.poll(() => activeScenes(page), { timeout: 30_000 }).toContain('Results');
    // A key mashed the moment the results appear must not skip them.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    expect(await activeScenes(page)).toContain('Results');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toEqual(['Game', 'Hud']);
    await waitForSteps(page, 10);
    expect(await sim<string>(page, 'return sim.rules.state;')).toBe('playing');
    const best = await page.evaluate(() => JSON.parse(localStorage.getItem('super-mega-squid:v1') ?? '{}').bestScore);
    expect(best).toBeGreaterThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test('eating the last human wins the game', async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => activeScenes(page)).toContain('Game');
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
