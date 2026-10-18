import { useTranslations } from "next-intl";
import { SPONSOR_TIERS, SPONSORS, type Sponsor } from "./sponsorsData";

function SponsorPlate({ sponsor, placeholder }: { sponsor: Sponsor; placeholder: string }) {
	const plate = (
		<span className="v2-spon-plate">
			{sponsor.logo ? (
				<img src={sponsor.logo} alt="" loading="lazy" />
			) : (
				<span className="v2-spon-plate__empty">{placeholder}</span>
			)}
		</span>
	);

	return (
		<li className="v2-spon-item">
			{sponsor.url ? (
				<a
					className="v2-spon-item__link"
					href={sponsor.url}
					target="_blank"
					rel="noopener noreferrer"
				>
					{plate}
					<span className="v2-spon-item__name">{sponsor.name}</span>
				</a>
			) : (
				<>
					{plate}
					<span className="v2-spon-item__name">{sponsor.name}</span>
				</>
			)}
		</li>
	);
}

export default function V2SponsorBoard() {
	const t = useTranslations("V2.sponsors");
	const tiers = SPONSOR_TIERS.filter((tier) => SPONSORS[tier].length > 0);

	return (
		<section className="v2-section v2-subpage">
			<div className="v2-container">
				{tiers.length === 0 ? (
					<div className="v2-subpage__soon">
						<h2 className="v2-heading-pill">{t("coming-soon")}</h2>
					</div>
				) : (
					<div className="v2-glass v2-subpage__panel">
						{tiers.map((tier) => (
							<section
								key={tier}
								className="v2-subpage__group"
								aria-labelledby={`tier-${tier}`}
							>
								<h2 id={`tier-${tier}`} className="v2-subpage__group-title v2-spon-tier-title v2-pixel">
									{t(`tier-name-${tier}`)}
								</h2>
								<ul className="v2-spon-list">
									{SPONSORS[tier].map((sponsor, i) => (
										<SponsorPlate
											key={`${sponsor.name}-${i}`}
											sponsor={sponsor}
											placeholder={t("logo-placeholder")}
										/>
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
