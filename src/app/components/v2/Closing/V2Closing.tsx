import { useTranslations } from "next-intl";

export default function V2Closing() {
	const t = useTranslations("V2.closing");

	return (
		<section className="v2-section v2-closing">
			<div className="v2-container">
				<h2 className="v2-closing__title v2-pixel">{t("heading")}</h2>
				<a className="v2-btn v2-btn--primary v2-closing__cta" href="#passes">
					{t("cta")}
				</a>
			</div>
		</section>
	);
}
