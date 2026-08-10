import { useTranslations } from "next-intl";
import { Plus, Hexagon } from "lucide-react";

/**
 * Tier drives both the hex size and its edge colour, matching the per-tier
 * exports in public/assets/v2/Hex. `drop` nudges a hex down to reproduce the
 * scattered honeycomb of the Figma frame.
 */
const HEXES = [
	{ tier: "platinum", drop: 0 },
	{ tier: "gold", drop: -46 },
	{ tier: "gold", drop: 34 },
	{ tier: "gold", drop: -40 },
	{ tier: "silver", drop: 22 },
	{ tier: "silver", drop: 96 },
	{ tier: "silver", drop: 60 },
	{ tier: "silver", drop: 8 },
	{ tier: "partner", drop: 78 },
	{ tier: "partner", drop: 30 },
] as const;

export default function V2Sponsors() {
	const t = useTranslations("V2.sponsors");

	return (
		<section className="v2-section v2-sponsors" id="sponsors">
			<div className="v2-container">
				<div className="v2-sponsors__head">
					<h2 className="v2-heading-pill">
						<Hexagon size={18} aria-hidden="true" />
						{t("heading")}
					</h2>
				</div>

				<ul className="v2-hexes">
					{HEXES.map((hex, i) => (
						<li
							key={i}
							className={`v2-hex v2-hex--${hex.tier}`}
							style={{ "--hex-drop": `${hex.drop}px` } as React.CSSProperties}
						>
							<span className="v2-hex__inner">
								<span className="v2-hex__slot" aria-hidden="true" />
								<span className="v2-hex__tier">{t(`tier-${hex.tier}`)}</span>
							</span>
						</li>
					))}

					<li
						className="v2-hex v2-hex--become"
						style={{ "--hex-drop": "62px" } as React.CSSProperties}
					>
						<a className="v2-hex__inner" href="#sponsors">
							<Plus size={22} aria-hidden="true" />
							<span className="v2-hex__tier">{t("become")}</span>
						</a>
					</li>
				</ul>

				<p className="v2-sponsors__caption">{t("caption")}</p>
			</div>
		</section>
	);
}
