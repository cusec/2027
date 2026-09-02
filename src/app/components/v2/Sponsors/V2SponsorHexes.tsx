import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

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

/**
 * The honeycomb itself, shared by the landing-page teaser (`V2Sponsors`) and
 * the `/sponsors` page. The slots are deliberately empty: no 2027 sponsor is
 * confirmed yet, and the Figma frame draws them as blank plates too.
 */
export default function V2SponsorHexes() {
	const t = useTranslations("V2.sponsors");

	return (
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
				<a
					className="v2-hex__inner"
					href="mailto:info@cusec.net?subject=CUSEC%202027%20sponsorship"
				>
					<Plus size={22} aria-hidden="true" />
					<span className="v2-hex__tier">{t("become")}</span>
				</a>
			</li>
		</ul>
	);
}
