"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SkipBack, SkipForward, Play, Pause, Volume1 } from "lucide-react";

// Mii Plaza leads because it starts on the first beat; Main Menu opens on a
// beat of silence, which read as the player being broken.
const TRACKS = [
	{ title: "Mii Plaza", file: "Mii Plaza - Nintendo Wii Music Collection - Nintend'OST.mp3" },
	{ title: "Shop Channel", file: "Shop Channel - Nintendo Wii Music Collection - Nintend'OST.mp3" },
	{ title: "Main Menu", file: "Main Menu - Nintendo Wii Music Collection - Nintend'OST.mp3" },
];

/** Background level: audible, never loud. */
const DEFAULT_VOLUME = 0.08;

const src = (file: string) => encodeURI(`/assets/v2/audio/${file}`).replace(/'/g, "%27");

type Graph = { ctx: AudioContext; gain: GainNode };

/**
 * CUSEC.FM - the CD widget from the Figma frame, now a real player. It starts
 * the first track on its own: browsers refuse sound before the visitor has
 * interacted, so if the attempt on load is blocked it starts on their first
 * tap, click or key press anywhere on the page. Pausing it sticks.
 *
 * Volume goes through a Web Audio gain node, because iOS Safari ignores
 * `audio.volume` entirely and would otherwise play at full device volume.
 * The graph is only built inside a user gesture: an element routed into a
 * context that hasn't been resumed plays silently.
 */
export default function V2CdPlayer() {
	const t = useTranslations("V2.dawn");
	const rootRef = useRef<HTMLDivElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const graphRef = useRef<Graph | null>(null);
	const pausedByVisitor = useRef(false);
	const [index, setIndex] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [volume, setVolume] = useState(DEFAULT_VOLUME);
	const volumeRef = useRef(volume);

	const applyVolume = (v: number) => {
		const audio = audioRef.current;
		if (!audio) return;
		const graph = graphRef.current;
		if (graph) {
			audio.volume = 1;
			graph.gain.gain.value = v;
		} else {
			audio.volume = v;
		}
	};

	// Call only from a user gesture.
	const ensureGraph = () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (!graphRef.current) {
			const Ctx =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!Ctx) return;
			try {
				const ctx = new Ctx();
				const gain = ctx.createGain();
				ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
				graphRef.current = { ctx, gain };
			} catch {
				return;
			}
		}
		void graphRef.current.ctx.resume();
		applyVolume(volumeRef.current);
	};

	const play = () => {
		const audio = audioRef.current;
		if (!audio) return Promise.reject();
		applyVolume(volumeRef.current);
		return audio.play();
	};

	useEffect(() => {
		volumeRef.current = volume;
		applyVolume(volume);
	}, [volume]);

	// Start by default: try straight away, then fall back to the first gesture.
	useEffect(() => {
		const events = ["pointerdown", "keydown", "touchend"] as const;
		const detach = () => events.forEach((e) => window.removeEventListener(e, onGesture, true));
		function onGesture(e: Event) {
			// The player's own buttons handle themselves; starting here too would
			// have the same click immediately pause it again.
			if (rootRef.current?.contains(e.target as Node)) return detach();
			detach();
			if (pausedByVisitor.current || !audioRef.current?.paused) return;
			ensureGraph();
			void play().catch(() => {});
		}

		play().then(detach, () => {
			events.forEach((e) => window.addEventListener(e, onGesture, true));
		});
		return detach;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playing) void play().catch(() => setPlaying(false));
		// Only a track change should restart playback here.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [index]);

	const toggle = () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (audio.paused) {
			pausedByVisitor.current = false;
			ensureGraph();
			play().then(
				() => setPlaying(true),
				() => setPlaying(false)
			);
		} else {
			pausedByVisitor.current = true;
			audio.pause();
			setPlaying(false);
		}
	};

	const step = (delta: number) => {
		setProgress(0);
		setIndex((i) => (i + delta + TRACKS.length) % TRACKS.length);
	};

	const track = TRACKS[index];

	return (
		<div className="v2-cd" ref={rootRef}>
			<audio
				ref={audioRef}
				src={src(track.file)}
				preload="auto"
				onTimeUpdate={(e) => {
					const a = e.currentTarget;
					setProgress(a.duration ? a.currentTime / a.duration : 0);
				}}
				onEnded={() => step(1)}
				onPause={() => setPlaying(false)}
				onPlay={() => setPlaying(true)}
			/>

			<div className="v2-cd__head">
				<span className="v2-cd__title v2-pixel">{t("player-title")}</span>
				<span className="v2-cd__bars" aria-hidden="true">
					<i />
					<i />
					<i />
					<i />
				</span>
			</div>

			<button
				type="button"
				className={`v2-cd__disc${playing ? " is-spinning" : ""}`}
				onClick={toggle}
				aria-label={playing ? t("player-pause") : t("player-play")}
			>
				<span className="v2-cd__hub">
					<img
						src="/assets/v2/logo-icosahedron.webp"
						alt=""
						width={56}
						height={56}
						aria-hidden="true"
					/>
				</span>
				<span className="v2-cd__spindle" aria-hidden="true" />
			</button>

			<p className="v2-cd__track" aria-live="polite">
				{t("player-now-playing", { track: track.title })}
			</p>

			<div className="v2-cd__progress" aria-hidden="true">
				<span style={{ width: `${Math.round(progress * 100)}%` }} />
			</div>

			<div className="v2-cd__controls">
				<button
					type="button"
					className="v2-cd__btn"
					onClick={() => {
						ensureGraph();
						step(-1);
					}}
				>
					<SkipBack size={16} aria-hidden="true" />
					<span className="v2-sr">{t("player-prev")}</span>
				</button>
				<button type="button" className="v2-cd__btn v2-cd__btn--play" onClick={toggle}>
					{playing ? (
						<Pause size={18} aria-hidden="true" />
					) : (
						<Play size={18} aria-hidden="true" />
					)}
					<span className="v2-sr">{playing ? t("player-pause") : t("player-play")}</span>
				</button>
				<button
					type="button"
					className="v2-cd__btn"
					onClick={() => {
						ensureGraph();
						step(1);
					}}
				>
					<SkipForward size={16} aria-hidden="true" />
					<span className="v2-sr">{t("player-next")}</span>
				</button>
			</div>

			<label className="v2-cd__volume">
				<Volume1 size={14} aria-hidden="true" />
				<span className="v2-sr">{t("player-volume")}</span>
				<input
					type="range"
					min={0}
					max={1}
					step={0.01}
					value={volume}
					onChange={(e) => {
						ensureGraph();
						setVolume(Number(e.target.value));
					}}
				/>
			</label>
		</div>
	);
}
