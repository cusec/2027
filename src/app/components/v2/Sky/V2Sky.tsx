import { useTranslations } from "next-intl";

export default function V2Sky() {
	const t = useTranslations("V2.sky");

	const cards = [1, 2, 3] as const;

	return (
		<section className="v2-section v2-sky v2-reveal" id="about">
			<div className="v2-container">
				<h2 className="v2-sky__heading v2-pixel">{t("heading")}</h2>

				<ul className="v2-sky__cards">
					{cards.map((n) => (
						<li key={n} className="v2-sky__card v2-glass v2-glass--blue">
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
