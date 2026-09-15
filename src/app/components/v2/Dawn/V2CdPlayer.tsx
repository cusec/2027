"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SkipBack, SkipForward, Play, Pause, Volume1 } from "lucide-react";

const TRACKS = [
	{ title: "Main Menu", file: "Main Menu - Nintendo Wii Music Collection - Nintend'OST.mp3" },
	{ title: "Mii Plaza", file: "Mii Plaza - Nintendo Wii Music Collection - Nintend'OST.mp3" },
	{ title: "Shop Channel", file: "Shop Channel - Nintendo Wii Music Collection - Nintend'OST.mp3" },
];

const DEFAULT_VOLUME = 0.05;

const src = (file: string) => encodeURI(`/assets/v2/audio/${file}`).replace(/'/g, "%27");

/**
 * CUSEC.FM - the CD widget from the Figma frame, now a real player. Nothing
 * plays until the visitor presses play; the disc spins while it does, and the
 * playlist loops.
 */
export default function V2CdPlayer() {
	const t = useTranslations("V2.dawn");
	const audioRef = useRef<HTMLAudioElement>(null);
	const [index, setIndex] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [volume, setVolume] = useState(DEFAULT_VOLUME);

	useEffect(() => {
		if (audioRef.current) audioRef.current.volume = volume;
	}, [volume]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.volume = volume;
		if (playing) void audio.play().catch(() => setPlaying(false));
		// Only a track change should restart playback here.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [index]);

	const toggle = () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (audio.paused) {
			audio.volume = volume;
			audio.play().then(
				() => setPlaying(true),
				() => setPlaying(false)
			);
		} else {
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
		<div className="v2-cd">
			<audio
				ref={audioRef}
				src={src(track.file)}
				preload="none"
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
				<button type="button" className="v2-cd__btn" onClick={() => step(-1)}>
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
				<button type="button" className="v2-cd__btn" onClick={() => step(1)}>
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
					onChange={(e) => setVolume(Number(e.target.value))}
				/>
			</label>
		</div>
	);
}
