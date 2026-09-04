import type { ArchiveEdition } from "./archiveData";

type Props = {
	edition: ArchiveEdition;
	inserted: boolean;
	label: string;
	insertLabel: string;
	ariaLabel: string;
	onSelect: () => void;
};

/**
 * One CUSEC-SD card in its clear case. Rebuilt in CSS rather than using the
 * per-year SVG exports so that the inserted / idle treatment can follow
 * whichever year is loaded. Geometry and colours mirror the Figma exports:
 * the card from public/assets/v2/SD/*.svg, the sleeve from "SD Case".
 */
export default function V2SdCard({
	edition,
	inserted,
	label,
	insertLabel,
	ariaLabel,
	onSelect,
}: Props) {
	return (
		<button
			type="button"
			className={`v2-sd${inserted ? " v2-sd--inserted" : ""}`}
			style={
				{
					"--sd-from": edition.from,
					"--sd-to": edition.to,
				} as React.CSSProperties
			}
			onClick={onSelect}
			aria-pressed={inserted}
			aria-label={ariaLabel}
		>
			<span className="v2-sd__card">
				<span className="v2-sd__notch" aria-hidden="true" />

				<span className="v2-sd__pins" aria-hidden="true">
					{Array.from({ length: 6 }, (_, i) => (
						<i key={i} />
					))}
				</span>

				<span className="v2-sd__label">
					<span className="v2-sd__year v2-pixel">{edition.year}</span>
					<span className="v2-sd__meta v2-pixel">
						{inserted ? label : insertLabel}
					</span>
					<span className="v2-sd__stripe" aria-hidden="true" />
				</span>

				<span className="v2-sd__brand v2-pixel" aria-hidden="true">
					CUSEC·SD
				</span>
			</span>
		</button>
	);
}
