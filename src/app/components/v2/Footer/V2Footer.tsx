import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { analyticsAttributes } from "@/lib/analytics/events";

/**
 * `route` marks a link that leaves the current page, so it renders through the
 * i18n Link rather than a bare anchor. The rest are in-page fragments.
 */
type FooterLink = { key: string; route?: string };

const SITE_LINKS: FooterLink[] = [
	// { key: "about" }, - restore once there is an About page to link to.
	{ key: "speakers", route: "/speakers" },
	// Hidden for the first v2 release: landing, speakers, sponsors and
	// policy & terms only. `#schedule` has no section yet and `#team` only
	// lands on this footer. Restore both once those sections ship.
	// { key: "schedule" },
	{ key: "sponsors", route: "/sponsors" },
	// { key: "team" },
	...(process.env.SCAVENGER_HUNT_ENABLED === "true"
		? [{ key: "hunt", route: "/scavenger" }]
		: []),
];

const LEGAL_LINKS: FooterLink[] = [
	{ key: "conduct", route: "/code-of-conduct" },
	{ key: "privacy", route: "/privacy-policy" },
	{ key: "terms", route: "/ticket-terms" },
];

// 2023 is absent on purpose: 2023.cusec.net serves a certificate that does not
// cover the custom domain, so the link would land on a TLS interstitial.
const PAST_EDITIONS = ["2026", "2025", "2024", "2022", "2021", "2020"] as const;

const SOCIALS = [
	{ key: "instagram", href: "https://www.instagram.com/cusecofficial/" },
	{ key: "linkedin", href: "https://www.linkedin.com/company/cusec/" },
	{ key: "youtube", href: "https://www.youtube.com/@cusec_cucgl" },
	{ key: "github", href: "https://github.com/cusec" },
] as const;

function FooterColumn({
	heading,
	links,
	t,
}: {
	heading: string;
	links: FooterLink[];
	t: (key: string) => string;
}) {
	return (
		<nav className="v2-footer__col">
			<h2 className="v2-footer__col-head v2-pixel">{heading}</h2>
			{links.map(({ key, route }) =>
				route ? (
					<Link key={key} href={route}>
						{t(key)}
					</Link>
				) : (
					<a key={key} href={`#${key}`}>
						{t(key)}
					</a>
				),
			)}
		</nav>
	);
}

export default function V2Footer() {
	const t = useTranslations("V2.footer");

	return (
		<footer className="v2-footer" id="team">
			<div className="v2-container v2-footer__inner">
				<div className="v2-footer__top">
					<div className="v2-footer__intro">
						<a className="v2-footer__brand" href="#top">
							<img
								src="/assets/v2/logo-icosahedron.webp"
								alt=""
								width={34}
								height={34}
								aria-hidden="true"
							/>
							<span className="v2-pixel">CUSEC 2027</span>
						</a>
						<p className="v2-footer__tagline">{t("tagline")}</p>
						<p className="v2-footer__dates v2-pixel">{t("dates")}</p>
					</div>

					<div className="v2-footer__cols">
						<FooterColumn heading={t("col-site")} links={SITE_LINKS} t={t} />
						<FooterColumn heading={t("col-legal")} links={LEGAL_LINKS} t={t} />

						<nav className="v2-footer__col">
							<h2 className="v2-footer__col-head v2-pixel">{t("col-social")}</h2>
							{SOCIALS.map(({ key, href }) => (
								<a
									key={key}
									href={href}
									target="_blank"
									rel="noreferrer noopener"
									{...analyticsAttributes("social_clicked", {
										platform: key,
										location: "footer",
									})}
								>
									{t(key)}
								</a>
							))}
						</nav>

						<nav className="v2-footer__col">
							<h2 className="v2-footer__col-head v2-pixel">{t("col-editions")}</h2>
							{PAST_EDITIONS.map((year) => (
								<a key={year} href={`https://${year}.cusec.net`}>
									CUSEC {year}
								</a>
							))}
							<a href="https://www.cusec.net">{t("all-editions")}</a>
						</nav>
					</div>
				</div>

				{/* The sign-off: the wordmark set as big as the column allows, the way
				    a poster signs its own bottom edge. Decorative - the same words
				    are already the brand link above. */}
				<p className="v2-footer__wordmark v2-pixel" aria-hidden="true">
					CUSEC 2027
				</p>
			</div>
		</footer>
	);
}
