import { useTranslations } from "next-intl";

export default function V2SpeakersHero() {
	const t = useTranslations("V2.speakers");

	return (
		<section className="v2-section v2-page-hero" id="top">
			<div className="v2-container v2-page-hero__inner">
				<p className="v2-page-hero__badge v2-pixel">{t("badge")}</p>
				<h1 className="v2-page-hero__title v2-pixel">{t("heading")}</h1>
				<p className="v2-page-hero__subline">{t("subline")}</p>
			</div>
		</section>
	);
}
