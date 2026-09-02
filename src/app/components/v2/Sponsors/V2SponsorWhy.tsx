import { useTranslations } from "next-intl";
import V2Polaroid from "../Dawn/V2Polaroid";

const STATS = [2, 3, 1, 4] as const;

/**
 * Every figure here is read straight out of V2.dawn rather than restated, so
 * the sponsor pitch can never drift from the numbers the landing page shows.
 */
export default function V2SponsorWhy() {
	const t = useTranslations("V2.sponsors");
	const d = useTranslations("V2.dawn");

	return (
		<section className="v2-section v2-spon-why">
			<div className="v2-container v2-spon-why__inner">
				<article className="v2-card v2-glass v2-spon-why__card">
					<p className="v2-card__eyebrow">{t("why-eyebrow")}</p>
					<h2 className="v2-card__title">{t("why-title")}</h2>
					<p className="v2-card__body">{t("why-body")}</p>

					<ul className="v2-spon-why__stats">
						{STATS.map((n) => (
							<li key={n}>
								<span className="v2-pixel">{d(`stat-${n}-value`)}</span>
								<span>{d(`stat-${n}-label`)}</span>
							</li>
						))}
					</ul>
				</article>

				<V2Polaroid
					src="/assets/v2/photos/cam_0.webp"
					caption={t("photo-caption")}
					tilt={-2.5}
					className="v2-spon-why__photo"
				/>
			</div>
		</section>
	);
}
