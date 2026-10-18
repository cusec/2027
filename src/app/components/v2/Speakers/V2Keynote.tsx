import { useLocale, useTranslations } from "next-intl";
import { pick } from "@/lib/localized";
import V2SpeakerLinks from "./V2SpeakerLinks";
import V2SpeakerPortrait from "./V2SpeakerPortrait";
import { KEYNOTES } from "./speakersData";

export default function V2Keynote() {
	const t = useTranslations("V2.speakers");
	const locale = useLocale();
	if (KEYNOTES.length === 0) return null;

	return (
		<section className="v2-section v2-keynote">
			<div className="v2-container v2-keynote__stack">
				{KEYNOTES.map((keynote) => (
					<article key={keynote.name} className="v2-keynote__card v2-glass v2-glass--blue">
						<V2SpeakerPortrait
							photo={keynote.photo}
							focus={keynote.focus}
							className="v2-keynote__portrait"
						/>

						<div className="v2-keynote__body">
							<p className="v2-keynote__eyebrow">{t("keynote-label")}</p>
							<h2 className="v2-keynote__name v2-pixel">{keynote.name}</h2>
							<p className="v2-keynote__role">{keynote.role}</p>
							{keynote.talk ? (
								<p className="v2-keynote__talk v2-pixel">{keynote.talk}</p>
							) : null}
							{keynote.bio ? (
								<p className="v2-keynote__bio">{pick(keynote.bio, locale)}</p>
							) : null}
							<V2SpeakerLinks speaker={keynote} />
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
