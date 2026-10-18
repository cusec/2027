import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2Schedule from "@/app/components/v2/Schedule/V2Schedule";
import { SCHEDULE } from "@/app/components/v2/Schedule/scheduleData";
import V2Footer from "@/app/components/v2/Footer/V2Footer";
import { alternatesFor } from "@/lib/seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "V2.schedule" });
	return {
		title: t("meta-title"),
		description: t("subline"),
		alternates: alternatesFor(locale, "/schedule"),
	};
}

export default function SchedulePage() {
	const t = useTranslations("V2.schedule");

	return (
		<div className="v2 v2--subpage">
			<V2Nav />
			<V2Scrollbar />
			<V2Scene>
				<section className="v2-section v2-page-hero v2-page-hero--tight" id="top">
					<div className="v2-container v2-page-hero__inner">
						<h1 className="v2-page-hero__title v2-pixel">{t("heading")}</h1>
						<p className="v2-page-hero__subline">{t("subline")}</p>
					</div>
				</section>
				{SCHEDULE.length > 0 ? (
					<V2Schedule />
				) : (
					<section className="v2-section v2-subpage">
						<div className="v2-container v2-subpage__soon">
							<h2 className="v2-heading-pill">{t("coming-soon")}</h2>
						</div>
					</section>
				)}
			</V2Scene>
			<V2Footer />
		</div>
	);
}
