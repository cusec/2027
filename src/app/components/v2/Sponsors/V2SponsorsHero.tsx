import { useTranslations } from "next-intl";
import { analyticsAttributes } from "@/lib/analytics/events";

export default function V2SponsorsHero() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-page-hero" id="top">
			<div className="v2-container v2-page-hero__inner">
				<h1 className="v2-page-hero__title v2-pixel">{t("page-heading")}</h1>
				<p className="v2-page-hero__subline">{t("subline")}</p>

				<div className="v2-page-hero__actions">
					<a
						className="v2-btn v2-btn--primary"
						href="https://forms.gle/TzbNoCKmALEYryLw7"
						target="_blank"
						rel="noopener noreferrer"
						{...analyticsAttributes("sponsor_application_clicked", {
							location: "sponsors_page",
							destination: "sponsor_form",
						})}
					>
						{t("cta-primary")} <span aria-hidden="true">→</span>
					</a>
					{/* Restore with the tiers section on /sponsors.
					<a className="v2-btn v2-btn--ghost" href="#tiers">
						{t("cta-secondary")}
					</a> */}
				</div>
			</div>
		</section>
	);
}
