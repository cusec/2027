"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SkipBack, SkipForward, Play, Pause } from "lucide-react";

/**
 * CUSEC.FM — the decorative CD widget from the Figma frame.
 * It does not play audio; clicking play just spins the disc.
 */
export default function V2CdPlayer() {
	const t = useTranslations("V2.dawn");
	const [spinning, setSpinning] = useState(false);

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
				className={`v2-cd__disc${spinning ? " is-spinning" : ""}`}
				onClick={() => setSpinning((v) => !v)}
				aria-label={spinning ? t("player-pause") : t("player-play")}
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

			<p className="v2-cd__track">{t("player-now-playing")}</p>

			<div className="v2-cd__progress" aria-hidden="true">
				<span />
			</div>

			<div className="v2-cd__controls">
				<button type="button" className="v2-cd__btn">
					<SkipBack size={16} aria-hidden="true" />
					<span className="v2-sr">{t("player-prev")}</span>
				</button>
				<button
					type="button"
					className="v2-cd__btn v2-cd__btn--play"
					onClick={() => setSpinning((v) => !v)}
				>
					{spinning ? (
						<Pause size={18} aria-hidden="true" />
					) : (
						<Play size={18} aria-hidden="true" />
					)}
					<span className="v2-sr">
						{spinning ? t("player-pause") : t("player-play")}
					</span>
				</button>
				<button type="button" className="v2-cd__btn">
					<SkipForward size={16} aria-hidden="true" />
					<span className="v2-sr">{t("player-next")}</span>
				</button>
			</div>

			<p className="v2-cd__hint">{t("player-hint")}</p>
		</div>
	);
}
