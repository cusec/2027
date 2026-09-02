import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * `route` marks a link that leaves the current page, so it renders through the
 * i18n Link rather than a bare anchor. The rest are in-page fragments.
 */
const LINKS: { key: string; route?: string }[] = [
	{ key: "about" },
	{ key: "speakers", route: "/speakers" },
	{ key: "schedule" },
	{ key: "sponsors", route: "/sponsors" },
	{ key: "team" },
	{ key: "hunt" },
	{ key: "conduct" },
	{ key: "privacy" },
];

const SOCIALS = [
	{ key: "instagram", href: "https://www.instagram.com/cusecofficial/" },
	{ key: "linkedin", href: "https://www.linkedin.com/company/cusec/" },
	{ key: "youtube", href: "https://www.youtube.com/@cusec_cucgl" },
	{ key: "github", href: "https://github.com/cusec" },
] as const;

export default function V2Footer() {
	const t = useTranslations("V2.footer");

	return (
		<footer className="v2-footer" id="team">
			<div className="v2-container v2-footer__inner">
				<a className="v2-footer__brand" href="#top">
					<img
						src="/assets/v2/logo-icosahedron.webp"
						alt=""
						width={28}
						height={28}
						aria-hidden="true"
					/>
					<span className="v2-pixel">CUSEC 2027</span>
				</a>

				<nav className="v2-footer__links">
					{LINKS.map(({ key, route }) =>
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

				<nav className="v2-footer__socials">
					{SOCIALS.map(({ key, href }) => (
						<a key={key} href={href} target="_blank" rel="noreferrer noopener">
							{t(key)}
						</a>
					))}
				</nav>

				<p className="v2-footer__legal v2-pixel">{t("legal")}</p>
			</div>
		</footer>
	);
}
