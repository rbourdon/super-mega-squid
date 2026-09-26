/** Persistent settings and records. Storage can be unavailable (private mode), so every access is guarded. */

const KEY = 'super-mega-squid:v1';

export interface SaveData {
  musicOn: boolean;
  sfxOn: boolean;
  bestScore: number;
  bestHumans: number;
  bestCombo: number;
  wins: number;
  /** Fastest victory in seconds (0 when never won). */
  fastestWin: number;
}

const DEFAULTS: SaveData = {
  musicOn: true,
  sfxOn: true,
  bestScore: 0,
  bestHumans: 0,
  bestCombo: 0,
  wins: 0,
  fastestWin: 0,
};

let cache: SaveData | null = null;

export function load(): SaveData {
  if (cache) return cache;
  let data: SaveData = { ...DEFAULTS };
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) data = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch {
    // Ignore unavailable or corrupt storage.
  }
  cache = data;
  return data;
}

export function save(patch: Partial<SaveData>): SaveData {
  const data = { ...load(), ...patch };
  cache = data;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
  } catch {
    // Settings still apply for this session.
  }
  return data;
}

export interface RunResult {
  score: number;
  humans: number;
  bestCombo: number;
  won: boolean;
  time: number;
}

/** Record a finished run; returns which records were beaten. */
export function recordRun(run: RunResult): { newBest: boolean; fastest: boolean } {
  const data = load();
  const newBest = run.score > data.bestScore;
  const fastest = run.won && (data.fastestWin === 0 || run.time < data.fastestWin);
  save({
    bestScore: Math.max(data.bestScore, run.score),
    bestHumans: Math.max(data.bestHumans, run.humans),
    bestCombo: Math.max(data.bestCombo, run.bestCombo),
    wins: data.wins + (run.won ? 1 : 0),
    fastestWin: fastest ? run.time : data.fastestWin,
  });
  return { newBest, fastest };
}
