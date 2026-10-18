import { useLocale } from "next-intl";
import { pick } from "@/lib/localized";
import V2SpeakerLinks from "./V2SpeakerLinks";
import V2SpeakerPortrait from "./V2SpeakerPortrait";
import { SPEAKERS } from "./speakersData";

export default function V2SpeakerGrid() {
	const locale = useLocale();
	if (SPEAKERS.length === 0) return null;

	return (
		<section className="v2-section v2-spk-grid" id="grid">
			<div className="v2-container">
				<ul className="v2-spk-grid__list">
					{SPEAKERS.map((speaker, i) => (
						<li key={`${speaker.name}-${i}`} className="v2-spk-card">
							<V2SpeakerPortrait
								photo={speaker.photo}
								focus={speaker.focus}
								className="v2-spk-card__portrait"
							/>
							<h2 className="v2-spk-card__name">{speaker.name}</h2>
							<p className="v2-spk-card__role">{speaker.role}</p>
							{speaker.bio ? (
								<p className="v2-spk-card__bio">{pick(speaker.bio, locale)}</p>
							) : null}
							<V2SpeakerLinks speaker={speaker} />
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
