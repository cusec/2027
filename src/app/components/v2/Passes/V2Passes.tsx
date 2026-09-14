import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const TICKETS = [
	{ id: "early", perks: 4, badge: false },
	{ id: "vip", perks: 5, badge: true },
] as const;

export default function V2Passes() {
	const t = useTranslations("V2.passes");

	return (
		<section className="v2-section v2-passes v2-reveal" id="passes">
			<div className="v2-container">
				<div className="v2-passes__head">
					<h2 className="v2-heading-pill v2-passes__heading">{t("heading")}</h2>
				</div>

				<div className="v2-passes__grid">
					{TICKETS.map(({ id, perks, badge }) => (
						<article key={id} className={`v2-pass v2-pass--${id === "vip" ? "vip" : "basic"}`}>
							<h3 className="v2-pass__name v2-pixel">{t(`${id}-name`)}</h3>
							{badge && <span className="v2-pass__badge v2-pixel">{t("vip-badge")}</span>}

							<p className="v2-pass__price">
								<span className="v2-pixel">{t(`${id}-price`)}</span>
								<span>{t(`${id}-unit`)}</span>
							</p>

							<ul className="v2-pass__perks">
								{Array.from({ length: perks }, (_, i) => (
									<li key={i}>
										<i aria-hidden="true" />
										{t(`${id}-perk-${i + 1}`)}
									</li>
								))}
							</ul>

							<Link className="v2-btn v2-btn--primary v2-pass__cta" href="/tickets">
								{t("cta")}
							</Link>
						</article>
					))}
				</div>

				<p className="v2-passes__note">{t("note")}</p>
			</div>
		</section>
	);
}
