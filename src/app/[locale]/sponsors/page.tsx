import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2SponsorsHero from "@/app/components/v2/Sponsors/V2SponsorsHero";
import V2SponsorDirectory from "@/app/components/v2/Sponsors/V2SponsorDirectory";
import V2Footer from "@/app/components/v2/Footer/V2Footer";
import { alternatesFor } from "@/lib/seo";

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
		alternates: alternatesFor(locale, "/sponsors"),
	};
}

export default function SponsorsPage() {
	return (
		<div className="v2 v2-sponsors-page">
			<V2Nav />
			<V2Scrollbar />
			<V2Scene>
				<V2SponsorsHero />
				<V2SponsorDirectory />
			</V2Scene>
			<V2Footer />
		</div>
	);
}
