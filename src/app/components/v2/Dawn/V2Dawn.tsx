import { useTranslations } from "next-intl";
import V2CdPlayer from "./V2CdPlayer";
import V2Polaroid from "./V2Polaroid";

export default function V2Dawn() {
	const t = useTranslations("V2.dawn");

	const stats = [1, 2, 3, 4] as const;
	const tags = [1, 2, 3] as const;
	const aboutStats = [1, 2, 3, 4] as const;
	const knowPoints = [1, 2, 3, 4] as const;

	return (
		<section className="v2-section v2-dawn v2-reveal" id="conference">
			<div className="v2-container">
				{/* --- top row: polaroid · stats · CD player --- */}
				<div className="v2-dawn__top">
					<V2Polaroid
						src="/assets/v2/photos/cam_0.webp"
						caption={t("photo-1-caption")}
						tilt={-3}
						className="v2-dawn__photo-1"
					/>

					<div className="v2-dawn__stats-group">
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

						<a className="v2-btn v2-btn--primary" href="#passes">
							{t("stats-cta")}
						</a>
					</div>

					<V2CdPlayer />
				</div>

				<div className="v2-dawn__grid">
					<article className="v2-card v2-glass v2-dawn__about">
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

						<p className="v2-dawn__about-stats-label v2-pixel">
							{t("about-stats-label")}
						</p>
						<ul className="v2-dawn__about-stats">
							{aboutStats.map((n) => (
								<li key={n}>
									<span className="v2-pixel">{t(`about-stat-${n}-value`)}</span>
									<span>{t(`about-stat-${n}-label`)}</span>
								</li>
							))}
						</ul>
					</article>

					<article className="v2-card v2-glass v2-dawn__who">
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

					{/* Every line here restates something the site already states
					    elsewhere (hero pill, FAQ) — nothing about the venue, meals or
					    transit, which are still unconfirmed. */}
					<article className="v2-card v2-glass v2-dawn__know">
						<p className="v2-card__eyebrow">{t("know-eyebrow")}</p>
						<ul className="v2-dawn__know-list">
							{knowPoints.map((n) => (
								<li key={n}>
									<span>{t(`know-${n}`)}</span>
								</li>
							))}
						</ul>
					</article>
				</div>
			</div>
		</section>
	);
}
