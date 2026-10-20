"use client";

import { ARENA, PIPE } from "@/lib/arcade/games/flappy";
import type { FlappyState } from "@/lib/arcade/games/flappy";
import type { GameView } from "../view";
import { drawCloud, drawCubearHatted, OUTLINE } from "../art";

const GROUND_Y = ARENA.height - 56;
const GRASS = "#6CBF5A";
const GRASS_DEEP = "#3E7F3B";
const PIPE_GREEN = "#5DAE4F";

/** The flappy court: sky bands, drifting clouds, forest pipes and the bear. */
export const flappyView: GameView = {
  id: "flappy",
  assets: [],
  mode: "tap",
  tap: () => [1],
  key: (event) => (event.code === "Space" || event.key === "ArrowUp" || event.key === "Enter" ? [1] : null),
  render(context, raw, _images, palette) {
    const state = raw as unknown as FlappyState;
    // Sky: a soft vertical wash, colder high, softer near the ground.
    const sky = context.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, "#A9DDF3");
    sky.addColorStop(0.75, "#D9EEFA");
    sky.addColorStop(1, "#EFF9FD");
    context.fillStyle = sky;
    context.fillRect(0, 0, ARENA.width, GROUND_Y);

    // Clouds: three depth layers drifting at different speeds.
    const drift = state.tick * 0.32;
    for (const [layer, speed, scale, alpha] of [[1, 0.5, 1.5, 0.9], [2, 0.8, 1.05, 0.7], [3, 1.15, 1.0, 0.5]]) {
      for (let i = 0; i < 3; i += 1) {
        const spread = ARENA.width / 3;
        const x = ((drift * speed + i * spread + layer * 61) % (ARENA.width + 120)) - 60;
        const y = 60 + layer * 42 + (i % 2) * 24;
        drawCloud(context, x, y, scale, alpha);
      }
    }

    // Pipes: forest green trunks with the famous lip.
    for (const pipe of state.pipes) {
      const topEdge = pipe.gapY - PIPE.gap / 2;
      const bottomEdge = pipe.gapY + PIPE.gap / 2;
      context.fillStyle = PIPE_GREEN;
      context.strokeStyle = OUTLINE;
      context.lineWidth = 3;
      context.beginPath(); context.roundRect(pipe.x + 5, -14, PIPE.width - 10, topEdge + 14, 3); context.fill(); context.stroke();
      context.beginPath(); context.roundRect(pipe.x - 5, topEdge - 24, PIPE.width + 10, 24, 7); context.fill(); context.stroke();
      context.beginPath(); context.roundRect(pipe.x + 5, bottomEdge, PIPE.width - 10, GROUND_Y - bottomEdge + 4, 3); context.fill(); context.stroke();
      context.beginPath(); context.roundRect(pipe.x - 5, bottomEdge, PIPE.width + 10, 24, 7); context.fill(); context.stroke();
    }

    // Ground: grass strip over the ink line
    context.fillStyle = GRASS;
    context.fillRect(0, GROUND_Y, ARENA.width, ARENA.height - GROUND_Y);
    context.fillStyle = GRASS_DEEP;
    for (let x = 12; x < ARENA.width; x += 26) context.fillRect(x, GROUND_Y + 6, 16, 6);

    // The flying Cubear: tilt on the velocity for flight feel.
    context.save();
    context.translate(state.x, state.y);
    context.rotate(Math.max(-0.5, Math.min(0.9, state.vy * 0.06)));
    drawCubearHatted(context, 0, 26, 0.92);
    context.restore();

    // Score: big pixel count at the top, ink-stroked white fill.
    context.textAlign = "center";
    context.font = "bold 44px monospace";
    context.lineWidth = 7;
    context.strokeStyle = OUTLINE;
    context.strokeText(String(state.score), ARENA.width / 2, 70);
    context.fillStyle = palette.white;
    context.fillText(String(state.score), ARENA.width / 2, 70);
  },
  stats(raw) {
    const state = raw as unknown as FlappyState;
    return [["points", String(state.score)]];
  },
  helpKeys: ["how-title", "instructions", "rules"] as const,
};
