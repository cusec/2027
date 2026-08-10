"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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
	const [solid, setSolid] = useState(false);

	// Frost the bar once the hero has scrolled past, so the white links stay legible.
	useEffect(() => {
		const onScroll = () => setSolid(window.scrollY > 120);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header className={`v2-nav${solid ? " v2-nav--solid" : ""}`}>
			<div className="v2-nav__inner">
				<a className="v2-nav__brand" href="#top">
					<img
						src="/assets/v2/logo-icosahedron.webp"
						alt=""
						width={34}
						height={34}
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

				<a className="v2-btn v2-btn--primary v2-nav__cta" href="#passes">
					{t("cta")}
				</a>

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
				className={`v2-nav__mobile${open ? " is-open" : ""}`}
				hidden={!open}
			>
				{LINKS.map(({ key, href }) => (
					<a key={key} href={href} onClick={() => setOpen(false)}>
						{t(key)}
					</a>
				))}
				<a
					className="v2-btn v2-btn--primary"
					href="#passes"
					onClick={() => setOpen(false)}
				>
					{t("cta")}
				</a>
			</div>
		</header>
	);
}
