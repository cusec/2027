import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { stepBubblePhysics } from "./bubblePhysics";
import type { BubbleMotion } from "./bubblePhysics";

const MAX_VISIT_MS = 18_000;
const REDUCED_VISIT_MS = 6_000;
const POP_MS = 440;

type DragState = {
	readonly pointerId: number;
	readonly offsetX: number;
	readonly offsetY: number;
	targetX: number;
	targetY: number;
};

/* Underdamped (ζ≈0.5) so a fling overshoots and settles like soap film. */
const SPRING_STIFFNESS = 520;
const SPRING_DAMPING = 24;

type BubbleProps = Readonly<{
	left: number;
	pose: Readonly<{ src: string; w: number; h: number }>;
	phrase?: string;
	onFinished: () => void;
}>;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

export function V2CubearBubble({ left, pose, phrase, onFinished }: BubbleProps) {
	const bubbleRef = useRef<HTMLDivElement>(null);
	const motionRef = useRef<BubbleMotion>({ x: 0, y: 0, vx: 0, vy: -120 });
	const dragRef = useRef<DragState | null>(null);
	const reducedMotionRef = useRef(false);
	const finishRef = useRef(onFinished);
	const [dragging, setDragging] = useState(false);

	useEffect(() => {
		finishRef.current = onFinished;
	}, [onFinished]);

	useEffect(() => {
		const bubble = bubbleRef.current;
		if (!bubble) return;

		let frame = 0;
		let popTimer: number | undefined;
		let previousTime = performance.now();
		let activeMs = 0;
		let impact = 0;
		let finished = false;
		let heading = 0;
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		const radius = bubble.offsetWidth / 2;

		const paint = (motion: BubbleMotion, time: number) => {
			const speed = Math.hypot(motion.vx, motion.vy);
			const stretch = clamp(speed / 7_000 + impact * 0.06, 0, 0.14);
			const lean = clamp(motion.vx / 70, -10, 10);
			const sway = reducedMotionRef.current ? 0 : Math.sin(time / 760) * Math.max(2, 10 - speed / 120);
			if (speed > 60) heading = (Math.atan2(motion.vy, motion.vx) * 180) / Math.PI;
			bubble.style.transform = `translate3d(${motion.x - radius}px, ${motion.y - radius}px, 0)`;
			bubble.style.setProperty("--bubble-heading", `${heading.toFixed(2)}deg`);
			bubble.style.setProperty("--bubble-stretch", stretch.toFixed(3));
			bubble.style.setProperty("--bubble-lean", `${lean.toFixed(2)}deg`);
			bubble.style.setProperty("--bubble-sway", `${sway.toFixed(2)}px`);
			bubble.style.setProperty("--bear-x", `${clamp(-motion.vx / 45, -18, 18).toFixed(2)}px`);
			bubble.style.setProperty("--bear-y", `${clamp(-motion.vy / 60, -13, 13).toFixed(2)}px`);
		};

		const beginPop = () => {
			if (finished) return;
			finished = true;
			bubble.classList.add("is-popping");
			popTimer = window.setTimeout(() => finishRef.current(), POP_MS);
		};

		// No burst here - only the timed pop below bursts in view.
		const end = () => {
			if (finished) return;
			finished = true;
			finishRef.current();
		};

		const setReducedMotion = () => {
			reducedMotionRef.current = media.matches;
		};
		setReducedMotion();
		media.addEventListener("change", setReducedMotion);

		motionRef.current = {
			x: window.innerWidth * (left / 100),
			y: reducedMotionRef.current ? window.innerHeight * 0.72 : window.innerHeight + radius * 0.7,
			vx: 0,
			vy: reducedMotionRef.current ? 0 : -120,
		};
		paint(motionRef.current, previousTime);

		const tick = (time: number) => {
			const elapsedMs = Math.min(time - previousTime, 32);
			const dt = elapsedMs / 1_000;
			previousTime = time;
			const held = dragRef.current;
			if (held) {
				const m = motionRef.current;
				if (reducedMotionRef.current) {
					motionRef.current = { x: held.targetX, y: held.targetY, vx: 0, vy: 0 };
				} else {
					const vx = m.vx + ((held.targetX - m.x) * SPRING_STIFFNESS - m.vx * SPRING_DAMPING) * dt;
					const vy = m.vy + ((held.targetY - m.y) * SPRING_STIFFNESS - m.vy * SPRING_DAMPING) * dt;
					motionRef.current = {
						x: clamp(m.x + vx * dt, radius, window.innerWidth - radius),
						y: clamp(m.y + vy * dt, radius, window.innerHeight - radius),
						vx,
						vy,
					};
				}
			} else {
				activeMs += elapsedMs;
				if (!reducedMotionRef.current) {
					const result = stepBubblePhysics(
						motionRef.current,
						{ width: window.innerWidth, height: window.innerHeight, radius },
						dt,
					);
					motionRef.current = result.motion;
					if (result.hitWall) impact = 1;
					if (result.motion.y < -radius - 60) return end();
				}
			}
			impact *= 0.86;
			paint(motionRef.current, time);
			if (activeMs >= (reducedMotionRef.current ? REDUCED_VISIT_MS : MAX_VISIT_MS)) {
				return beginPop();
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(popTimer);
			media.removeEventListener("change", setReducedMotion);
		};
	}, [left]);

	const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		const motion = motionRef.current;
		event.preventDefault();
		try {
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			// No active pointer to capture; drag on without capture.
		}
		dragRef.current = {
			pointerId: event.pointerId,
			offsetX: event.clientX - motion.x,
			offsetY: event.clientY - motion.y,
			targetX: motion.x,
			targetY: motion.y,
		};
		motionRef.current = { ...motion, vx: 0, vy: 0 };
		setDragging(true);
	};

	const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
		const current = dragRef.current;
		const bubble = bubbleRef.current;
		if (!current || current.pointerId !== event.pointerId || !bubble) return;

		const radius = bubble.offsetWidth / 2;
		current.targetX = clamp(event.clientX - current.offsetX, radius, window.innerWidth - radius);
		current.targetY = clamp(event.clientY - current.offsetY, radius, window.innerHeight - radius);
	};

	const release = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (dragRef.current?.pointerId !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		dragRef.current = null;
		if (reducedMotionRef.current) {
			motionRef.current = { ...motionRef.current, vx: 0, vy: 0 };
		}
		setDragging(false);
	};

	return (
		<div
			ref={bubbleRef}
			className={`v2-cubear-bubble${dragging ? " is-dragging" : ""}`}
			aria-hidden="true"
			onPointerDown={startDrag}
			onPointerMove={drag}
			onPointerUp={release}
			onPointerCancel={release}
			onLostPointerCapture={release}
		>
			{phrase && <span className="v2-cubear-speech">{phrase}</span>}
			<div className="v2-cubear-bubble__sway">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={pose.src} alt="" width={pose.w / 3} height={pose.h / 3} draggable="false" />
				<span className="v2-cubear-bubble__film" />
			</div>
		</div>
	);
}
