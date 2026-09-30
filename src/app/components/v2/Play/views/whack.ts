"use client";

import { ARENA, CLOCK_TICKS, HOLES } from "@/lib/arcade/games/whack";
import type { WhackState } from "@/lib/arcade/games/whack";
import type { GameView } from "../view";
import {drawCubear, drawTopHat, OUTLINE} from "../art";

const TABLE_Y = 300;

/** The whack court: a sponsor table, 3×3 holes, the bear pops. */
export const whackView: GameView = {
  id: "whack",
  assets: [],
  mode: "tap",
  tap(x, y) {
    // The nearest hole within reach takes the swing; anywhere else is air.
    let best = 9;
    let bestDist = 78;
    for (const [hole, [hx, hy]] of HOLES.entries()) {
      const distance = Math.hypot(x - hx, y - (hy - 12));
      if (distance < bestDist) { bestDist = distance; best = hole; }
    }
    return [best];
  },
  key: () => null,
  render(context, raw) {
    const state = raw as unknown as WhackState;
    context.clearRect(0, 0, ARENA.width, ARENA.height);
    // Hall backdrop: a soft wash with faint sponsor-card silhouettes.
    context.fillStyle = "#EAF3EC";
    context.fillRect(0, 0, ARENA.width, ARENA.height);
    context.fillStyle = "rgba(31,59,44,0.08)";
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        context.fillRect(28 + col * 112, 26 + row * 96 + (col % 2) * 18, 72, 56);
      }
    }

    // The booth table the holes sit in.
    context.fillStyle = "#CFE8D4";
    context.beginPath();
    context.roundRect(0, TABLE_Y, ARENA.width, TABLE_Y + TABLE_Y - ARENA.height + 240, 12);
    context.fill();

    // Holes: dark rims under each pop.
    context.strokeStyle = OUTLINE;
    context.lineWidth = 3;
    for (const [hx, hy] of HOLES) {
      context.fillStyle = "rgba(31,59,44,0.16)";
      context.beginPath();
      context.ellipse(hx, hy + 38, 44, 18, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#123322";
      context.beginPath();
      context.ellipse(hx, hy + 36, 38, 14, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }

    // The pop: a bear in a window cut, framed by the hole; a delegate bear
    // (no hat) reads as the "don't whack" one.
    const pop = state.current;
    if (pop && state.tick <= pop.downTick) {
      context.save();
      context.beginPath();
      // Clip a circular window above the hole so the bear "grows out".
      context.arc(HOLES[pop.hole][0], HOLES[pop.hole][1] - 12, 50, 0, Math.PI * 2);
      context.clip();
      drawCubear(context, HOLES[pop.hole][0], HOLES[pop.hole][1] + 6, 1.0);
      if (pop.kind === "bear") drawTopHat(context, HOLES[pop.hole][0], HOLES[pop.hole][1] - 46, 1.0);
      context.restore();
    }

    // HUD: score left, clock right — both chip-styled white plates.
    context.textAlign = "left";
    context.font = "bold 30px monospace";
    const seconds = Math.max(0, Math.ceil((CLOCK_TICKS - state.tick) / 60));
    context.fillStyle = "#FFFFFF";
    context.strokeStyle = OUTLINE;
    context.lineWidth = 5;
    context.strokeText(`Score ${state.score}`, 18, 52);
    context.fillText(`Score ${state.score}`, 18, 52);
    context.textAlign = "right";
    context.strokeText(`0:${String(seconds).padStart(2, "0")}`, ARENA.width - 18, 52);
    context.fillText(`0:${String(seconds).padStart(2, "0")}`, ARENA.width - 18, 52);
  },
  stats(raw) {
    const state = raw as unknown as WhackState;
    const seconds = Math.max(0, Math.ceil((CLOCK_TICKS - state.tick) / 60));
    return [
      ["hits", String(state.score)],
      ["time", `0:${String(seconds).padStart(2, "0")}`],
      ["whiffs", "×".repeat(state.whiffs)],
    ];
  },
  helpKeys: ["how-title", "instructions", "rules"] as const,
};
