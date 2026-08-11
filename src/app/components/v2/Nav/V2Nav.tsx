"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import V2LocaleSwitcher from "./V2LocaleSwitcher";

const LINKS = [
	{ key: "about", href: "/#about" },
	{ key: "speakers", href: "/speakers" },
	{ key: "sponsors", href: "/#sponsors" },
	{ key: "conference", href: "/#conference" },
	{ key: "hunt", href: "/#hunt" },
	{ key: "team", href: "/#team" },
] as const;

/** ignore sub-pixel/momentum jitter so the bar doesn't flicker */
const THRESHOLD = 6;
/** near the top the bar always shows, whatever the direction */
const TOP_ZONE = 80;

export default function V2Nav() {
	const t = useTranslations("V2.nav");
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [lifted, setLifted] = useState(false);
	const [hidden, setHidden] = useState(false);
	const lastY = useRef(0);

	useEffect(() => {
		lastY.current = window.scrollY;

		const onScroll = () => {
			const y = window.scrollY;
			const delta = y - lastY.current;

			setLifted(y > 40);

			if (Math.abs(delta) < THRESHOLD) return;
			lastY.current = y;

			// Scrolling down tucks the bar away; scrolling back up returns it.
			setHidden(y > TOP_ZONE && delta > 0);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// never leave the bar tucked away while the mobile menu is open
	const tucked = hidden && !open;

	return (
		<header className={`v2-nav${tucked ? " is-hidden" : ""}`}>
			<div className={`v2-nav__bar${lifted ? " is-lifted" : ""}`}>
				<Link className="v2-nav__brand" href="/">
					<img
						src="/assets/v2/logo-icosahedron.webp"
						alt=""
						width={30}
						height={30}
						aria-hidden="true"
					/>
					<span className="v2-pixel">CUSEC 2027</span>
				</Link>

				<nav className="v2-nav__links" aria-label={t("aria-label")}>
					{LINKS.map(({ key, href }) => {
						const active = href.startsWith("/") && !href.includes("#")
							? pathname === href
							: false;
						return (
							<Link
								key={key}
								href={href}
								className={active ? "is-active" : undefined}
								aria-current={active ? "page" : undefined}
							>
								{t(key)}
							</Link>
						);
					})}
				</nav>

				<div className="v2-nav__end">
					<V2LocaleSwitcher label={t("language")} />
					<Link className="v2-btn v2-btn--primary v2-nav__cta" href="/#passes">
						{t("cta")}
					</Link>
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

			<div id="v2-nav-mobile" className="v2-nav__mobile" hidden={!open}>
				{LINKS.map(({ key, href }) => (
					<Link key={key} href={href} onClick={() => setOpen(false)}>
						{t(key)}
					</Link>
				))}
				<div className="v2-nav__mobile-end">
					<V2LocaleSwitcher label={t("language")} />
					<Link
						className="v2-btn v2-btn--primary"
						href="/#passes"
						onClick={() => setOpen(false)}
					>
						{t("cta")}
					</Link>
				</div>
			</div>
		</header>
	);
}
