import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2Schedule from "@/app/components/v2/Schedule/V2Schedule";
import V2Footer from "@/app/components/v2/Footer/V2Footer";
import isAdmin from "@/lib/isAdmin";
import { loadSchedule } from "@/lib/scheduleStore";
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

/**
 * The programme lives in the `days` collection, so the team edits it without a
 * deploy: a signed-in admin gets an editor on this page (see V2Schedule). The
 * API re-checks the role on every write, so `canEdit` only decides what the
 * page shows.
 */
export default async function SchedulePage() {
	const t = await getTranslations("V2.schedule");
	const [days, canEdit] = await Promise.all([loadSchedule(), isAdmin()]);
	const hasDays = days !== null && days.length > 0;

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
				{hasDays || canEdit ? (
					<V2Schedule days={days ?? []} canEdit={canEdit} loadFailed={days === null} />
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
