import { useTranslations } from "next-intl";
import { analyticsAttributes } from "@/lib/analytics/events";
import { Link } from "@/i18n/navigation";

export default function V2Closing() {
	const t = useTranslations("V2.closing");

	return (
		<section className="v2-section v2-closing v2-reveal">
			<div className="v2-container">
				<h2 className="v2-closing__title v2-pixel">{t("heading")}</h2>
				<Link
					className="v2-btn v2-btn--primary v2-closing__cta"
					href="/tickets"
					{...analyticsAttributes("ticket_cta_clicked", { location: "closing", destination: "tickets" })}
				>
					{t("cta")}
				</Link>
			</div>
		</section>
	);
}
