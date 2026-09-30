"use client";

import { ARENA, BALL_RADIUS, BRICKS, BRICK_W, PLAYER_Y } from "@/lib/arcade/games/breakout";
import { CUBEARS, paddleAim } from "../view";
import type { GameView, Palette } from "../view";

type Ball = { x: number; y: number; vx: number; vy: number };
type Brick = { col: number; row: number; health: number; locked: boolean };
type Drop = { x: number; y: number; kind: "heart" | "key" | "multiball" };

/** Brick tint by remaining health; locked bricks read as stone. */
function tierColor(health: number, palette: Palette, locked: boolean): string {
  if (locked) return palette.slate;
  if (health >= 5) return palette.gold;
  if (health === 4) return palette.teal;
  if (health === 3) return palette.mintBright;
  if (health === 2) return palette.lime;
  return palette.white;
}

function drawDrop(context: CanvasRenderingContext2D, drop: Drop, palette: Palette): void {
  context.beginPath();
  if (drop.kind === "heart") {
    context.fillStyle = palette.red;
    context.moveTo(drop.x, drop.y + 8);
    context.bezierCurveTo(drop.x - 5, drop.y + 1, drop.x - 11, drop.y - 7, drop.x - 4, drop.y - 8);
    context.bezierCurveTo(drop.x - 1, drop.y - 8, drop.x, drop.y - 5, drop.x, drop.y - 4);
    context.bezierCurveTo(drop.x, drop.y - 5, drop.x + 1, drop.y - 8, drop.x + 4, drop.y - 8);
    context.bezierCurveTo(drop.x + 11, drop.y - 7, drop.x + 5, drop.y + 1, drop.x, drop.y + 8);
    context.fill();
  } else if (drop.kind === "key") {
    context.fillStyle = palette.gold;
    context.arc(drop.x, drop.y - 5, 4, Math.PI, 0);
    context.fill();
    context.beginPath();
    context.fillRect(drop.x - 1.5, drop.y - 6, 3, 13);
    context.fill();
  } else {
    context.fillStyle = palette.mintBright;
    context.arc(drop.x - 4, drop.y, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = palette.teal;
    context.beginPath();
    context.arc(drop.x + 5, drop.y + 2, 4, 0, Math.PI * 2);
    context.fill();
  }
}

function drawBubble(context: CanvasRenderingContext2D, ball: Ball, palette: Palette): void {
  const bubble = context.createRadialGradient(ball.x - 4, ball.y - 4, 1, ball.x, ball.y, BALL_RADIUS);
  bubble.addColorStop(0, palette.white);
  bubble.addColorStop(0.35, palette.mintBright);
  bubble.addColorStop(1, "rgba(178,254,231,0.45)");
  context.fillStyle = bubble;
  context.strokeStyle = palette.white;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

/** Brick Rally: seeded walls level by level, hearts, Cubear and bubbles. */
export const breakoutView: GameView = {
  id: "breakout",
  assets: [CUBEARS.default, CUBEARS.shock, CUBEARS.book],
  input: (controls) => paddleAim(ARENA.width, controls),
  render(context, raw, images, palette) {
    const state = raw as unknown as {
      score: number; lives: number; level: number; paddleWidth: number; playerX: number;
      bricks: Brick[]; balls: Ball[]; drops: Drop[]; hasKey: boolean;
    };
    context.clearRect(0, 0, ARENA.width, ARENA.height);

    for (const brick of state.bricks) {
      if (brick.health <= 0) continue;
      const left = BRICKS.side + brick.col * (BRICK_W + BRICKS.gap);
      const top = BRICKS.top + brick.row * (BRICKS.height + BRICKS.gap);
      context.fillStyle = tierColor(brick.health, palette, brick.locked);
      context.beginPath();
      context.roundRect(left, top, BRICK_W, BRICKS.height, 4);
      context.fill();
      if (brick.locked) { // keyhole face
        context.fillStyle = palette.ink;
        context.beginPath();
        context.arc(left + BRICK_W / 2, top + 6, 3, Math.PI, 0);
        context.fill();
        context.fillRect(left + BRICK_W / 2 - 2, top + 5, 4, 6);
      }
    }

    for (const drop of state.drops) drawDrop(context, drop, palette);

    context.fillStyle = palette.ink;
    context.beginPath();
    context.ellipse(state.playerX, ARENA.height - 12, state.paddleWidth / 2 + 8, 8, 0, 0, Math.PI * 2);
    context.fill();
    const art = state.lives <= 1 ? images[CUBEARS.shock] : state.hasKey ? images[CUBEARS.book] : images[CUBEARS.default];
    if (art) {
      const height = 56 * art.naturalHeight / art.naturalWidth;
      context.drawImage(art, state.playerX - 28, PLAYER_Y - height - 10, 56, height);
    }
    context.fillStyle = palette.lime;
    context.beginPath();
    context.roundRect(state.playerX - state.paddleWidth / 2, PLAYER_Y, state.paddleWidth, 12, 6);
    context.fill();

    for (const ball of state.balls) drawBubble(context, ball, palette);

    // Level number flush onto the wall; key badge floats right when held.
    context.fillStyle = palette.white;
    context.font = "bold 22px monospace";
    context.fillText(String(state.level), 20, 40);
    if (state.hasKey) {
      context.fillStyle = palette.gold;
      context.fillRect(ARENA.width - 27, 28, 3, 14);
      context.beginPath();
      context.arc(ARENA.width - 25, 28, 5, Math.PI, 0);
      context.fill();
    }
  },
  stats(raw) {
    const state = raw as unknown as { score: number; lives: number; level: number };
    return [
      ["points", String(state.score)],
      ["lives", "♥".repeat(Math.max(0, state.lives)) || "—"],
      ["level", String(state.level)],
    ];
  },
  helpKeys: ["how-title", "instructions", "rules"] as const,
};
