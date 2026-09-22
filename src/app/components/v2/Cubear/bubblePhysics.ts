export type BubbleMotion = Readonly<{
	x: number;
	y: number;
	vx: number;
	vy: number;
}>;

export type BubbleBounds = Readonly<{
	width: number;
	height: number;
	radius: number;
}>;

type BubbleStep = Readonly<{
	motion: BubbleMotion;
	hitWall: boolean;
	reachedCeiling: boolean;
}>;

const BUOYANCY = -48;
const AIR_DRAG = 0.42;
const WALL_RESTITUTION = 0.68;
const TERMINAL_SPEED = 1_400;

export function stepBubblePhysics(
	motion: BubbleMotion,
	bounds: BubbleBounds,
	deltaSeconds: number,
): BubbleStep {
	const drag = Math.exp(-AIR_DRAG * deltaSeconds);
	let vx = motion.vx * drag;
	let vy = (motion.vy + BUOYANCY * deltaSeconds) * drag;
	const speed = Math.hypot(vx, vy);
	if (speed > TERMINAL_SPEED) {
		const scale = (TERMINAL_SPEED - 0.001) / speed;
		vx *= scale;
		vy *= scale;
	}

	let x = motion.x + vx * deltaSeconds;
	let y = motion.y + vy * deltaSeconds;
	let hitWall = false;
	const minX = bounds.radius;
	const maxX = bounds.width - bounds.radius;
	const maxY = bounds.height - bounds.radius;

	if (x < minX) {
		x = minX;
		vx = Math.abs(vx) * WALL_RESTITUTION;
		hitWall = true;
	} else if (x > maxX) {
		x = maxX;
		vx = -Math.abs(vx) * WALL_RESTITUTION;
		hitWall = true;
	}

	if (y > maxY && vy > 0) {
		y = maxY;
		vy = -Math.abs(vy) * WALL_RESTITUTION;
		hitWall = true;
	}

	return {
		motion: { x, y, vx, vy },
		hitWall,
		reachedCeiling: y < bounds.radius * -0.35,
	};
}
