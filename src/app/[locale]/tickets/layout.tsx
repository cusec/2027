/**
 * The ticket wizard sits on the same painting as /scavenger, so a delegate
 * moves from buying a ticket into the hunt without the ground changing under
 * them. Same shell as src/app/[locale]/scavenger/layout.tsx, minus the dock:
 * nobody has a dashboard to navigate to until the purchase is done.
 */
export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

        {children}
      </div>
    </div>
  );
}
