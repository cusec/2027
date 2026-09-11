import { useTranslations } from "next-intl";

const PERKS = [1, 2, 3] as const;

export default function V2Passes() {
	const t = useTranslations("V2.passes");

	return (
		<section className="v2-section v2-passes v2-reveal" id="passes">
			<div className="v2-container">
				<div className="v2-passes__head">
					<h2 className="v2-heading-pill v2-passes__heading">{t("heading")}</h2>
				</div>

				<div className="v2-passes__grid">
					<article className="v2-pass v2-pass--basic">
						<h3 className="v2-pass__name v2-pixel">{t("title")}</h3>
						<p className="v2-card__body">{t("body")}</p>

						<ul className="v2-pass__perks">
							{PERKS.map((n) => (
								<li key={n}>
									<i aria-hidden="true" />
									{t(`perk-${n}`)}
								</li>
							))}
						</ul>

						<a
							className="v2-btn v2-btn--primary v2-pass__cta"
							href="mailto:info@cusec.net?subject=CUSEC%202027%20ticket%20updates"
						>
							{t("cta")}
						</a>
					</article>
				</div>

				{/* Retained for the announced ticket launch: restore the two-pass pricing UI here when prices are public.
				<article className="v2-pass v2-pass--basic">
					<h3 className="v2-pass__name v2-pixel">{t("basic-name")}</h3>
					<p className="v2-pass__price"><span className="v2-pixel">{t("basic-price")}</span><span>{t("basic-unit")}<br />{t("basic-alt")}</span></p>
					<ul className="v2-pass__perks">{PERKS.map((n) => <li key={n}><i aria-hidden="true" />{t(`basic-perk-${n}`)}</li>)}</ul>
					<a className="v2-btn v2-btn--primary v2-pass__cta" href="#passes">{t("basic-cta")}</a>
				</article>
				<article className="v2-pass v2-pass--vip">
					<h3 className="v2-pass__name v2-pixel">{t("vip-name")}</h3>
					<span className="v2-pass__badge v2-pixel">{t("vip-badge")}</span>
					<p className="v2-pass__price"><span className="v2-pixel">{t("vip-price")}</span><span>{t("vip-unit")}<br />{t("vip-alt")}</span></p>
					<ul className="v2-pass__perks">{PERKS.map((n) => <li key={n}><i aria-hidden="true" />{t(`vip-perk-${n}`)}</li>)}</ul>
					<a className="v2-btn v2-btn--primary v2-pass__cta" href="#passes">{t("vip-cta")}</a>
				</article> */}

				<p className="v2-passes__note">{t("note")}</p>
			</div>
		</section>
	);
}
