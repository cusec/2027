"use client";

import { ARENA } from "@/lib/rally/simulation";
import { CUBEARS, paddleAim } from "../view";
import type { GameView, Palette } from "../view";

type RallyState = {
  playerX: number;
  x: number;
  y: number;
  ended: boolean;
  tick: number;
  score: number;
  platformY: number;
};

/** Keep the bubble looking like a soap bubble: same gradient as the original. */
function drawBubble(context: CanvasRenderingContext2D, x: number, y: number, radius: number, palette: Palette): void {
  const bubble = context.createRadialGradient(x - 4, y - 4, 1, x, y, radius);
  bubble.addColorStop(0, palette.white);
  bubble.addColorStop(0.35, palette.mintBright);
  bubble.addColorStop(1, "rgba(178,254,231,0.45)");
  context.fillStyle = bubble;
  context.strokeStyle = palette.white;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

/** The original Cubear Rally view — unchanged art, now with SFX + hub wiring. */
export const rallyView: GameView = {
  id: "rally",
  assets: [CUBEARS.default, CUBEARS.shock],
  input: (controls) => paddleAim(ARENA.width, controls),
  render(context, raw, images, palette) {
    const state = raw as unknown as RallyState;
    context.clearRect(0, 0, ARENA.width, ARENA.height);
    context.strokeStyle = "rgba(244,255,252,0.14)";
    context.lineWidth = 1;
    for (let y = 40; y < ARENA.height; y += 40) {
      context.beginPath();
      context.moveTo(16, y);
      context.lineTo(ARENA.width - 16, y);
      context.stroke();
    }
    context.fillStyle = palette.ink;
    context.beginPath();
    context.ellipse(state.playerX, 599, 58, 8, 0, 0, Math.PI * 2);
    context.fill();
    const art = state.ended && state.tick < 10_800 ? images[CUBEARS.shock] : images[CUBEARS.default];
    if (art) {
      const height = 66 * art.naturalHeight / art.naturalWidth;
      context.drawImage(art, state.playerX - 33, state.platformY - height - 9, 66, height);
    }
    context.fillStyle = palette.lime;
    context.beginPath();
    context.roundRect(state.playerX - 50, state.platformY, 100, 12, 6);
    context.fill();
    drawBubble(context, state.x, state.y, ARENA.radius, palette);
  },
  stats(raw) {
    const state = raw as unknown as RallyState;
    return [["points", String(state.score)]];
  },
  helpKeys: ["how-title", "instructions", "rules"] as const,
};
