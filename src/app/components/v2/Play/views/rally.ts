"use client";

import { ARENA } from "@/lib/rally/simulation";
import { drawCubearHatted, OUTLINE } from "../art";
import type { GameView } from "../view";
import { paddleAim } from "../view";

type RallyState = {
  playerX: number;
  x: number;
  y: number;
  ended: boolean;
  tick: number;
  score: number;
  platformY: number;
};

/** The rally court: sky, the drawn Cubear paddle, and the bubble. */
export const rallyView: GameView = {
  id: "rally",
  assets: [],
  mode: "aim",
  input: (controls) => paddleAim(ARENA.width, controls),
  render(context, raw, _images, palette) {
    const state = raw as unknown as RallyState;
    const sky = context.createLinearGradient(0, 0, 0, ARENA.height);
    sky.addColorStop(0, "#BFE7F2");
    sky.addColorStop(1, "#F2FBF3");
    context.fillStyle = sky;
    context.fillRect(0, 0, ARENA.width, ARENA.height);

    context.fillStyle = "rgba(244,255,252,0.35)";
    context.lineWidth = 1;
    context.strokeStyle = "rgba(244,255,252,0.16)";
    for (let y = 48; y < ARENA.height; y += 40) {
      context.beginPath();
      context.moveTo(16, y);
      context.lineTo(ARENA.width - 16, y);
      context.stroke();
    }

    // Ground: mint floor
    context.fillStyle = "#DFF6EE";
    context.fillRect(0, ARENA.height - 44, ARENA.width, 44);
    context.strokeStyle = OUTLINE;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, ARENA.height - 44); context.lineTo(ARENA.width, ARENA.height - 44);
    context.stroke();

    // Paddle shadow
    context.fillStyle = "rgba(31,59,44,0.18)";
    context.beginPath();
    context.ellipse(state.playerX, ARENA.height - 40, 56, 6, 0, 0, Math.PI * 2);
    context.fill();

    // The paddle: the hatted Cubear rides its lime face plate.
    context.fillStyle = palette.lime;
    context.beginPath();
    context.roundRect(state.playerX - 50, state.platformY, 100, 12, 6);
    context.fill();
    context.strokeStyle = OUTLINE;
    context.lineWidth = 3;
    context.stroke();
    drawCubearHatted(context, state.playerX, state.platformY - 2, 0.84);

    // The bubble: same soap-bubble gradient as always.
    const bubble = context.createRadialGradient(state.x - 4, state.y - 4, 1, state.x, state.y, ARENA.radius);
    bubble.addColorStop(0, palette.white);
    bubble.addColorStop(0.35, palette.mintBright);
    bubble.addColorStop(1, "rgba(178,254,231,0.45)");
    context.fillStyle = bubble;
    context.strokeStyle = palette.white;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(state.x, state.y, ARENA.radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    // The score, top-left, ink-stroked.
    context.textAlign = "left";
    context.font = "bold 34px monospace";
    context.lineWidth = 6;
    context.strokeStyle = OUTLINE;
    context.strokeText(String(state.score), 18, 56);
    context.fillStyle = palette.white;
    context.fillText(String(state.score), 18, 56);
  },
  stats(raw) {
    const state = raw as unknown as RallyState;
    return [["returns", String(state.score)]];
  },
  helpKeys: ["how-title", "instructions", "rules"] as const,
};
