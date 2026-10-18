import { useLocale, useTranslations } from "next-intl";
import { pick } from "@/lib/localized";
import { TEAM } from "./teamData";

export default function V2Team() {
	const t = useTranslations("V2.team");
	const locale = useLocale();
	const groups = TEAM.filter((group) => group.members.length > 0);

	return (
		<section className="v2-section v2-subpage">
			<div className="v2-container">
				{groups.length === 0 ? (
					<div className="v2-subpage__soon">
						<h2 className="v2-heading-pill">{t("coming-soon")}</h2>
					</div>
				) : (
					<div className="v2-glass v2-subpage__panel">
						{groups.map((group) => (
							<section
								key={group.id}
								className="v2-subpage__group"
								aria-labelledby={`team-${group.id}`}
							>
								<h2 id={`team-${group.id}`} className="v2-subpage__group-title v2-pixel">
									{t(`group-${group.id}`)}
								</h2>

								<ul className="v2-team__grid">
									{group.members.map((member, i) => (
										<li key={`${member.name}-${i}`} className="v2-team__member">
											<span className="v2-team__photo" aria-hidden="true">
												{member.photo ? (
													<img
														src={member.photo}
														alt=""
														loading="lazy"
														style={member.focus ? { objectPosition: member.focus } : undefined}
													/>
												) : (
													<img
														className="v2-team__mark"
														src="/assets/v2/logo-icosahedron.webp"
														alt=""
														width={40}
														height={40}
														loading="lazy"
													/>
												)}
											</span>
											<p className="v2-team__name">{member.name}</p>
											<p className="v2-team__role">{pick(member.role, locale)}</p>
											{member.linkedin ? (
												<a
													className="v2-team__link"
													href={member.linkedin}
													target="_blank"
													rel="noopener noreferrer"
												>
													{t("linkedin")}
													<span className="v2-sr"> - {member.name}</span>
												</a>
											) : null}
										</li>
									))}
								</ul>
							</section>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
