import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2SpeakersHero from "@/app/components/v2/Speakers/V2SpeakersHero";
import V2Keynote from "@/app/components/v2/Speakers/V2Keynote";
import V2SpeakerGrid from "@/app/components/v2/Speakers/V2SpeakerGrid";
import V2SpeakerPitch from "@/app/components/v2/Speakers/V2SpeakerPitch";
import V2Footer from "@/app/components/v2/Footer/V2Footer";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "V2.speakers" });
	return {
		title: t("meta-title"),
		description: t("subline"),
	};
}

export default function SpeakersPage() {
	return (
		<div className="v2">
			<V2Nav />
			<V2Scrollbar />
			<div className="v2-scene">
				<V2SpeakersHero />
				<V2Keynote />
				<V2SpeakerGrid />
				<V2SpeakerPitch />
			</div>
			<V2Footer />
		</div>
	);
}
