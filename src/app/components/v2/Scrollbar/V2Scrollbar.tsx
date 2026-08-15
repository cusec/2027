"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const RAIL_INSET = 10;
const MIN_KNOB = 56;
const REST_DELAY = 40;

export default function V2Scrollbar() {
	const [metrics, setMetrics] = useState({ knob: 0, offset: 0, max: 0 });
	const [dragging, setDragging] = useState(false);
	const [scrolling, setScrolling] = useState(false);

	// Live copies for the pointer handlers, so dragging never re-subscribes.
	const railRef = useRef(0);
	const knobRef = useRef(0);
	const maxRef = useRef(0);
	const lastY = useRef(0);
	const dragOrigin = useRef({ pointerY: 0, scrollY: 0 });

	const measure = useCallback(() => {
		const doc = document.documentElement;
		const viewport = window.innerHeight;
		const max = doc.scrollHeight - viewport;

		if (max <= 1) {
			railRef.current = 0;
			knobRef.current = 0;
			maxRef.current = 0;
			setMetrics({ knob: 0, offset: 0, max: 0 });
			return;
		}

		const rail = viewport - RAIL_INSET * 2;
		const knob = Math.max(MIN_KNOB, (viewport / doc.scrollHeight) * rail);
		const progress = Math.min(1, Math.max(0, window.scrollY / max));

		railRef.current = rail;
		knobRef.current = knob;
		maxRef.current = max;
		setMetrics({
			knob,
			offset: RAIL_INSET + progress * (rail - knob),
			max,
		});
	}, []);

	useEffect(() => {
		let frame = 0;
		let rest: ReturnType<typeof setTimeout>;

		const schedule = () => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				measure();
			});
		};

		const onScroll = () => {
			schedule();

			const y = window.scrollY;
			if (Math.abs(y - lastY.current) < 1) return;
			lastY.current = y;

			setScrolling(true);
			clearTimeout(rest);
			rest = setTimeout(() => setScrolling(false), REST_DELAY);
		};

		lastY.current = window.scrollY;
		measure();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", schedule);

		const observer = new ResizeObserver(schedule);
		observer.observe(document.documentElement);

		return () => {
			if (frame) cancelAnimationFrame(frame);
			clearTimeout(rest);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", schedule);
			observer.disconnect();
		};
	}, [measure]);

	const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		dragOrigin.current = { pointerY: event.clientY, scrollY: window.scrollY };
		setDragging(true);
	};

	const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging) return;
		const travel = railRef.current - knobRef.current;
		if (travel <= 0) return;

		const delta = event.clientY - dragOrigin.current.pointerY;
		const target =
			dragOrigin.current.scrollY + (delta / travel) * maxRef.current;

		// `instant` on purpose: a smooth scroll would trail the pointer.
		window.scrollTo({
			top: Math.min(maxRef.current, Math.max(0, target)),
			behavior: "instant",
		});
	};

	const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging) return;
		event.currentTarget.releasePointerCapture(event.pointerId);
		setDragging(false);
	};

	if (metrics.max <= 0) return null;

	return (
		<div className="v2-scrollbar" aria-hidden="true">
			<div
				className={[
					"v2-scrollbar__knob",
					scrolling && "is-active",
					dragging && "is-dragging",
				]
					.filter(Boolean)
					.join(" ")}
				style={{
					height: `${metrics.knob}px`,
					transform: `translateY(${metrics.offset}px)`,
				}}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
			/>
		</div>
	);
}
