"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { EDITIONS } from "./archiveData";
import V2SdCard from "./V2SdCard";

export default function V2Archive() {
	const t = useTranslations("V2.archive");
	const [yearIndex, setYearIndex] = useState(0);
	const [shotIndex, setShotIndex] = useState(0);
	// drives the insert/eject animation and the LCD glitch
	const [swapping, setSwapping] = useState(false);

	const edition = EDITIONS[yearIndex];
	const photo = edition.photos[shotIndex];

	function loadCard(index: number) {
		if (index === yearIndex) return;
		setSwapping(true);
		// let the card travel into the slot before the screen changes over
		window.setTimeout(() => {
			setYearIndex(index);
			setShotIndex(0);
		}, 260);
		window.setTimeout(() => setSwapping(false), 620);
	}

	function step(delta: number) {
		const n = edition.photos.length;
		if (n === 0) return;
		setShotIndex((i) => (i + delta + n) % n);
	}

	return (
		<section className="v2-section v2-archive v2-reveal" id="archive">
			<div className="v2-container">
				<div className="v2-archive__head">
					<h2 className="v2-heading-pill">
						<Camera size={20} aria-hidden="true" />
						{t("heading")}
					</h2>
				</div>

				<div className="v2-archive__stage">
					{/* ---------------- camera ---------------- */}
					<div className={`v2-cam${swapping ? " is-swapping" : ""}`}>
						<div className="v2-cam__top">
							<span className="v2-cam__name v2-pixel">{t("camera-name")}</span>
							<span className="v2-cam__pwr">
								<i aria-hidden="true" />
								<span className="v2-pixel">{t("power")}</span>
							</span>
						</div>

						{/* LCD */}
						<div className="v2-cam__screen">
							{photo ? (
								<img
									className="v2-cam__photo"
									src={photo.src}
									alt=""
									aria-hidden="true"
								/>
							) : (
								<span className="v2-cam__empty">{t("empty-card")}</span>
							)}
							<span className="v2-cam__scan" aria-hidden="true" />

							<span className="v2-cam__rec v2-pixel">
								<i aria-hidden="true" />
								{t("play")}
								<b aria-hidden="true" />
							</span>

							<span className="v2-cam__battery" aria-hidden="true">
								<i />
								<i />
								<i />
							</span>

							<span className="v2-cam__caption">
								{photo?.caption ?? t("empty-card")}
							</span>
							<span className="v2-cam__meta v2-pixel">
								SD:{edition.year}_MTL · {photo ? `PHOTO ${shotIndex + 1}/${edition.photos.length}` : "NO PHOTOS"}
							</span>
							{photo?.stamp ? (
								<span className="v2-cam__stamp v2-pixel">{photo.stamp}</span>
							) : null}
						</div>

						{/* right-hand controls — decorative */}
						<div className="v2-cam__controls" aria-hidden="true">
							<span className="v2-cam__speaker" />

							<span className="v2-cam__dial">
								<i />
								<b className="v2-pixel">SD</b>
							</span>
							<span className="v2-cam__dial-label v2-pixel">{t("dial")}</span>

							<span className="v2-cam__dpad">
								<i className="v2-cam__dpad-v" />
								<i className="v2-cam__dpad-h" />
								<b className="v2-pixel">OK</b>
							</span>

							<span className="v2-cam__rocker v2-pixel">
								<span>W</span>
								<span>T</span>
							</span>

							<span className="v2-cam__menu v2-pixel">{t("menu")}</span>
						</div>

						{/* thumbnail strip */}
						<div className="v2-cam__strip">
							{edition.photos.map((p, i) => (
								<button
									key={p.src + i}
									type="button"
									className={`v2-cam__thumb${i === shotIndex ? " is-active" : ""}`}
									onClick={() => setShotIndex(i)}
									aria-current={i === shotIndex}
								>
									<img src={p.src} alt="" aria-hidden="true" />
									<span className="v2-sr">{p.caption}</span>
								</button>
							))}

							<span className="v2-cam__browse">
								<button type="button" onClick={() => step(-1)}>
									<ChevronLeft size={14} aria-hidden="true" />
									<span className="v2-sr">{t("prev-photo")}</span>
								</button>
								<button type="button" onClick={() => step(1)}>
									<ChevronRight size={14} aria-hidden="true" />
									<span className="v2-sr">{t("next-photo")}</span>
								</button>
							<span>
								{edition.photos.length === 0
									? t("empty-card")
									: t("browse", { count: edition.count })}
							</span>
							</span>
						</div>

						<span className="v2-cam__slot" aria-hidden="true" />
					</div>

					{/* ---------------- SD cards ---------------- */}
					<div className="v2-archive__cards" role="group">
						{EDITIONS.map((e, i) => (
							<div
								key={e.year}
								/* the loaded card sits in the camera's slot; the rest close
								   ranks into the three resting spots beside it */
								className={
									i === yearIndex
										? "v2-archive__slot is-inserted"
										: `v2-archive__slot v2-archive__slot--rest-${
												i < yearIndex ? i : i - 1
											}`
								}
							>
								<V2SdCard
									edition={e}
									inserted={i === yearIndex}
									label={t("card-label", { year: e.year, count: e.count })}
									insertLabel={`${t("insert")} ›`}
									ariaLabel={t("select-card", { year: e.year })}
									onSelect={() => loadCard(i)}
								/>
							</div>
						))}
					</div>
				</div>

			</div>
		</section>
	);
}
