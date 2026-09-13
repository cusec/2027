import { useTranslations } from "next-intl";

export default function V2SponsorCta() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-spon-cta">
			<div className="v2-container">
				<h2 className="v2-spon-cta__title v2-pixel">{t("closing-title")}</h2>
				<a
					className="v2-btn v2-btn--primary"
					href="mailto:info@cusec.net?subject=CUSEC%202027%20sponsorship"
				>
					{t("closing-cta")}
				</a>
			</div>
		</section>
	);
}
