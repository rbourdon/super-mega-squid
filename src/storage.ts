/** Persistent settings and records. Storage can be unavailable (private mode), so every access is guarded. */

const KEY = 'super-mega-squid:v1';
/** Records saved before there was more than one level belong to the first one. */
const LEGACY_LEVEL = 'cove';

export interface LevelRecords {
  bestScore: number;
  bestHumans: number;
  bestCombo: number;
  wins: number;
  /** Fastest victory in seconds (0 when never won). */
  fastestWin: number;
}

export interface SaveData {
  musicOn: boolean;
  sfxOn: boolean;
  /** The level picked last, offered first next time. */
  lastLevel: string;
  levels: Record<string, LevelRecords>;
}

const NO_RECORDS: LevelRecords = { bestScore: 0, bestHumans: 0, bestCombo: 0, wins: 0, fastestWin: 0 };

const DEFAULTS: SaveData = {
  musicOn: true,
  sfxOn: true,
  lastLevel: LEGACY_LEVEL,
  levels: {},
};

let cache: SaveData | null = null;

export function load(): SaveData {
  if (cache) return cache;
  let data: SaveData = { ...DEFAULTS, levels: {} };
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) data = migrate(JSON.parse(raw) as Partial<SaveData> & Partial<LevelRecords>);
  } catch {
    // Ignore unavailable or corrupt storage.
  }
  cache = data;
  return data;
}

function migrate(raw: Partial<SaveData> & Partial<LevelRecords>): SaveData {
  const levels = { ...(raw.levels ?? {}) };
  if (typeof raw.bestScore === 'number' && !levels[LEGACY_LEVEL]) {
    levels[LEGACY_LEVEL] = {
      bestScore: raw.bestScore,
      bestHumans: raw.bestHumans ?? 0,
      bestCombo: raw.bestCombo ?? 0,
      wins: raw.wins ?? 0,
      fastestWin: raw.fastestWin ?? 0,
    };
  }
  return {
    musicOn: raw.musicOn ?? DEFAULTS.musicOn,
    sfxOn: raw.sfxOn ?? DEFAULTS.sfxOn,
    lastLevel: raw.lastLevel ?? DEFAULTS.lastLevel,
    levels,
  };
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

export function levelRecords(level: string): LevelRecords {
  return { ...NO_RECORDS, ...load().levels[level] };
}

export interface RunResult {
  score: number;
  humans: number;
  bestCombo: number;
  won: boolean;
  time: number;
}

/** Record a finished run on a level; returns which records were beaten. */
export function recordRun(level: string, run: RunResult): { newBest: boolean; fastest: boolean } {
  const old = levelRecords(level);
  const newBest = run.score > old.bestScore;
  const fastest = run.won && (old.fastestWin === 0 || run.time < old.fastestWin);
  const updated: LevelRecords = {
    bestScore: Math.max(old.bestScore, run.score),
    bestHumans: Math.max(old.bestHumans, run.humans),
    bestCombo: Math.max(old.bestCombo, run.bestCombo),
    wins: old.wins + (run.won ? 1 : 0),
    fastestWin: fastest ? run.time : old.fastestWin,
  };
  save({ levels: { ...load().levels, [level]: updated } });
  return { newBest, fastest };
}
