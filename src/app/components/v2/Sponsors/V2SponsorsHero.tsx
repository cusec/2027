import { useTranslations } from "next-intl";

export default function V2SponsorsHero() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-page-hero v2-spon-hero" id="top">
			<div className="v2-container v2-page-hero__inner">
				<h1 className="v2-page-hero__title v2-pixel">{t("page-heading")}</h1>
				{/* The PDF destination will be supplied later. */}
				<a className="v2-spon-hero__package" aria-disabled="true">
					{t("package-link")}
				</a>
			</div>
		</section>
	);
}
