import { useTranslations } from "next-intl";
import { analyticsAttributes } from "@/lib/analytics/events";

export default function V2SpeakerPitch() {
	const t = useTranslations("V2.speakers");

	return (
		<section className="v2-section v2-pitch">
			<div className="v2-container">
				<div className="v2-pitch__card v2-glass">
					<h2 className="v2-pitch__title v2-pixel">{t("pitch-title")}</h2>
					<p className="v2-pitch__body">{t("pitch-body")}</p>

					<div className="v2-pitch__actions">
						<a
							className="v2-btn v2-btn--primary"
							href="mailto:info@cusec.net"
							{...analyticsAttributes("contact_clicked", {
								purpose: "speaker_pitch",
								location: "speakers",
							})}
						>
							{t("pitch-cta")} <span aria-hidden="true">→</span>
						</a>
						<a
							className="v2-btn v2-btn--outline"
							href="mailto:info@cusec.net"
							{...analyticsAttributes("contact_clicked", {
								purpose: "speaker_media",
								location: "speakers",
							})}
						>
							{t("pitch-secondary")}
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
