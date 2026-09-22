import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { stepBubblePhysics } from "./bubblePhysics";
import type { BubbleMotion } from "./bubblePhysics";

const ERM = "/assets/v2/cubear/cubear-erm.webp";
const MAX_VISIT_MS = 18_000;
const REDUCED_VISIT_MS = 6_000;
const POP_MS = 440;

type DragState = {
	readonly pointerId: number;
	readonly offsetX: number;
	readonly offsetY: number;
	lastX: number;
	lastY: number;
	lastTime: number;
};

type BubbleProps = Readonly<{
	left: number;
	phrase?: string;
	onFinished: () => void;
}>;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

export function V2CubearBubble({ left, phrase, onFinished }: BubbleProps) {
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
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		const radius = bubble.offsetWidth / 2;

		const paint = (motion: BubbleMotion, time: number) => {
			const speed = Math.hypot(motion.vx, motion.vy);
			const stretch = clamp(speed / 4_800 + impact * 0.08, 0, 0.2);
			const lean = clamp(motion.vx / 55, -14, 14);
			const sway = reducedMotionRef.current ? 0 : Math.sin(time / 760) * Math.max(2, 10 - speed / 120);
			bubble.style.transform = `translate3d(${motion.x - radius}px, ${motion.y - radius}px, 0)`;
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
			previousTime = time;
			if (!dragRef.current) {
				activeMs += elapsedMs;
				if (!reducedMotionRef.current) {
					const result = stepBubblePhysics(
						motionRef.current,
						{ width: window.innerWidth, height: window.innerHeight, radius },
						elapsedMs / 1_000,
					);
					motionRef.current = result.motion;
					if (result.hitWall) impact = 1;
					if (result.reachedCeiling) return beginPop();
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
			lastX: event.clientX,
			lastY: event.clientY,
			lastTime: event.timeStamp,
		};
		motionRef.current = { ...motion, vx: 0, vy: 0 };
		setDragging(true);
	};

	const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
		const current = dragRef.current;
		const bubble = bubbleRef.current;
		if (!current || current.pointerId !== event.pointerId || !bubble) return;

		const radius = bubble.offsetWidth / 2;
		const elapsedMs = Math.max(event.timeStamp - current.lastTime, 8);
		const rawVx = ((event.clientX - current.lastX) / elapsedMs) * 1_000;
		const rawVy = ((event.clientY - current.lastY) / elapsedMs) * 1_000;
		motionRef.current = {
			x: clamp(event.clientX - current.offsetX, radius, window.innerWidth - radius),
			y: clamp(event.clientY - current.offsetY, radius, window.innerHeight - radius),
			vx: rawVx * 0.75 + motionRef.current.vx * 0.25,
			vy: rawVy * 0.75 + motionRef.current.vy * 0.25,
		};
		current.lastX = event.clientX;
		current.lastY = event.clientY;
		current.lastTime = event.timeStamp;
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
				<img src={ERM} alt="" width={120} height={187} draggable="false" />
				<span className="v2-cubear-bubble__film" />
			</div>
		</div>
	);
}
