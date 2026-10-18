import { useTranslations } from "next-intl";
import type { Speaker } from "./speakersData";

/** The LinkedIn / Company website pair under every speaker. */
export default function V2SpeakerLinks({ speaker }: { speaker: Speaker }) {
	const t = useTranslations("V2.speakers");
	if (!speaker.linkedin && !speaker.website) return null;

	return (
		<p className="v2-spk-links">
			{speaker.linkedin ? (
				<a href={speaker.linkedin} target="_blank" rel="noopener noreferrer">
					{t("linkedin")}
					<span className="v2-sr"> - {speaker.name}</span>
				</a>
			) : null}
			{speaker.website ? (
				<a href={speaker.website} target="_blank" rel="noopener noreferrer">
					{t("website")}
					<span className="v2-sr"> - {speaker.name}</span>
				</a>
			) : null}
		</p>
	);
}
