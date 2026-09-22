"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Music, Pause, Play, SkipForward } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { useMusic } from "./MusicProvider";

/**
 * The dock CUSEC.FM keeps on every page but the landing page, where the full
 * CD widget is already in the collage. It sits in the bottom corner and
 * collapses to a single disc, so it never sits over a form field during the
 * ticket flow.
 */
export default function V2MiniPlayer() {
	const t = useTranslations("V2.dawn");
	const pathname = usePathname();
	const { track, playing, progress, toggle, step } = useMusic();
	const [open, setOpen] = useState(true);

	// The landing page has the real player; two of them would fight.
	if (pathname === "/" || pathname === "/meet") return null;

	return (
		<div
			className={`v2-mini${open ? " is-open" : ""}${playing ? " is-playing" : ""}`}
			data-music-controls
		>
			<button
				type="button"
				className="v2-mini__disc"
				onClick={() => (open ? toggle() : setOpen(true))}
				aria-label={open ? (playing ? t("player-pause") : t("player-play")) : t("player-title")}
			>
				<img
					src="/assets/v2/logo-icosahedron.webp"
					alt=""
					width={26}
					height={26}
					aria-hidden="true"
				/>
				{!open && <Music className="v2-mini__badge" size={11} aria-hidden="true" />}
			</button>

			{open && (
				<>
					<span className="v2-mini__meta">
						<span className="v2-mini__title v2-pixel">{t("player-title")}</span>
						<span className="v2-mini__track">{track.title}</span>
						<span className="v2-mini__progress" aria-hidden="true">
							<i style={{ width: `${Math.round(progress * 100)}%` }} />
						</span>
					</span>

					<span className="v2-mini__controls">
						<button type="button" className="v2-mini__btn" onClick={toggle}>
							{playing ? (
								<Pause size={14} aria-hidden="true" />
							) : (
								<Play size={14} aria-hidden="true" />
							)}
							<span className="v2-sr">{playing ? t("player-pause") : t("player-play")}</span>
						</button>
						<button type="button" className="v2-mini__btn" onClick={() => step(1)}>
							<SkipForward size={14} aria-hidden="true" />
							<span className="v2-sr">{t("player-next")}</span>
						</button>
						<button
							type="button"
							className="v2-mini__btn v2-mini__btn--close"
							onClick={() => setOpen(false)}
						>
							<ChevronDown size={14} aria-hidden="true" />
							<span className="v2-sr">{t("player-hide")}</span>
						</button>
					</span>
				</>
			)}
		</div>
	);
}
