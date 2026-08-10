import { useTranslations } from "next-intl";
import { BedDouble, Utensils, TrainFront, CalendarDays } from "lucide-react";
import V2CdPlayer from "./V2CdPlayer";
import V2Polaroid from "./V2Polaroid";

const KNOW_ICONS = [BedDouble, Utensils, TrainFront, CalendarDays];

export default function V2Dawn() {
	const t = useTranslations("V2.dawn");

	const stats = [1, 2, 3, 4] as const;
	const tags = [1, 2, 3] as const;
	const aboutStats = [1, 2, 3, 4] as const;
	const know = [1, 2, 3, 4] as const;

	return (
		<section className="v2-section v2-dawn" id="conference">
			<div className="v2-container">
				{/* --- top row: polaroid · stats · CD player --- */}
				<div className="v2-dawn__top">
					<V2Polaroid
						src="/assets/v2/photos/cam_0.webp"
						caption={t("photo-1-caption")}
						tilt={-3}
						className="v2-dawn__photo-1"
					/>

					<ul className="v2-dawn__stats">
						{stats.map((n) => (
							<li key={n} className="v2-stat">
								<span className="v2-stat__value v2-pixel">
									{t(`stat-${n}-value`)}
								</span>
								<span className="v2-stat__label">{t(`stat-${n}-label`)}</span>
							</li>
						))}
					</ul>

					<V2CdPlayer />
				</div>

				{/* --- collage row: about + who + photo + good-to-know --- */}
				<div className="v2-dawn__grid">
					<article className="v2-card v2-dawn__about">
						<p className="v2-card__eyebrow">{t("about-eyebrow")}</p>
						<h2 className="v2-card__title">{t("about-title")}</h2>
						<p className="v2-card__body">{t("about-body")}</p>

						<ul className="v2-dawn__tags">
							{tags.map((n) => (
								<li key={n}>
									<span className="v2-tag v2-pixel">{t(`about-tag-${n}`)}</span>
									<span>{t(`about-tag-${n}-body`)}</span>
								</li>
							))}
						</ul>

						<ul className="v2-dawn__about-stats">
							{aboutStats.map((n) => (
								<li key={n}>
									<span className="v2-pixel">{t(`about-stat-${n}-value`)}</span>
									<span>{t(`about-stat-${n}-label`)}</span>
								</li>
							))}
						</ul>
					</article>

					<article className="v2-card v2-dawn__who">
						<p className="v2-card__eyebrow">{t("who-eyebrow")}</p>
						<h2 className="v2-card__title">{t("who-title")}</h2>
						<p className="v2-card__body">{t("who-body")}</p>
						<a className="v2-dawn__who-link" href="#team">
							{t("who-link")} <span aria-hidden="true">→</span>
						</a>
					</article>

					<V2Polaroid
						src="/assets/v2/photos/cam_3.webp"
						caption={t("photo-2-caption")}
						tilt={3}
						className="v2-dawn__photo-2"
					/>

					<article className="v2-card v2-dawn__know">
						<p className="v2-card__eyebrow">{t("know-eyebrow")}</p>
						<ul className="v2-dawn__know-list">
							{know.map((n, i) => {
								const Icon = KNOW_ICONS[i];
								return (
									<li key={n}>
										<Icon size={17} aria-hidden="true" />
										<span>{t(`know-${n}`)}</span>
									</li>
								);
							})}
						</ul>
					</article>
				</div>
			</div>
		</section>
	);
}
