import { useTranslations } from "next-intl";
import V2Polaroid from "../Dawn/V2Polaroid";
import V2SpeakerAvatar from "./V2SpeakerAvatar";
import { ANNOUNCED_KEYNOTES } from "./speakersData";

const TEASER_CHIPS = [1, 2, 3] as const;

export default function V2Keynote() {
	const t = useTranslations("V2.speakers");

	return (
		<section className="v2-section v2-keynote">
			<div className="v2-container v2-keynote__inner">
				<div className="v2-keynote__stack">
					{/* still-unannounced opening keynote */}
					<article className="v2-keynote__card v2-glass">
						<V2SpeakerAvatar
							from="#B5E054"
							to="#89C24C"
							className="v2-spk-avatar--lg"
						/>

						<div className="v2-keynote__body">
							<p className="v2-keynote__eyebrow v2-pixel">
								{t("keynote-eyebrow")}
							</p>
							<h2 className="v2-keynote__title v2-pixel">
								{t("keynote-title")}
							</h2>
							<p className="v2-keynote__text">{t("keynote-body")}</p>

							<ul className="v2-keynote__chips">
								{TEASER_CHIPS.map((n) => (
									<li
										key={n}
										className="v2-spk-chip v2-spk-chip--dark v2-pixel"
									>
										{t(`keynote-chip-${n}`)}
									</li>
								))}
							</ul>
						</div>
					</article>

					{/* keynotes that have been revealed */}
					{ANNOUNCED_KEYNOTES.map((keynote) => (
						<article key={keynote.name} className="v2-keynote__card v2-glass">
							<V2SpeakerAvatar
								from={keynote.from}
								to={keynote.to}
								photo={keynote.photo}
								focus={keynote.focus}
								className="v2-spk-avatar--lg"
							/>

							<div className="v2-keynote__body">
								<p className="v2-keynote__eyebrow v2-pixel">
									{t("keynote-announced-eyebrow")}
								</p>
								<h2 className="v2-keynote__title v2-pixel">{keynote.talk}</h2>
								<p className="v2-keynote__speaker v2-pixel">{keynote.name}</p>
								<p className="v2-keynote__text">{keynote.role}</p>

								<ul className="v2-keynote__chips">
									<li className="v2-spk-chip v2-spk-chip--dark v2-pixel">
										{t("keynote-chip-1")}
									</li>
									<li className="v2-spk-chip v2-spk-chip--dark v2-pixel">
										{t("keynote-chip-3")}
									</li>
								</ul>
							</div>
						</article>
					))}
				</div>

				<V2Polaroid
					src="/assets/v2/photos/cam_3.webp"
					caption={t("photo-caption")}
					tilt={2}
					className="v2-keynote__photo"
				/>
			</div>
		</section>
	);
}
