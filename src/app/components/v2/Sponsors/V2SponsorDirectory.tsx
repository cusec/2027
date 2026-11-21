import { useTranslations } from "next-intl";
import { SPONSOR_GROUPS } from "./sponsorsData";

export default function V2SponsorDirectory() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-spon-directory" aria-label={t("heading")}>
			<div className="v2-container">
				<div className="v2-glass v2-spon-directory__panel">
					{SPONSOR_GROUPS.map(({ key, sponsors }) => (
						<section
							className="v2-spon-directory__tier"
							aria-labelledby={`sponsor-tier-${key}`}
							key={key}
						>
							<h2 className="v2-spon-directory__heading v2-pixel" id={`sponsor-tier-${key}`}>
								{t(`tier-name-${key}`)}
							</h2>
							<ul className="v2-spon-directory__grid">
								{sponsors.map((sponsor) => (
									<li className="v2-spon-directory__sponsor" key={sponsor.logo}>
										<div className="v2-spon-directory__logo">
											<img
												src={`/assets/sponsors/${encodeURI(sponsor.logo)}`}
												alt={sponsor.name}
												width={sponsor.width}
												height={sponsor.height}
												loading="lazy"
												decoding="async"
											/>
										</div>
										<p className="v2-spon-directory__name">{sponsor.name}</p>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</div>
		</section>
	);
}
