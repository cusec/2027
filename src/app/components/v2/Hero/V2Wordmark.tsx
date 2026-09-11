"use client";

import { useEffect, useRef } from "react";

/**
 * The CUSEC 2027 wordmark: an idle wave travelling across the letters, plus
 * letters that dodge the cursor.
 *
 * Each character is two nested spans on purpose. The outer one runs the wave
 * keyframes; the inner one carries only the repel offset. A single element
 * cannot do both — writing `transform` from JS would replace the animation's
 * transform and kill the wave — so the two are split and composed. For the same
 * reason the pointer handler sets `--rx`/`--ry` custom properties rather than
 * touching `transform` directly.
 */

const REPEL_RADIUS = 140; // px — how close the cursor must be to nudge a letter
const REPEL_STRENGTH = 20; // px — max displacement, right at the cursor
const STAGGER = 0.12; // s — per-letter delay, so the wave travels

export default function V2Wordmark({ text }: { text: string }) {
	const rootRef = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const repels = Array.from(
			root.querySelectorAll<HTMLElement>(".v2-hero__char-repel")
		);
		if (!repels.length) return;

		let raf = 0;
		let mx = -99999;
		let my = -99999;
		let touchHolding = false; // on touch, only repel while a finger is down
		let visible = true;

		const apply = () => {
			raf = 0;
			for (const el of repels) {
				const r = (el.parentElement as HTMLElement).getBoundingClientRect();
				const dx = r.left + r.width / 2 - mx;
				const dy = r.top + r.height / 2 - my;
				const dist = Math.hypot(dx, dy);

				if (dist < REPEL_RADIUS) {
					const push = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
					const inv = 1 / (dist || 1);
					el.style.setProperty("--rx", `${dx * inv * push}px`);
					el.style.setProperty("--ry", `${dy * inv * push}px`);
				} else {
					el.style.setProperty("--rx", "0px");
					el.style.setProperty("--ry", "0px");
				}
			}
		};

		const schedule = () => {
			if (!raf) raf = requestAnimationFrame(apply);
		};

		const reset = () => {
			mx = -99999;
			my = -99999;
			schedule();
		};

		const onPointerMove = (e: PointerEvent) => {
			if (!visible) return;
			if (e.pointerType === "touch" && !touchHolding) return;
			mx = e.clientX;
			my = e.clientY;
			schedule();
		};

		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType !== "touch") return;
			touchHolding = true;
			mx = e.clientX;
			my = e.clientY;
			schedule();
		};

		const onPointerUp = (e: PointerEvent) => {
			if (e.pointerType !== "touch") return;
			touchHolding = false;
			reset();
		};

		// Unlike the splash, this sits on a very long page — stop tracking once the
		// hero is scrolled away rather than measuring letters on every pointer move
		// for the whole document.
		const observer = new IntersectionObserver(
			([entry]) => {
				visible = entry.isIntersecting;
				if (!visible) reset();
			},
			{ rootMargin: "100px" }
		);
		observer.observe(root);

		window.addEventListener("pointermove", onPointerMove, { passive: true });
		window.addEventListener("pointerdown", onPointerDown, { passive: true });
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerUp);
		window.addEventListener("blur", reset);
		document.addEventListener("mouseleave", reset);

		return () => {
			observer.disconnect();
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
			window.removeEventListener("blur", reset);
			document.removeEventListener("mouseleave", reset);
			cancelAnimationFrame(raf);
		};
	}, []);

	return (
		<h1
			className="v2-hero__wordmark v2-pixel"
			ref={rootRef}
			aria-label={text}
		>
			{Array.from(text).map((char, i) => (
				<span
					key={i}
					className="v2-hero__char"
					style={{ animationDelay: `${i * STAGGER}s` }}
					aria-hidden="true"
				>
					<span className="v2-hero__char-repel">{char}</span>
				</span>
			))}
		</h1>
	);
}
