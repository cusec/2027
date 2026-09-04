import { useTranslations } from "next-intl";
import V2Wordmark from "@/app/components/v2/Hero/V2Wordmark";

export default function V2Hero() {
	const t = useTranslations("V2.hero");

	return (
		<section className="v2-section v2-hero" id="top">
			<div className="v2-container v2-hero__inner">
				{/* the wrapper carries the entrance animation so it can't collide
				    with the hover-float animation on the image itself */}
				<span className="v2-hero__logo-wrap">
					<img
						className="v2-hero__logo"
						src="/assets/v2/logo-icosahedron.webp"
						alt=""
						width={146}
						height={146}
						aria-hidden="true"
					/>
				</span>

				<p className="v2-hero__pill v2-pixel">{t("edition")}</p>

				<V2Wordmark text="CUSEC 2027" />

				<p className="v2-hero__tagline">{t("tagline")}</p>

				<div className="v2-hero__actions">
					<a className="v2-btn v2-btn--primary" href="#passes">
						{t("cta-primary")}
					</a>
					<a className="v2-btn v2-btn--ghost" href="#about">
						{t("cta-secondary")}
					</a>
				</div>
			</div>
		</section>
	);
}
