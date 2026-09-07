import { auth0 } from "@/lib/auth0";

/**
 * The ticket wizard sits on the same painting as /scavenger, so a delegate
 * moves from buying a ticket into the hunt without the ground changing under
 * them. Same shell as src/app/[locale]/scavenger/layout.tsx, minus the dock:
 * nobody has a dashboard to navigate to until the purchase is done.
 *
 * This is also the flag gate for every step. One check here rather than four
 * in the pages below it — /tickets, and the demographics, avatar and purchase
 * steps — because a gate that only covers some of them is not a gate.
 * Admins and volunteers always get through, so the flow can be rehearsed
 * against production before tickets open.
 */
export default async function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();
  const roles = session?.user?.["cusec/roles"] as string[] | undefined;
  const canPreview = !!roles?.includes("Admin") || !!roles?.includes("Volunteer");
  const open = process.env.TICKETS_ENABLED === "true" || canPreview;

  return (
    <div className="v2 v2-aero">
      <link
        rel="preload"
        as="image"
        href="/assets/v2/background-unified.webp"
        type="image/webp"
        fetchPriority="high"
      />

      <div className="v2-scene aero-scene">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="v2-scene__backdrop"
          src="/assets/v2/background-unified.webp"
          alt=""
          width={2560}
          height={12360}
          fetchPriority="high"
          aria-hidden="true"
        />

        {open ? (
          children
        ) : (
          <div className="tickets-wrapper">
            <div className="tickets-header">
              <h1 className="tickets-heading">Tickets open soon</h1>
              <p className="tickets-subheading">
                CUSEC 2027 is in Montréal this January. Ticket sales
                aren&rsquo;t open yet — watch the home page for the date.
              </p>
            </div>
            <div className="wizard-intro-card">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="cta-btn wizard-intro-cta">
                Back to the home page
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
