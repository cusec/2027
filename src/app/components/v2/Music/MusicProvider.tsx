"use client";

import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import V2MiniPlayer from "./V2MiniPlayer";
import { usePathname } from "@/i18n/navigation";

// splash leads: it is the one on-theme track and it opens on the first beat.
// Of the rest, Main Menu goes last because it opens on a beat of silence,
// which read as the player being broken.
export const TRACKS = [
	{ title: "splash by DreamWeaver", file: "dreamweaver - blue garden - 10 splash.mp3" },
	{ title: "Mii Plaza", file: "Mii Plaza - Nintendo Wii Music Collection - Nintend'OST.mp3" },
	{ title: "Shop Channel", file: "Shop Channel - Nintendo Wii Music Collection - Nintend'OST.mp3" },
	{ title: "Main Menu", file: "Main Menu - Nintendo Wii Music Collection - Nintend'OST.mp3" },
];

/** Background level: audible, never loud. */
const DEFAULT_VOLUME = 0.08;

const src = (file: string) => encodeURI(`/assets/v2/audio/${file}`).replace(/'/g, "%27");

type Graph = { ctx: AudioContext; gain: GainNode };

type MusicApi = {
	track: (typeof TRACKS)[number];
	index: number;
	playing: boolean;
	progress: number;
	volume: number;
	toggle: () => void;
	step: (delta: number) => void;
	changeVolume: (v: number) => void;
};

const MusicContext = createContext<MusicApi | null>(null);

export function useMusic() {
	const api = useContext(MusicContext);
	if (!api) throw new Error("useMusic must be used inside MusicProvider");
	return api;
}

/**
 * Owns the one <audio> element on the site. It is mounted in the locale layout
 * rather than inside the CD widget so playback survives navigation - a visitor
 * who starts a track on the landing page keeps it through the ticket flow.
 * Two views render it: the CUSEC.FM widget in the collage (V2CdPlayer) and the
 * small dock on every other page (V2MiniPlayer).
 *
 * It starts the first track on its own: browsers refuse sound before the
 * visitor has interacted, so if the attempt on load is blocked it starts on
 * their first tap, click or key press anywhere on the page. Pausing sticks.
 *
 * Volume goes through a Web Audio gain node, because iOS Safari ignores
 * `audio.volume` entirely and would otherwise play at full device volume. The
 * graph is only built inside a user gesture: an element routed into a context
 * that has not been resumed plays silently.
 */
export default function MusicProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	if (pathname === "/meet" || pathname === "/admin" || pathname.startsWith("/admin/")) return <>{children}</>;
	return <MusicPlayback>{children}</MusicPlayback>;
}

function MusicPlayback({ children }: { children: ReactNode }) {
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
			// The player's own controls handle themselves; starting here too would
			// have the same click immediately pause it again.
			if ((e.target as Element | null)?.closest?.("[data-music-controls]")) return detach();
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
		ensureGraph();
		setProgress(0);
		setIndex((i) => (i + delta + TRACKS.length) % TRACKS.length);
	};

	const changeVolume = (v: number) => {
		ensureGraph();
		setVolume(v);
	};

	return (
		<MusicContext.Provider
			value={{ track: TRACKS[index], index, playing, progress, volume, toggle, step, changeVolume }}
		>
			<audio
				ref={audioRef}
				src={src(TRACKS[index].file)}
				preload="auto"
				onTimeUpdate={(e) => {
					const a = e.currentTarget;
					setProgress(a.duration ? a.currentTime / a.duration : 0);
				}}
				onEnded={() => step(1)}
				onPause={() => setPlaying(false)}
				onPlay={() => setPlaying(true)}
			/>
			{children}
			<V2MiniPlayer />
		</MusicContext.Provider>
	);
}
