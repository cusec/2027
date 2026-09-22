import { useTranslations } from "next-intl";

export default function V2SpeakersSoon() {
	const t = useTranslations("V2.speakers");

	return (
		<section className="v2-section v2-spk-grid v2-spk-grid--soon">
			<div className="v2-container">
				<div className="v2-spk-grid__head">
					<h2 className="v2-heading-pill">{t("coming-soon")}</h2>
				</div>
			</div>
		</section>
	);
}
