import type Phaser from 'phaser';
import type { SoundKey } from './assets';
import { load, save } from './storage';

type Sound = Phaser.Sound.BaseSound & { volume: number; setVolume(v: number): unknown };

const MUSIC_VOLUME = 0.3;
const AMBIENCE_VOLUME = 0.35;

/**
 * Central audio control: music, looping ambience (wind above water,
 * muffled underwater drone below, which the original set up but never used),
 * and one-shot effects, with persisted on/off switches.
 */
export class AudioDirector {
  private music: Sound | null = null;
  private wind: Sound | null = null;
  private underwater: Sound | null = null;
  private windLevel = 0;
  private underwaterLevel = 0;
  private lastPlayed = new Map<SoundKey, number>();
  /** Playback rate applied to every effect (lowered in slow motion). */
  rate = 1;

  constructor(private readonly manager: Phaser.Sound.BaseSoundManager) {}

  get musicOn(): boolean {
    return load().musicOn;
  }

  get sfxOn(): boolean {
    return load().sfxOn;
  }

  toggleMusic(): boolean {
    const on = !this.musicOn;
    save({ musicOn: on });
    if (on) this.startMusic();
    else this.music?.setVolume(0);
    return on;
  }

  toggleSfx(): boolean {
    const on = !this.sfxOn;
    save({ sfxOn: on });
    if (!on) {
      this.wind?.setVolume(0);
      this.underwater?.setVolume(0);
    }
    return on;
  }

  startMusic(): void {
    if (!this.music) {
      this.music = this.manager.add('theme', { loop: true, volume: 0 }) as Sound;
      this.music.play();
    }
    this.music.setVolume(this.musicOn ? MUSIC_VOLUME : 0);
  }

  /** Play a one-shot effect. `minGap` throttles rapid repeats of the same sound. */
  play(key: SoundKey, volume = 1, options: { rate?: number; detune?: number; minGap?: number } = {}): void {
    if (!this.sfxOn || volume <= 0) return;
    const now = performance.now();
    const gap = options.minGap ?? 40;
    const last = this.lastPlayed.get(key) ?? -Infinity;
    if (now - last < gap) return;
    this.lastPlayed.set(key, now);
    this.manager.play(key, { volume: Math.min(1, volume), rate: (options.rate ?? 1) * this.rate, detune: options.detune ?? 0 });
  }

  startAmbience(): void {
    if (!this.wind) {
      this.wind = this.manager.add('wind', { loop: true, volume: 0 }) as Sound;
      this.wind.play();
    }
    if (!this.underwater) {
      this.underwater = this.manager.add('underwater', { loop: true, volume: 0 }) as Sound;
      this.underwater.play();
    }
  }

  /** Crossfade the ambient loops towards the squid's surroundings. */
  updateAmbience(dt: number, underwater: boolean, altitude: number): void {
    const targetWind = underwater ? 0 : Math.min(1, 0.35 + altitude / 900);
    const targetUnder = underwater ? 1 : 0;
    const k = 1 - Math.exp(-4 * dt);
    this.windLevel += (targetWind - this.windLevel) * k;
    this.underwaterLevel += (targetUnder - this.underwaterLevel) * k;
    const scale = this.sfxOn ? AMBIENCE_VOLUME : 0;
    this.wind?.setVolume(this.windLevel * scale * 0.8);
    this.underwater?.setVolume(this.underwaterLevel * scale);
    // Muffle the music a little underwater.
    if (this.music && this.musicOn) this.music.setVolume(MUSIC_VOLUME * (1 - 0.35 * this.underwaterLevel));
  }

  stopAmbience(): void {
    this.wind?.destroy();
    this.underwater?.destroy();
    this.wind = null;
    this.underwater = null;
    this.windLevel = 0;
    this.underwaterLevel = 0;
    if (this.music && this.musicOn) this.music.setVolume(MUSIC_VOLUME);
  }
}

let director: AudioDirector | null = null;

export function audio(game: Phaser.Game): AudioDirector {
  if (!director) director = new AudioDirector(game.sound);
  return director;
}
