import { useTranslations } from "next-intl";

/** each lily pad floats at its own spot on the water */
const PADS = [
	{ n: 1, open: true, className: "v2-pad--1" },
	{ n: 2, open: false, className: "v2-pad--2" },
	{ n: 3, open: false, className: "v2-pad--3" },
	{ n: 4, open: false, className: "v2-pad--4" },
	{ n: 5, open: false, className: "v2-pad--5" },
] as const;

export default function V2Faq() {
	const t = useTranslations("V2.faq");

	return (
		<section className="v2-section v2-faq" id="faq">
			<div className="v2-container">
				<div className="v2-faq__head">
					<h2 className="v2-heading-pill">{t("heading")}</h2>
				</div>

				<div className="v2-faq__pond">
					{PADS.map((pad) => (
						<details
							key={pad.n}
							className={`v2-pad ${pad.className}`}
							open={pad.open}
						>
							<summary>
								{t(`q${pad.n}`)}
								<span className="v2-pad__toggle" aria-hidden="true" />
							</summary>
							<p>{t(`a${pad.n}`)}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}
