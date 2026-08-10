import { useTranslations } from "next-intl";

export default function V2Sky() {
	const t = useTranslations("V2.sky");

	const cards = [1, 2, 3] as const;

	return (
		<section className="v2-section v2-sky" id="about">
			<div className="v2-container">
				<p className="v2-sky__eyebrow v2-pixel">{t("eyebrow")}</p>

				<h2 className="v2-sky__heading v2-pixel">{t("heading")}</h2>

				<p className="v2-sky__subline v2-pixel">{t("subline")}</p>

				<ul className="v2-sky__cards">
					{cards.map((n) => (
						<li key={n} className="v2-sky__card">
							<h3 className="v2-sky__card-title v2-pixel">
								{t(`card-${n}-title`)}
							</h3>
							<p className="v2-sky__card-body">{t(`card-${n}-body`)}</p>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
