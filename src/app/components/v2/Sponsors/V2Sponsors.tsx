import { useTranslations } from "next-intl";
import { Hexagon } from "lucide-react";
import V2SponsorHexes from "./V2SponsorHexes";

/** Landing-page teaser. The full story lives on /sponsors. */
export default function V2Sponsors() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-sponsors v2-reveal" id="sponsors">
			<div className="v2-container">
				<div className="v2-sponsors__head">
					<h2 className="v2-heading-pill">
						<Hexagon size={18} aria-hidden="true" />
						{t("heading")}
					</h2>
				</div>

				<V2SponsorHexes />
			</div>
		</section>
	);
}
