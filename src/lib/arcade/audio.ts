"use client";

/**
 * Arcade sound effects — a tiny WebAudio synthesizer instead of sampled
 * .wav files. Two reasons: the old course repos ship sounds ripped from
 * commercial games (they must not ride along), and most arcade blips are
 * one-oscillator effects that synthesize cleanly.
 *
 * The context is created lazily inside the first user gesture (a click or a
 * key press on the cabinet) — the same rule MusicProvider follows, because a
 * suspended context would otherwise play silence forever. Per-event patches
 * are tiny envelopes, no scheduling: each call schedules its own nodes.
 */

type Patch =
  | { shape: "sine" | "square" | "triangle" | "sawtooth"; from: number; to: number; seconds: number; sweep: "up" | "down" }
  | { noise: true; seconds: number };

type Category = "tap" | "hit" | "score" | "reward" | "warn" | "fail" | "fanfare" | "whoosh";

const PATCHES: Record<Category, Patch> = {
  tap: { shape: "sine", from: 620, to: 860, seconds: 0.07, sweep: "up" },
  hit: { shape: "triangle", from: 480, to: 320, seconds: 0.06, sweep: "down" },
  score: { shape: "sine", from: 560, to: 1060, seconds: 0.16, sweep: "up" },
  reward: { shape: "triangle", from: 640, to: 1180, seconds: 0.24, sweep: "up" },
  warn: { shape: "square", from: 340, to: 220, seconds: 0.18, sweep: "down" },
  fail: { shape: "sawtooth", from: 260, to: 90, seconds: 0.5, sweep: "down" },
  fanfare: { shape: "square", from: 520, to: 1040, seconds: 0.62, sweep: "up" },
  whoosh: { shape: "sine", from: 900, to: 220, seconds: 0.3, sweep: "down" },
};

/** One name per emitted sim effect; the fallback is a hit. */
const CATEGORIES: Record<string, Category> = {
  serve: "whoosh", paddle: "hit", wall: "tap", point: "score", block: "hit",
  concede: "warn", win: "fanfare", lose: "fail", miss: "fail",
  brick: "hit", locked: "warn", unlock: "reward", key: "reward",
  "heart-up": "reward", multiball: "reward", level: "fanfare",
  swap: "tap", nomatch: "warn", hint: "tap", pop: "score", score: "reward",
};

const STORAGE_KEY = "cusec-arcade-sfx";

export class ArcadeAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;

  constructor() {
    if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "off") this.enabled = false;
  }

  /** Must be called from inside a user gesture the first time. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const context = new Ctor();
      const master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      this.context = context;
      this.master = master;
      const length = Math.floor(context.sampleRate * 0.12);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      this.noise = buffer;
    }
    if (this.context.state === "suspended") void this.context.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  }

  /** Play the pending sim effects. The server replay ignores these entirely. */
  play(_gameId: string, effects: readonly string[]): void {
    if (!this.enabled || !this.context || !this.master) return;
    if (this.context.state === "suspended") void this.context.resume();
    const now = this.context.currentTime;
    let offset = 0;
    for (const effect of effects) {
      const category = CATEGORIES[effect] ?? "hit";
      this.scheduled(category, now + offset);
      offset += category === "fanfare" || category === "fail" ? 0.7 : 0.04;
    }
  }

  private scheduled(category: Category, when: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const patch = PATCHES[category];
    if ("noise" in patch) {
      const source = context.createBufferSource();
      if (this.noise) {
        source.buffer = this.noise;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.4, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + patch.seconds);
        source.connect(gain).connect(master);
        source.start(when);
      }
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = patch.shape;
    const swept = patch.sweep === "up" ? Math.max(patch.from, patch.to) : Math.min(patch.from, patch.to);
    const min = patch.sweep === "up" ? patch.from : patch.to;
    oscillator.frequency.setValueAtTime(min, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, swept), when + patch.seconds);
    gain.gain.setValueAtTime(0.18, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + patch.seconds);
    oscillator.connect(gain).connect(master);
    oscillator.start(when);
    oscillator.stop(when + patch.seconds + 0.02);
  }
}
