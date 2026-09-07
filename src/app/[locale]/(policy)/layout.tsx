import { Link } from "@/i18n/navigation";

/**
 * Privacy policy, code of conduct and ticket terms. A route group, so the
 * URLs stay flat (/privacy-policy, not /policy/privacy-policy) — the 2026
 * site used those paths and Auth0's consent text links to them.
 *
 * Same shell as the scavenger hunt and the ticket wizard, minus the dock.
 */
export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="v2 v2-aero">
      <div className="v2-scene aero-scene">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="v2-scene__backdrop"
          src="/assets/v2/background-unified.webp"
          alt=""
          width={2560}
          height={12360}
          aria-hidden="true"
        />

        <div className="v2-policy">
          {children}

          <nav className="v2-policy__nav" aria-label="Policies">
            <Link href="/">Home</Link>
            <Link href="/privacy-policy">Privacy policy</Link>
            <Link href="/code-of-conduct">Code of conduct</Link>
            <Link href="/ticket-terms">Ticket terms</Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
