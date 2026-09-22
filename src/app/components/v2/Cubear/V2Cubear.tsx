"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Cubear, the mascot, dropping in now and then. Visits alternate:
 *
 *   - Shock peeks in from a random edge (bottom, left or right), holds for a
 *     few seconds and ducks back out.
 *   - Erm floats up the screen trapped in a soap bubble, which pops.
 *
 * Purely decorative - aria-hidden and pointer-events: none, below the navbar,
 * the CUSEC.FM dock and every dialog - so it can never sit between a visitor
 * and a button or form field. Side peeks stay in the middle band of the
 * screen, and bottom peeks and bubbles keep off the bottom-left, where the
 * dock lives.
 *
 * The poses are Blender renders of the mascot's STL models (see
 * public/assets/v2/cubear/). Each is decoded before it appears, so it never
 * slides in half-loaded, and nothing is fetched until the first visit - well
 * after the hero has painted.
 */
const SHOCK = "/assets/v2/cubear/cubear-shock.webp";
const ERM = "/assets/v2/cubear/cubear-erm.webp";

const FIRST_VISIT_MS = [3_000, 5_000] as const;
const BETWEEN_VISITS_MS = [4_000, 7_000] as const;
const PEEK_STAY_MS = 4_000;
/** Matches the slide transition on .v2-cubear in cubear.css. */
const PEEK_MOVE_MS = 700;

type Side = "bottom" | "left" | "right";
type Visit =
	| { kind: "peek"; side: Side; pos: number; tilt: number }
	| { kind: "bubble"; left: number };

const between = (min: number, max: number) => min + Math.random() * (max - min);

function nextPeek(): Visit {
	const side = (["bottom", "left", "right"] as const)[Math.floor(Math.random() * 3)];
	// bottom: % from the left, clear of the dock; sides: % from the top, clear
	// of the navbar above and the dock below.
	const pos =
		side === "bottom" ? between(45, 85) : side === "left" ? between(28, 55) : between(25, 68);
	return { kind: "peek", side, pos, tilt: between(-8, 8) };
}

function nextBubble(): Visit {
	// The outer edges, so the bubble drifts past the page's content - the hero
	// wordmark reaches well past three quarters of the width - rather than
	// across it.
	return { kind: "bubble", left: Math.random() < 0.5 ? between(6, 13) : between(87, 94) };
}

async function decoded(src: string) {
	const img = new Image();
	img.src = src;
	await img.decode();
}

/**
 * Kept out of the ticket flow: a bear drifting past every few seconds pulls
 * attention away from a form someone is trying to finish. Unmounting (rather
 * than pausing) means leaving the flow starts the visits over cleanly.
 */
export default function V2Cubear() {
	const pathname = usePathname();
	if (pathname === "/tickets" || pathname.startsWith("/tickets/")) return null;
	return <CubearVisits />;
}

function CubearVisits() {
	const [visit, setVisit] = useState<Visit | null>(null);
	const [up, setUp] = useState(false);
	const timer = useRef<number | undefined>(undefined);
	const count = useRef(0);
	const finish = useRef<() => void>(() => {});

	useEffect(() => {
		let cancelled = false;
		const later = (fn: () => void, ms: number) => {
			window.clearTimeout(timer.current);
			timer.current = window.setTimeout(fn, ms);
		};
		const schedule = (range: readonly [number, number]) => later(show, between(...range));

		finish.current = () => {
			setVisit(null);
			setUp(false);
			schedule(BETWEEN_VISITS_MS);
		};

		async function show() {
			// A hidden tab has no one to visit; try again later.
			if (document.hidden) return schedule(BETWEEN_VISITS_MS);
			const next = count.current % 2 === 0 ? nextPeek() : nextBubble();
			try {
				await decoded(next.kind === "peek" ? SHOCK : ERM);
			} catch {
				return schedule(BETWEEN_VISITS_MS);
			}
			if (cancelled) return;
			count.current += 1;
			setVisit(next);
			if (next.kind === "bubble") return; // its CSS animation ends the visit
			// Paint the hidden position first so the slide actually transitions.
			requestAnimationFrame(() => requestAnimationFrame(() => setUp(true)));
			later(() => {
				setUp(false);
				later(() => finish.current(), PEEK_MOVE_MS);
			}, PEEK_MOVE_MS + PEEK_STAY_MS);
		}

		schedule(FIRST_VISIT_MS);
		return () => {
			cancelled = true;
			window.clearTimeout(timer.current);
		};
	}, []);

	if (!visit) return null;

	if (visit.kind === "bubble") {
		return (
			<div
				className="v2-cubear-bubble"
				style={{ left: `${visit.left}%` }}
				aria-hidden="true"
				onAnimationEnd={(e) => {
					if (e.target === e.currentTarget) finish.current();
				}}
			>
				<div className="v2-cubear-bubble__sway">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={ERM} alt="" width={120} height={187} />
					<span className="v2-cubear-bubble__film" />
				</div>
			</div>
		);
	}

	return (
		<div
			className={`v2-cubear v2-cubear--${visit.side}${up ? " is-up" : ""}`}
			style={
				{ "--cubear-pos": `${visit.pos}%`, "--cubear-tilt": `${visit.tilt}deg` } as React.CSSProperties
			}
			aria-hidden="true"
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={SHOCK} alt="" width={180} height={236} />
		</div>
	);
}
