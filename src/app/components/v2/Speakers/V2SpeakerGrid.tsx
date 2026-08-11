import { useTranslations } from "next-intl";
import { SPEAKERS } from "./speakersData";
import V2SpeakerAvatar from "./V2SpeakerAvatar";

export default function V2SpeakerGrid() {
	const t = useTranslations("V2.speakers");

	return (
		<section className="v2-section v2-spk-grid" id="grid">
			<div className="v2-container">
				<div className="v2-spk-grid__head">
					<h2 className="v2-heading-pill">{t("grid-heading")}</h2>
				</div>

				<ul className="v2-spk-grid__list">
					{SPEAKERS.map((speaker, i) => (
						<li key={i} className="v2-spk-card">
							<V2SpeakerAvatar
								from={speaker.from}
								to={speaker.to}
								photo={speaker.announced?.photo}
								focus={speaker.announced?.focus}
							/>

							{speaker.announced ? (
								<>
									<p className="v2-spk-card__name v2-pixel">
										{speaker.announced.name}
									</p>
									<p className="v2-spk-card__role">{speaker.announced.role}</p>
								</>
							) : (
								<p className="v2-spk-card__name v2-pixel">{t("announcing")}</p>
							)}

							<span className="v2-spk-chip v2-pixel">
								{t(`topic-${speaker.topic}`)}
							</span>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
