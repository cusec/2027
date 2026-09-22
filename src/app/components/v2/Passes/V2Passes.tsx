"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { analyticsAttributes } from "@/lib/analytics/events";
import VipChip from "@/app/components/Tickets/VipChip";

const AUDIENCES = ["student", "professional"] as const;
const PERKS = 4;

export default function V2Passes() {
	const t = useTranslations("V2.passes");
	const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>("student");

	const list = (prefix: string) =>
		Array.from({ length: PERKS }, (_, i) => t(`${prefix}-${i + 1}`));

	return (
		<section className="v2-section v2-passes v2-reveal" id="passes">
			<div className="v2-container">
				<div className="v2-passes__head">
					<h2 className="v2-heading-pill v2-passes__heading">{t("heading")}</h2>
				</div>

				<div className="v2-passes__switch">
					<div className="ticket-toggle" role="group" aria-label={t("toggle-label")}>
						{AUDIENCES.map((option) => (
							<button
								key={option}
								type="button"
								className={`ticket-toggle__option${option === audience ? " is-on" : ""}`}
								aria-pressed={option === audience}
								onClick={() => setAudience(option)}
							>
								{t(`toggle-${option}`)}
							</button>
						))}
					</div>
				</div>

				<div className="v2-passes__grid">
					<article className="v2-pass">
						<h3 className="v2-pass__name v2-pixel">{t(`${audience}-name`)}</h3>

						<div className="v2-pass__price">
							<span className="v2-pass__amount v2-pixel">{t(`${audience}-price`)}</span>
							<span className="v2-pass__unit">{t(`${audience}-unit`)}</span>
							<VipChip
								className="v2-pass__vip"
								label={t("vip-chip")}
								heading={t("vip-heading")}
								perks={list("vip-perk")}
							/>
						</div>

						<ul className="v2-pass__perks">
							{list("perk").map((perk) => (
								<li key={perk}>
									<i aria-hidden="true" />
									{perk}
								</li>
							))}
						</ul>

						<Link
							className="v2-btn v2-btn--primary v2-pass__cta"
							href="/tickets"
							{...analyticsAttributes("ticket_cta_clicked", { location: "passes", destination: "tickets" })}
						>
							{t("cta")}
						</Link>
					</article>
				</div>
			</div>
		</section>
	);
}
