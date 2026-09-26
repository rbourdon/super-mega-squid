import { afterEach, describe, expect, it, vi } from 'vitest';

const KEY = 'super-mega-squid:v1';

/** Fresh copy of the storage module (it caches what it loaded) over an in-memory localStorage. */
async function withStorage(initial?: object) {
  const items = new Map<string, string>();
  if (initial) items.set(KEY, JSON.stringify(initial));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  });
  vi.resetModules();
  const storage = await import('../../src/storage');
  return { storage, saved: () => JSON.parse(items.get(KEY) ?? '{}') };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('storage', () => {
  it('keeps records saved before levels existed as records for the first level', async () => {
    const { storage } = await withStorage({ musicOn: false, sfxOn: true, bestScore: 4200, bestHumans: 12, bestCombo: 9, wins: 1, fastestWin: 300 });
    expect(storage.load().musicOn).toBe(false);
    expect(storage.levelRecords('cove')).toEqual({ bestScore: 4200, bestHumans: 12, bestCombo: 9, wins: 1, fastestWin: 300 });
    expect(storage.levelRecords('arches').bestScore).toBe(0);
  });

  it('records each level separately', async () => {
    const { storage, saved } = await withStorage();
    const run = { score: 1000, humans: 35, bestCombo: 4, won: true, time: 200 };
    expect(storage.recordRun('arches', run)).toEqual({ newBest: true, fastest: true });
    expect(storage.recordRun('arches', { ...run, score: 900, time: 250 })).toEqual({ newBest: false, fastest: false });
    expect(storage.recordRun('cove', { ...run, score: 500, won: false })).toEqual({ newBest: true, fastest: false });
    expect(storage.levelRecords('arches')).toEqual({ bestScore: 1000, bestHumans: 35, bestCombo: 4, wins: 2, fastestWin: 200 });
    expect(storage.levelRecords('cove')).toMatchObject({ bestScore: 500, wins: 0, fastestWin: 0 });
    expect(Object.keys(saved().levels).sort()).toEqual(['arches', 'cove']);
  });
});
