import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { getPathname, Link } from "@/i18n/navigation";
import V2Scene from "@/app/components/v2/Scene/V2Scene";
import TicketAssignmentTool from "./TicketAssignmentTool";

export const metadata: Metadata = {
  title: "Assign group tickets",
  robots: { index: false, follow: false },
};

export default async function TicketAssignmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("V2.ticketAssignments");
  const session = await auth0.getSession();
  const user = session?.user;
  const admin = user?.["cusec/roles"]?.includes("Admin") ?? false;
  // Links tickets to accounts, so Admin only (the API re-checks).
  if (user && !admin) notFound();

  return (
    <main className="v2 v2-admin v2-campaign">
      <V2Scene>
        <div className="v2-admin__wrap v2-campaign__wrap">
          <Link className="v2-meet__brand v2-pixel" href="/">CUSEC <span>2027</span></Link>
          <section className="v2-glass v2-admin__panel">
            {user && <Link className="v2-admin__back" href="/admin">{t("back")}</Link>}
            <p className="v2-meet__eyebrow">{t("eyebrow")}</p>
            <h1 className="v2-pixel v2-admin__title">{t("title")}</h1>
            <p className="v2-admin__intro">{t("intro")}</p>
            {!user ? (
              <a className="v2-btn v2-btn--primary" href={`/auth/login?returnTo=${encodeURIComponent(getPathname({ locale, href: "/admin/ticket-assignments" }))}`}>{t("sign-in")}</a>
            ) : (
              <TicketAssignmentTool />
            )}
          </section>
        </div>
      </V2Scene>
    </main>
  );
}
