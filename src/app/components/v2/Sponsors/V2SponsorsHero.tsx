import { useTranslations } from "next-intl";

export default function V2SponsorsHero() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-page-hero" id="top">
			<div className="v2-container v2-page-hero__inner">
				<p className="v2-page-hero__badge v2-pixel">{t("badge")}</p>
				<h1 className="v2-page-hero__title v2-pixel">{t("page-heading")}</h1>
				<p className="v2-page-hero__subline">{t("subline")}</p>

				<div className="v2-page-hero__actions">
					<a
						className="v2-btn v2-btn--primary"
						href="mailto:info@cusec.net?subject=CUSEC%202027%20sponsorship"
					>
						{t("cta-primary")} <span aria-hidden="true">→</span>
					</a>
					<a className="v2-btn v2-btn--ghost" href="#tiers">
						{t("cta-secondary")}
					</a>
				</div>
			</div>
		</section>
	);
}
