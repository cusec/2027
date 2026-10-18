import { useTranslations } from "next-intl";
import { analyticsAttributes } from "@/lib/analytics/events";
import { SPONSOR_FORM_URL, SPONSORSHIP_PACKAGE_URL } from "./sponsorsData";

export default function V2SponsorsHero() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-page-hero v2-page-hero--tight" id="top">
			<div className="v2-container v2-page-hero__inner">
				<h1 className="v2-page-hero__title v2-pixel">{t("page-heading")}</h1>
				{/* The sponsorship package once it exists; the interest form until then. */}
				<a
					className="v2-page-hero__subline v2-page-hero__link"
					href={SPONSORSHIP_PACKAGE_URL ?? SPONSOR_FORM_URL}
					target="_blank"
					rel="noopener noreferrer"
					{...analyticsAttributes("sponsor_application_clicked", {
						location: "sponsors_page",
						destination: SPONSORSHIP_PACKAGE_URL ? "sponsorship_package" : "sponsor_form",
					})}
				>
					{t("package")}
				</a>
			</div>
		</section>
	);
}
