import { describe, expect, it } from "vitest";

import { stepBubblePhysics } from "./bubblePhysics";

const bounds = { width: 1_200, height: 800, radius: 100 } as const;

describe("stepBubblePhysics", () => {
	it("accelerates the bubble upward when it is released", () => {
		const result = stepBubblePhysics(
			{ x: 600, y: 500, vx: 0, vy: 0 },
			bounds,
			0.1,
		);

		expect(result.motion.y).toBeLessThan(500);
		expect(result.motion.vy).toBeLessThan(0);
		expect(result.hitWall).toBe(false);
	});

	it("rebounds from a side wall without leaving the viewport", () => {
		const result = stepBubblePhysics(
			{ x: 1_095, y: 400, vx: 500, vy: 0 },
			bounds,
			0.1,
		);

		expect(result.motion.x).toBe(bounds.width - bounds.radius);
		expect(result.motion.vx).toBeLessThan(0);
		expect(result.hitWall).toBe(true);
	});

	it("limits a hard fling to the bubble's terminal speed", () => {
		const result = stepBubblePhysics(
			{ x: 600, y: 500, vx: 8_000, vy: -8_000 },
			bounds,
			0.016,
		);

		expect(Math.hypot(result.motion.vx, result.motion.vy)).toBeLessThanOrEqual(1_400);
	});

	it("floats past the top edge instead of clamping or popping", () => {
		const result = stepBubblePhysics(
			{ x: 600, y: 20, vx: 0, vy: -1_300 },
			bounds,
			0.1,
		);

		expect(result.motion.y).toBeLessThan(-bounds.radius);
		expect(result.motion.vy).toBeLessThan(0);
		expect(result.hitWall).toBe(false);
	});
});
