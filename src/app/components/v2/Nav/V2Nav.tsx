"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import V2LocaleSwitcher from "./V2LocaleSwitcher";

const LINKS = [
	{ key: "about", href: "#about" },
	{ key: "speakers", href: "#speakers" },
	{ key: "sponsors", href: "#sponsors" },
	{ key: "conference", href: "#conference" },
	{ key: "hunt", href: "#hunt" },
	{ key: "team", href: "#team" },
] as const;

export default function V2Nav() {
	const t = useTranslations("V2.nav");
	const [open, setOpen] = useState(false);
	const [lifted, setLifted] = useState(false);

	// Deepen the glass once the page scrolls, so the bar stays readable over
	// the lighter parts of the painting.
	useEffect(() => {
		const onScroll = () => setLifted(window.scrollY > 40);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header className="v2-nav">
			<div className={`v2-nav__bar${lifted ? " is-lifted" : ""}`}>
				<a className="v2-nav__brand" href="#top">
					<img
						src="/assets/v2/logo-icosahedron.webp"
						alt=""
						width={30}
						height={30}
						aria-hidden="true"
					/>
					<span className="v2-pixel">CUSEC 2027</span>
				</a>

				<nav className="v2-nav__links" aria-label={t("aria-label")}>
					{LINKS.map(({ key, href }) => (
						<a key={key} href={href}>
							{t(key)}
						</a>
					))}
				</nav>

				<div className="v2-nav__end">
					<V2LocaleSwitcher label={t("language")} />
					<a className="v2-btn v2-btn--primary v2-nav__cta" href="#passes">
						{t("cta")}
					</a>
				</div>

				<button
					type="button"
					className="v2-nav__burger"
					aria-expanded={open}
					aria-controls="v2-nav-mobile"
					onClick={() => setOpen((v) => !v)}
				>
					<span className="v2-sr">{t("menu")}</span>
					<span aria-hidden="true" />
					<span aria-hidden="true" />
					<span aria-hidden="true" />
				</button>
			</div>

			<div
				id="v2-nav-mobile"
				className="v2-nav__mobile"
				hidden={!open}
			>
				{LINKS.map(({ key, href }) => (
					<a key={key} href={href} onClick={() => setOpen(false)}>
						{t(key)}
					</a>
				))}
				<div className="v2-nav__mobile-end">
					<V2LocaleSwitcher label={t("language")} />
					<a
						className="v2-btn v2-btn--primary"
						href="#passes"
						onClick={() => setOpen(false)}
					>
						{t("cta")}
					</a>
				</div>
			</div>
		</header>
	);
}
