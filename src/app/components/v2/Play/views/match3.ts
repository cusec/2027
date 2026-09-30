"use client";

import { SIZE, STAR, LEVEL_GOAL } from "@/lib/arcade/games/match3";
import { CUBEARS } from "../view";
import type { GameView } from "../view";
import type { ArcadeInput } from "@/lib/arcade/types";

type Match3State = {
  tick: number;
  score: number;
  timeTicks: number;
  level: number;
  board: number[]; // row-major 8×8; -1 mid-sweep
};

const CELL = 50;
const GAP = 4;
const MARGIN = Math.round((480 - (SIZE * CELL + (SIZE - 1) * GAP)) / 2); // 26
const TOP = 110;
export { CELL, GAP, MARGIN, TOP };
/** Gold star, then one hue per pattern: readable at 8×8 density. */
const HUES = ["#4EC9A8", "#416CED", "#E8C34A", "#E8564A", "#B2FEE7", "#C3E956"];

function cellOrigin(cell: number): [number, number] {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  return [MARGIN + col * (CELL + GAP), TOP + row * (CELL + GAP)];
}

/** One glyph per tile kind; the star tile sparkles above them all. */
function drawPattern(context: CanvasRenderingContext2D, cx: number, cy: number, kind: number): void {
  context.fillStyle = "rgba(14,35,24,0.72)";
  context.strokeStyle = "rgba(14,35,24,0.72)";
  context.lineWidth = 4;
  if (kind === 0) { context.beginPath(); context.arc(cx, cy, 8, 0, Math.PI * 2); context.fill(); }
  else if (kind === 1) {
    context.beginPath(); context.moveTo(cx, cy - 9); context.lineTo(cx + 9, cy + 7); context.lineTo(cx - 9, cy + 7);
    context.closePath(); context.fill();
  } else if (kind === 2) {
    context.beginPath(); context.moveTo(cx, cy - 10); context.lineTo(cx + 10, cy);
    context.lineTo(cx, cy + 10); context.lineTo(cx - 10, cy); context.closePath(); context.fill();
  } else if (kind === 3) {
    context.beginPath(); context.arc(cx, cy, 8, 0, Math.PI * 2); context.stroke();
  } else if (kind === 4) {
    context.beginPath(); context.moveTo(cx - 10, cy - 4); context.lineTo(cx - 3, cy + 5);
    context.lineTo(cx + 3, cy - 5); context.lineTo(cx + 10, cy + 4); context.stroke();
  } else if (kind === 5) {
    context.beginPath(); context.arc(cx, cy, 9, 0, Math.PI, true);
    context.arc(cx, cy, 9, Math.PI, 0, true); context.fill();
  } else { // star tile
    context.fillStyle = "#F4FFFC";
    context.strokeStyle = "#F4FFFC";
    context.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? 11 : 4.5;
      const angle = Math.PI / 5 * point - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (point === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath(); context.fill();
  }
}

/**
 * Tile Sweep — the match3 view. Selection state lives in this view (not the
 * sim), so each cabinet gets its own instance; the transcript only records
 * completed swap and hint events.
 */
export function createMatch3View(): GameView {
  let selected: number | null = null;
  let pending: ArcadeInput | null = null;
  const view: GameView = {
    id: "match3",
    assets: [CUBEARS.default, CUBEARS.shock],
    input() {
      const tuple = pending ?? [0, 0, 0];
      pending = null;
      return tuple;
    },
    tap(raw, cell) {
      const state = raw as unknown as Match3State;
      if (selected === null) {
        if (state.board[cell] >= 0) selected = cell;
        return null;
      }
      if (selected === cell) { selected = null; return null; }
      const adjacent = Math.abs(Math.floor(selected / SIZE) - Math.floor(cell / SIZE)) +
        Math.abs(selected % SIZE - cell % SIZE) === 1;
      if (adjacent) {
        const action: ArcadeInput = [1, selected, cell];
        selected = null;
        pending = action;
        return action;
      }
      selected = state.board[cell] >= 0 ? cell : null;
      return null;
    },
    key(event) {
      if (event.key === "h" || event.key === "H") { pending = [2, 0, 0]; return [2, 0, 0]; }
      return null;
    },
    render(context, raw, images, palette) {
      const state = raw as unknown as Match3State;
      context.clearRect(0, 0, 480, 640);
      // Board plate
      context.fillStyle = "rgba(11,26,58,0.55)";
      context.beginPath();
      context.roundRect(MARGIN - 12, TOP - 12, SIZE * CELL + (SIZE - 1) * GAP + 24,
        SIZE * CELL + (SIZE - 1) * GAP + 24, 18);
      context.fill();
      // Clock bar: two seconds glow for every matched wave
      const budget = Math.max(0, Math.min(1, state.timeTicks / (120 * 60)));
      context.fillStyle = budget < 0.2 ? palette.red : palette.lime;
      context.beginPath();
      context.roundRect(MARGIN, TOP - 60, (480 - 2 * MARGIN) * budget, 14, 7);
      context.fill();
      // Cubear sits in the corner, grinning at the wall of patterns
      const art = state.timeTicks <= 0 ? images[CUBEARS.shock] : images[CUBEARS.default];
      if (art) {
        const height = 44 * art.naturalHeight / art.naturalWidth;
        context.drawImage(art, 480 - MARGIN - 30, 14, 40, height);
      }
      context.fillStyle = palette.white;
      context.font = "bold 24px monospace";
      const seconds = Math.max(0, Math.ceil(state.timeTicks / 60));
      context.fillText(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, MARGIN, 34);
      context.font = "bold 18px monospace";
      context.fillText(`${state.level} · ${Math.floor(state.level * LEVEL_GOAL)}`, MARGIN, 66);

      for (let cell = 0; cell < state.board.length; cell += 1) {
        const kind = state.board[cell];
        const [x, y] = cellOrigin(cell);
        if (kind >= 0) {
          context.fillStyle = kind === STAR ? "#E8C34A" : HUES[kind % HUES.length];
          context.beginPath();
          context.roundRect(x, y, CELL, CELL, 10);
          context.fill();
          drawPattern(context, x + CELL / 2, y + CELL / 2, kind);
        }
        if (selected === cell) {
          context.strokeStyle = palette.lime;
          context.lineWidth = 5;
          context.beginPath();
          context.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 10);
          context.stroke();
        }
      }
    },
    stats(raw) {
      const state = raw as unknown as Match3State;
      const seconds = Math.max(0, Math.ceil(state.timeTicks / 60));
      return [
        ["time", `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`],
        ["points", String(state.score)],
        ["level", String(state.level)],
      ];
    },
    helpKeys: ["how-title", "instructions", "rules"] as const,
  };
  return view;
}
