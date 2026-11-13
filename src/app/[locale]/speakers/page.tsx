import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2SpeakersHero from "@/app/components/v2/Speakers/V2SpeakersHero";
import V2Keynote from "@/app/components/v2/Speakers/V2Keynote";
import V2SpeakerGrid from "@/app/components/v2/Speakers/V2SpeakerGrid";
import V2SpeakersSoon from "@/app/components/v2/Speakers/V2SpeakersSoon";
import { getPublishedSpeakers } from "@/lib/speakers";
import V2Footer from "@/app/components/v2/Footer/V2Footer";
import { alternatesFor } from "@/lib/seo";

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
		alternates: alternatesFor(locale, "/speakers"),
	};
}

export default async function SpeakersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const records = await getPublishedSpeakers();
  const lineup = records.map(record => ({
    ...record,
    role: locale === "fr-CA" ? record.roleFr || record.role : record.role,
    talk: locale === "fr-CA" ? record.talkFr || record.talk : record.talk,
    abstract: locale === "fr-CA" ? record.abstractFr || record.abstract : record.abstract,
    from: "#B5E054", to: "#89C24C",
  }));
  const keynotes = lineup.filter(record => record.kind === "keynote");
  const speakers = lineup.filter(record => record.kind !== "keynote").map(record => ({
    topic: record.topic, from: record.from, to: record.to, announced: record,
  }));
	return (
		<div className="v2 v2-speakers-page">
			<V2Nav />
			<V2Scrollbar />
			<V2Scene>
				<V2SpeakersHero />
				{keynotes.length > 0 && <V2Keynote keynotes={keynotes} />}
				{speakers.length > 0 && <V2SpeakerGrid speakers={speakers} />}
				{lineup.length === 0 && <V2SpeakersSoon />}
			</V2Scene>
			<V2Footer />
		</div>
	);
}
