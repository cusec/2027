import { useTranslations } from "next-intl";

const TIERS = ["platinum", "gold", "silver", "partner"] as const;

export default function V2SponsorTiers() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-spon-tiers" id="tiers">
			<div className="v2-container">
				<article className="v2-card v2-glass v2-spon-tiers__card">
					<p className="v2-card__eyebrow">{t("tiers-eyebrow")}</p>
					<h2 className="v2-card__title">{t("tiers-title")}</h2>

					<ul className="v2-spon-tiers__list">
						{TIERS.map((tier) => (
							<li key={tier}>
								<span className={`v2-spon-tier v2-spon-tier--${tier} v2-pixel`}>
									{t(`tier-name-${tier}`)}
								</span>
							</li>
						))}
					</ul>

					<p className="v2-card__body">{t("tiers-body")}</p>
				</article>
			</div>
		</section>
	);
}
