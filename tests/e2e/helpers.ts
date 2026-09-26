import { expect, type Page } from '@playwright/test';

/** Collect uncaught errors and console errors so tests can assert a clean run. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

export async function openMenu(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__SMS__?.scene.isActive('Menu'), null, { timeout: 60_000 });
}

export async function activeScenes(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    ['Boot', 'Menu', 'Game', 'Hud', 'Results'].filter((key) => window.__SMS__?.scene.isActive(key)),
  );
}

/** Evaluate against the running simulation (window.__SMS__ is exposed by main.ts). */
export async function sim<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(`(() => { const game = window.__SMS__.scene.getScene('Game'); const sim = game.sim; ${fn} })()`);
}

export async function waitForSteps(page: Page, steps: number): Promise<void> {
  const start = await sim<number>(page, 'return sim.steps;');
  await expect.poll(() => sim<number>(page, 'return sim.steps;'), { timeout: 30_000 }).toBeGreaterThan(start + steps);
}
