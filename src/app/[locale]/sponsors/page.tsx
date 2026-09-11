import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2SponsorsHero from "@/app/components/v2/Sponsors/V2SponsorsHero";
import V2SponsorHexes from "@/app/components/v2/Sponsors/V2SponsorHexes";
import V2SponsorWhy from "@/app/components/v2/Sponsors/V2SponsorWhy";
import V2SponsorTiers from "@/app/components/v2/Sponsors/V2SponsorTiers";
import V2SponsorCta from "@/app/components/v2/Sponsors/V2SponsorCta";
import V2Footer from "@/app/components/v2/Footer/V2Footer";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "V2.sponsors" });
	return {
		title: t("meta-title"),
		description: t("subline"),
	};
}

export default function SponsorsPage() {
	return (
		<div className="v2">
			<V2Nav />
			<V2Scrollbar />
			<V2Scene>
				<V2SponsorsHero />
				<section className="v2-section v2-spon-grid">
					<div className="v2-container">
						<V2SponsorHexes />
					</div>
				</section>
				<V2SponsorWhy />
				<V2SponsorTiers />
				<V2SponsorCta />
			</V2Scene>
			<V2Footer />
		</div>
	);
}
