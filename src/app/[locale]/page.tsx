import type { Metadata } from "next";
import { alternatesFor, SITE_URL } from "@/lib/seo";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2ScrollReveal from "@/app/components/v2/Reveal/V2ScrollReveal";
import V2Hero from "@/app/components/v2/Hero/V2Hero";
import V2Sky from "@/app/components/v2/Sky/V2Sky";
import V2Dawn from "@/app/components/v2/Dawn/V2Dawn";
import V2Archive from "@/app/components/v2/Archive/V2Archive";
import V2Hunt from "@/app/components/v2/Hunt/V2Hunt";
import V2Passes from "@/app/components/v2/Passes/V2Passes";
// import V2Sponsors from "@/app/components/v2/Sponsors/V2Sponsors";
import V2Faq from "@/app/components/v2/Faq/V2Faq";
import V2Closing from "@/app/components/v2/Closing/V2Closing";
import V2Footer from "@/app/components/v2/Footer/V2Footer";

/**
 * `organizer` and `superEvent` are references, not definitions: both nodes live
 * once on cusec.net, and repeating their properties here would create a second
 * entity Google has to reconcile with the first.
 */
const eventJsonLd = {
	"@context": "https://schema.org",
	"@type": "Event",
	"@id": `${SITE_URL}/#event`,
	name: "CUSEC 2027",
	url: SITE_URL,
	startDate: "2027-01-07",
	endDate: "2027-01-09",
	eventStatus: "https://schema.org/EventScheduled",
	eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
	description:
		"The 26th Canadian University Software Engineering Conference, January 7 to 9, 2027 in Montr\u00e9al, QC.",
	location: {
		"@type": "Place",
		name: "Montr\u00e9al, QC",
		address: {
			"@type": "PostalAddress",
			addressLocality: "Montr\u00e9al",
			addressRegion: "QC",
			addressCountry: "CA",
		},
	},
	organizer: { "@id": "https://www.cusec.net/#organization" },
	superEvent: { "@id": "https://www.cusec.net/#series" },
};

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	return { alternates: alternatesFor(locale, "/") };
}

export default function HomePage() {
	return (
		<div className="v2">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be emitted as a script tag.
				dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
			/>
			<V2Nav />
			<V2Scrollbar />
			<V2ScrollReveal />
			<noscript>
				<style>{`.v2-reveal{opacity:1!important;translate:none!important}`}</style>
			</noscript>
			<V2Scene screens>
				<V2Hero />
				<V2Sky />
				<V2Dawn />
				<V2Archive />
				<V2Hunt />
				<V2Passes />
				{/* <V2Sponsors /> */}
				<V2Faq />
				<V2Closing />
			</V2Scene>
			<V2Footer />
		</div>
	);
}
