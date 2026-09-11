import { Link } from "@/i18n/navigation";
import V2Nav from "@/app/components/v2/Nav/V2Nav";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import V2Scrollbar from "@/app/components/v2/Scrollbar/V2Scrollbar";
import V2Footer from "@/app/components/v2/Footer/V2Footer";

/**
 * Privacy policy, code of conduct and ticket terms. A route group, so the
 * URLs stay flat (/privacy-policy, not /policy/privacy-policy) — the 2026 site
 * used those paths and Auth0's consent text links to them.
 *
 * Same shell as /speakers and /sponsors, and deliberately without
 * `V2Scene screens`: these pages are far shorter than the painting and must
 * not be stretched to fill it.
 */
export default function PolicyLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="v2">
			<V2Nav />
			<V2Scrollbar />

			<V2Scene>
				<div className="v2-policy">
					{children}

					<nav className="v2-policy__nav" aria-label="Policies">
						<Link href="/">Home</Link>
						<Link href="/privacy-policy">Privacy policy</Link>
						<Link href="/code-of-conduct">Code of conduct</Link>
						<Link href="/ticket-terms">Ticket terms</Link>
					</nav>
				</div>
			</V2Scene>

			<V2Footer />
		</div>
	);
}
