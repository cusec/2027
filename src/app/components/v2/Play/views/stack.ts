"use client";

import { ARENA, PLATE } from "@/lib/arcade/games/stack";
import type { StackState } from "@/lib/arcade/games/stack";
import { swayCentre } from "@/lib/arcade/games/stack";
import type { GameView } from "../view";
import { drawCloud, drawTopHat, OUTLINE } from "../art";

const GROUND_Y = ARENA.height - 64;
const HAT_STEP = PLATE.height; // each hat stacks by its own height
const VISIBLE_HATS = 16; // plates kept on screen: older ones scroll off

/** The stack court: sky, drifting clouds, the tower and the swaying hat. */
export const stackView: GameView = {
  id: "stack",
  assets: [],
  mode: "tap",
  tap: () => [1],
  key: (event) => (event.code === "Space" || event.key === "Enter" ? [1] : null),
  render(context, raw, _images, palette) {
    const state = raw as unknown as StackState;
    const sky = context.createLinearGradient(0, 0, 0, ARENA.height);
    sky.addColorStop(0, "#BEE3EF");
    sky.addColorStop(1, "#F2FBF5");
    context.fillStyle = sky;
    context.fillRect(0, 0, ARENA.width, ARENA.height);

    // Clouds drift slowly behind the tower.
    const drift = state.tick * 0.14;
    for (let i = 0; i < 4; i += 1) {
      const x = ((drift + i * 170 + 40) % (ARENA.width + 140)) - 70;
      drawCloud(context, x, 90 + (i % 2) * 46, 1.4, 0.85);
    }

    // Tower: cut from the bottom (the oldest hats scroll off-screen).
    const count = state.plates.length;
    const first = Math.max(1, count - VISIBLE_HATS);
    const hats = state.plates.slice(first);
    // The top plate's upper surface, before any scroll.
    // The scroll keeps the tower's top well inside the frame.
    const scroll = count <= VISIBLE_HATS + 2 ? 0
      : (count - VISIBLE_HATS - 2) * HAT_STEP;
    context.strokeStyle = OUTLINE;
    context.lineWidth = 3;
    for (const [i, plate] of hats.entries()) {
      const y = GROUND_Y - (first + i + 1) * HAT_STEP + scroll;
      if (y < -PLATE.height) continue;
      // hat cylinder + brim, drawn at this plate's width and centre
      drawTopHat(context, plate.x, y, 1);
    }

    // The ground strip the tower stands on.
    context.fillStyle = "#2E6E43";
    context.fillRect(0, GROUND_Y, ARENA.width, ARENA.height - GROUND_Y);
    context.fillStyle = "rgba(244,255,252,0.24)";
    for (let x = 10; x < ARENA.width; x += 34) context.fillRect(x, GROUND_Y + 8, 18, 6);

    // The swaying hat above the tower's current plate.
    const top = state.plates[state.plates.length - 1];
    const swayX = swayCentre(state.tick, state.phase);
    const hatBaseY = GROUND_Y - count * HAT_STEP + scroll - 22;
    drawTopHat(context, swayX, hatBaseY, 1.12);

    // The current plate's width indicator: a hairline guide at its edges.
    if (state.plates.length > 1) {
      context.setLineDash([6, 8]);
      context.strokeStyle = "rgba(31,59,44,0.4)";
      context.lineWidth = 2;
      const guideY = GROUND_Y - count * HAT_STEP + scroll;
      context.beginPath();
      context.moveTo(top.x - top.width / 2, guideY);
      context.lineTo(top.x + top.width / 2, guideY);
      context.stroke();
      context.setLineDash([]);
    }

    // Score top-left, ink-outlined white digits.
    context.textAlign = "left";
    context.font = "bold 34px monospace";
    context.lineWidth = 6;
    context.strokeStyle = OUTLINE;
    context.strokeText(String(state.score), 18, 56);
    context.fillStyle = palette.white;
    context.fillText(String(state.score), 18, 56);
  },
  stats(raw) {
    const state = raw as unknown as StackState;
    return [["hats", String(state.score)]];
  },
  helpKeys: ["how-title", "instructions", "rules"] as const,
};
