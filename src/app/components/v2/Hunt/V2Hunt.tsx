import { useTranslations } from "next-intl";

const ROWS = [1, 2, 3] as const;

export default function V2Hunt() {
	const t = useTranslations("V2.hunt");

	return (
		<section className="v2-section v2-hunt v2-reveal" id="hunt">
			<div className="v2-container v2-hunt__inner">
				<article className="v2-card v2-hunt__card">
					<p className="v2-hunt__badge v2-pixel">
						<i aria-hidden="true" />
						{t("badge")}
					</p>
					<h2 className="v2-card__title v2-hunt__title">{t("title")}</h2>
					<p className="v2-card__body">{t("body")}</p>
					<p className="v2-hunt__actions">
						<a className="v2-btn v2-btn--primary" href="#hunt">
							{t("cta")}
						</a>
					</p>
				</article>

				{/* the two map pins dropped on the path in the Figma frame */}
				<span className="v2-hunt__pin v2-hunt__pin--a" aria-hidden="true" />
				<span className="v2-hunt__pin v2-hunt__pin--b" aria-hidden="true" />

				<article className="v2-board">
					<header className="v2-board__head">
						<span className="v2-pixel">{t("board-title")}</span>
						<span className="v2-board__live v2-pixel">{t("board-live")}</span>
					</header>

					<ol className="v2-board__rows">
						{ROWS.map((n) => (
							<li key={n} className={n === 1 ? "is-lead" : undefined}>
								<span className="v2-board__rank v2-pixel">{n}</span>
								<span className="v2-board__team">{t(`team-${n}`)}</span>
								<span className="v2-board__score v2-pixel">{t(`score-${n}`)}</span>
							</li>
						))}
					</ol>

					<p className="v2-board__foot">
						{t("board-footer")} <span aria-hidden="true">→</span>
					</p>
				</article>
			</div>
		</section>
	);
}
