"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { V2CubearBubble } from "./V2CubearBubble";

/**
 * Cubear, the mascot, dropping in now and then. Two kinds of visit:
 *
 *   - A peek: one of five poses slides in from a random edge (bottom, left
 *     or right), holds for a few seconds and ducks back out. A different
 *     pose from the last one every time, so it reads as "the mascot", not
 *     one repeating sticker.
 *   - A bubble: Erm floats up the screen trapped in a soap bubble, which
 *     pops near the top.
 *
 * The ticket flow only gets peeks - no bubble. A soap bubble drifting up the
 * screen for ten seconds is a bigger ask on someone's attention than a quick
 * peek, and the flow is where that attention matters most. Everywhere else
 * the two kinds keep alternating as before.
 *
 * Peeks are purely decorative except for one Easter egg: on a fine pointer,
 * hovering a peek shows a small word bubble. The soap bubble does the same on
 * hover and while dragged (so touch users see it too). The full mascot layer
 * stays below the CUSEC.FM dock, navbar and every dialog, and the word
 * bubbles take no pointer events. Only one visit is ever on screen at a time.
 *
 * The poses are Blender renders of the mascot's STL models (see
 * public/assets/v2/cubear/). Each is decoded before it appears, so it never
 * slides in half-loaded, and nothing is fetched until the first visit - well
 * after the hero has painted.
 */
const PEEK_POSES = [
	{ src: "/assets/v2/cubear/cubear-shock.webp", w: 360, h: 473 },
	{ src: "/assets/v2/cubear/cubear-book.webp", w: 360, h: 514 },
	{ src: "/assets/v2/cubear/cubear-default.webp", w: 360, h: 628 },
	{ src: "/assets/v2/cubear/cubear-speaker.webp", w: 360, h: 606 },
	{ src: "/assets/v2/cubear/cubear-laptop.webp", w: 360, h: 423 },
] as const;

type Pose = Readonly<{ src: string; w: number; h: number }>;

/** Every pose takes a turn in the bubble, so a visitor meets the whole cast. */
const BUBBLE_POSES: readonly Pose[] = [
	{ src: "/assets/v2/cubear/cubear-erm.webp", w: 360, h: 562 },
	...PEEK_POSES,
];

/** A random pose other than the one shown last time, so it never repeats back to back. */
function pickPose(poses: readonly Pose[], excludeSrc: string | null): Pose {
	const choices = excludeSrc ? poses.filter((p) => p.src !== excludeSrc) : poses;
	return choices[Math.floor(Math.random() * choices.length)];
}

const FIRST_VISIT_MS = [3_000, 5_000] as const;
const BETWEEN_VISITS_MS = [4_000, 7_000] as const;
const PEEK_STAY_MS = 4_000;
/** Matches the slide transition on .v2-cubear in cubear.css. */
const PEEK_MOVE_MS = 700;

type Side = "bottom" | "left" | "right";
type Visit =
	| { kind: "peek"; side: Side; pos: number; tilt: number; pose: Pose; phraseIndex: number }
	| { kind: "bubble"; left: number; pose: Pose; phraseIndex: number };

const between = (min: number, max: number) => min + Math.random() * (max - min);

function nextPeek(excludeSrc: string | null, phraseIndex: number): Visit {
	const pose = pickPose(PEEK_POSES, excludeSrc);
	// The laptop pose is wide and low rather than tall - rotating it 90deg to
	// peek sideways reads oddly, so it only ever peeks from the bottom.
	const wide = pose.h / pose.w < 1.3;
	const side = wide ? "bottom" : (["bottom", "left", "right"] as const)[Math.floor(Math.random() * 3)];
	// bottom: % from the left, clear of the dock; sides: % from the top, clear
	// of the navbar above and the dock below.
	const pos =
		side === "bottom" ? between(45, 85) : side === "left" ? between(28, 55) : between(25, 68);
	return { kind: "peek", side, pos, tilt: between(-8, 8), pose, phraseIndex };
}

function nextBubble(excludeSrc: string | null, phraseIndex: number): Visit {
	// The outer edges, so the bubble drifts past the page's content - the hero
	// wordmark reaches well past three quarters of the width - rather than
	// across it.
	return {
		kind: "bubble",
		left: Math.random() < 0.5 ? between(6, 13) : between(87, 94),
		pose: pickPose(BUBBLE_POSES, excludeSrc),
		phraseIndex,
	};
}

async function decoded(src: string) {
	const img = new Image();
	img.src = src;
	await img.decode();
}

/**
 * Reads the route so the ticket flow can turn the bubble off (see the module
 * doc comment) without ever unmounting the mascot - a peek should carry on
 * smoothly across navigation, not restart because the route changed.
 */
export default function V2Cubear() {
	const pathname = usePathname();
	const onTicketFlow = pathname === "/tickets" || pathname.startsWith("/tickets/");
	if (pathname === "/meet" || pathname === "/admin" || pathname.startsWith("/admin/")) return null;
	return <CubearVisits bubbleEnabled={!onTicketFlow} />;
}

function CubearVisits({ bubbleEnabled }: { bubbleEnabled: boolean }) {
	const [visit, setVisit] = useState<Visit | null>(null);
	const [up, setUp] = useState(false);
	const timer = useRef<number | undefined>(undefined);
	const count = useRef(0);
	const lastPeekSrc = useRef<string | null>(null);
	const lastBubbleSrc = useRef<string | null>(null);
	const finish = useRef<() => void>(() => {});
	const t = useTranslations("V2.cubear");
	const phrases = ((t.raw("phrases") as string[] | undefined) ?? []).filter(Boolean);
	const phrasesRef = useRef(phrases);
	useEffect(() => {
		phrasesRef.current = phrases;
	}, [phrases]);
	// Read fresh inside the scheduling loop below, which is set up once.
	const bubbleEnabledRef = useRef(bubbleEnabled);
	useEffect(() => {
		bubbleEnabledRef.current = bubbleEnabled;
	}, [bubbleEnabled]);

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
			const useBubble = bubbleEnabledRef.current && count.current % 2 === 1;
			const line = phrasesRef.current;
			const phraseIndex = line.length ? Math.floor(Math.random() * line.length) : -1;
			const next = useBubble
				? nextBubble(lastBubbleSrc.current, phraseIndex)
				: nextPeek(lastPeekSrc.current, phraseIndex);
			try {
				await decoded(next.pose.src);
			} catch {
				return schedule(BETWEEN_VISITS_MS);
			}
			if (cancelled) return;
			count.current += 1;
			if (next.kind === "peek") lastPeekSrc.current = next.pose.src;
			else lastBubbleSrc.current = next.pose.src;
			setVisit(next);
			if (next.kind === "bubble") return;
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

	const phrase = visit.phraseIndex >= 0 ? phrases[visit.phraseIndex] : undefined;

	if (visit.kind === "bubble") {
		return (
			<V2CubearBubble
				left={visit.left}
				pose={visit.pose}
				phrase={phrase}
				onFinished={() => finish.current()}
			/>
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
			<img src={visit.pose.src} alt="" width={visit.pose.w / 2} height={visit.pose.h / 2} />
			{phrase && <span className="v2-cubear-speech">{phrase}</span>}
		</div>
	);
}
