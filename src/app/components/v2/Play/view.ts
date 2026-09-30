"use client";

import type { ArcadeInput, GameId } from "@/lib/arcade/types";

/**
 * One playable arcade mode, from the browser's side: the cabinet handles
 * phases, transcripts, publication and the leaderboard; a view supplies the
 * interaction mapping, renderer and stat panel for its own sim.
 *
 * Views are client-only by nature (canvas), but all game *state* still comes
 * from the pure sim modules in src/lib/arcade/games/.
 */
export type Palette = {
  ink: string; inkDeep: string; lime: string; limeDeep: string; mint: string;
  mintBright: string; navy: string; teal: string; tealDeep: string;
  white: string; gold: string; red: string; blue: string; slate: string;
};

export type Images = Record<string, HTMLImageElement | null>;

export type AimControls = { aim: number | null; direction: -1 | 0 | 1 };

export type GameView = {
  id: GameId;
  /** Cubear pose webp urls the cabinet preloads; most modes draw themselves. */
  assets: readonly string[];
  /** How the mode takes input: a held-aim paddle or per-tap events. */
  mode: "aim" | "tap";
  /** The per-tick tuple for an aim mode (rally). */
  input?(controls: AimControls): ArcadeInput;
  /** A tap: map the logical canvas point to this tick's input tuple or null. */
  tap?(x: number, y: number): ArcadeInput | null;
  /** Extra key handling (flap keys, hints); returns a tuple or null. */
  key?(event: KeyboardEvent): ArcadeInput | null;
  /** Draw the whole logical canvas (coordinates 480×640, scaled beforehand). */
  render(context: CanvasRenderingContext2D, state: unknown, images: Images, palette: Palette): void;
  /** The cabinet sidebar numbers: label keys resolve as V2.play.stats.<key>. */
  stats(state: unknown): Array<[key: string, value: string]>;
  /** The how-to sidebar keys, resolved under V2.play.games.<id>.* */
  helpKeys: readonly string[];
};

/** Move-aim input shared by the paddle modes; direction overrides the pointer. */
export function paddleAim(width: number, { aim, direction }: AimControls): ArcadeInput {
  if (direction < 0) return [0];
  if (direction > 0) return [width];
  return [aim ?? Math.round(width / 2)];
}
