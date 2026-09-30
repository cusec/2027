"use client";

import { ARENA, AI_Y, PLAYER_Y, BALL_RADIUS, PADDLE, WIN_SCORE } from "@/lib/arcade/games/pong";
import { CUBEARS, paddleAim } from "../view";
import type { GameView, Palette } from "../view";

type PongState = {
  playerX: number; aiX: number; ax: number; ay: number;
  playerScore: number; aiScore: number; won: boolean; serving: number;
};

const HEIGHT = 66;

function drawBubble(context: CanvasRenderingContext2D, x: number, y: number, palette: Palette, alpha = 1): void {
  context.save();
  context.globalAlpha = alpha;
  const bubble = context.createRadialGradient(x - 4, y - 4, 1, x, y, BALL_RADIUS);
  bubble.addColorStop(0, palette.white);
  bubble.addColorStop(0.35, palette.mintBright);
  bubble.addColorStop(1, "rgba(178,254,231,0.45)");
  context.fillStyle = bubble;
  context.strokeStyle = palette.white;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

/** The pong court: rival Cubear patrols the top, you keep the bubble down here. */
export const pongView: GameView = {
  id: "pong",
  assets: [CUBEARS.default, CUBEARS.shock, CUBEARS.erm],
  input: (controls) => paddleAim(ARENA.width, controls),
  render(context, raw, images, palette) {
    const state = raw as unknown as PongState;
    context.clearRect(0, 0, ARENA.width, ARENA.height);
    // Net: dashed centre line
    context.strokeStyle = "rgba(244,255,252,0.2)";
    context.lineWidth = 2;
    context.setLineDash([10, 12]);
    context.beginPath();
    context.moveTo(24, ARENA.height / 2);
    context.lineTo(ARENA.width - 24, ARENA.height / 2);
    context.stroke();
    context.setLineDash([]);
    // Rival side: Erm pose rides its paddle
    const rival = images[CUBEARS.erm];
    if (rival) {
      const height = 60 * rival.naturalHeight / rival.naturalWidth;
      context.drawImage(rival, state.aiX - 30, AI_Y + PADDLE.height / 2 + 4, 60, height);
    }
    context.fillStyle = palette.lime;
    context.beginPath();
    context.roundRect(state.aiX - PADDLE.width / 2, AI_Y - PADDLE.height / 2, PADDLE.width, PADDLE.height, 7);
    context.fill();
    // Player side: Cubear on the bubble-side paddle
    context.fillStyle = palette.ink;
    context.beginPath();
    context.ellipse(state.playerX, ARENA.height - 12, 58, 8, 0, 0, Math.PI * 2);
    context.fill();
    const art = state.won ? images[CUBEARS.speaker] : images[CUBEARS.default];
    if (art) {
      const height = HEIGHT * art.naturalHeight / art.naturalWidth;
      context.drawImage(art, state.playerX - 33, PLAYER_Y - height - PADDLE.height / 2, 66, height);
    }
    context.fillStyle = palette.lime;
    context.beginPath();
    context.roundRect(state.playerX - PADDLE.width / 2, PLAYER_Y - PADDLE.height / 2, PADDLE.width, PADDLE.height, 7);
    context.fill();
    // Bubble: solid while live, ghosted during the serve countdown
    drawBubble(context, state.ax, state.ay, palette, state.serving > 0 ? 0.35 : 1);
    // Score badges inline on the court
    context.fillStyle = palette.white;
    context.font = "bold 26px monospace";
    context.fillText(`${state.playerScore}`, 24, ARENA.height - 14);
    context.globalAlpha = 0.75;
    context.fillText(`${state.aiScore}`, 24, 30);
    context.globalAlpha = 1;
  },
  stats(raw) {
    const state = raw as unknown as PongState;
    return [
      ["points", String(state.playerScore)],
      ["rival", String(state.aiScore)],
      ["target", String(WIN_SCORE)],
    ];
  },
  helpKeys: ["how-title", "instructions", "rules"] as const,
};

