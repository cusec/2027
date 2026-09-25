"use client";

import { useTranslations } from "next-intl";
import { SkipBack, SkipForward, Play, Pause, Volume1 } from "lucide-react";
import { useMusic } from "@/app/components/v2/Music/MusicProvider";

/**
 * CUSEC.FM - the CD widget from the Figma frame. The audio itself lives in
 * MusicProvider (mounted in the locale layout) so a track keeps playing when
 * the visitor leaves this page; this component is only its face on the
 * landing page.
 */
export default function V2CdPlayer() {
	const t = useTranslations("V2.dawn");
	const { track, playing, progress, volume, toggle, step, changeVolume } = useMusic();

	return (
		<div className="v2-cd">
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
					onChange={(e) => changeVolume(Number(e.target.value))}
				/>
			</label>
		</div>
	);
}
