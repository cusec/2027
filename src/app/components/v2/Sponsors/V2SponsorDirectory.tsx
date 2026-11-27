import { useTranslations } from "next-intl";
import { SPONSOR_GROUPS } from "./sponsorsData";

export default function V2SponsorDirectory() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-spon-directory" aria-label={t("heading")}>
			<div className="v2-container">
				<div className="v2-glass v2-spon-directory__panel">
					{SPONSOR_GROUPS.map(({ key, sponsors }) => (
						<div key={key}>
							{key === "in-kind" && (
								<h2 className="v2-spon-directory__heading v2-pixel" id="sponsor-in-kind">
									{t("tier-name-in-kind")}
								</h2>
							)}
							<ul
								className={`v2-spon-directory__list v2-spon-directory__list--${key}`}
								aria-labelledby={key === "in-kind" ? "sponsor-in-kind" : undefined}
							>
								{sponsors.map((sponsor) => (
									<li className="v2-spon-directory__sponsor" key={sponsor.logo}>
										<a className="v2-spon-directory__logo" href={sponsor.website}>
											<img
												src={`/assets/sponsors/${encodeURI(sponsor.logo)}`}
												alt={sponsor.name}
												width={sponsor.width}
												height={sponsor.height}
												loading="lazy"
												decoding="async"
											/>
										</a>
										<p className="v2-spon-directory__name">{sponsor.name}</p>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
